const associationRepository = require("../repositories/association.repository");
const { prisma } = require("../config/db");
const { AssociationStatuses } = require("../constants/statuses");
const { ApiError } = require("../utils/apiError");
const { serializeAssociation } = require("../utils/serializers");

const statusAliases = {
  ACTIVA: AssociationStatuses.ACTIVE,
  ACTIVE: AssociationStatuses.ACTIVE,
  LIMITADA: AssociationStatuses.LIMITED,
  LIMITED: AssociationStatuses.LIMITED,
  SUSPENDIDA: AssociationStatuses.SUSPENDED,
  SUSPENDED: AssociationStatuses.SUSPENDED
};

function normalizeStatus(status) {
  const normalized = statusAliases[String(status || "").trim().toUpperCase()];

  if (!normalized) {
    throw new ApiError(400, "Invalid association status.");
  }

  return normalized;
}

function optionalText(value) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || null;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new ApiError(400, "Limits must be non-negative integers.");
  }

  return number;
}

function associationData(payload, { partial = false } = {}) {
  const data = {};

  if (!partial || payload.name !== undefined) {
    data.name = String(payload.name || "").trim();
  }

  if (!partial || payload.slug !== undefined) {
    data.slug = String(payload.slug || "").trim().toLowerCase();
  }

  if (!partial || payload.city !== undefined) {
    data.city = String(payload.city || "").trim();
  }

  if (!partial || payload.country !== undefined) {
    data.country = String(payload.country || "BO").trim().toUpperCase();
  }

  if (!partial || payload.timezone !== undefined) {
    data.timezone = String(payload.timezone || "America/La_Paz").trim();
  }

  if (!partial || payload.representativeName !== undefined || payload.representative_name !== undefined) {
    data.representative_name = optionalText(payload.representativeName ?? payload.representative_name);
  }

  if (!partial || payload.phone !== undefined) {
    data.phone = optionalText(payload.phone);
  }

  if (!partial || payload.email !== undefined) {
    data.email = optionalText(payload.email)?.toLowerCase() || null;
  }

  if (!partial || payload.address !== undefined) {
    data.address = optionalText(payload.address);
  }

  if (!partial || payload.driverLimit !== undefined || payload.driver_limit !== undefined) {
    data.driver_limit = optionalNumber(payload.driverLimit ?? payload.driver_limit);
  }

  if (!partial || payload.vehicleLimit !== undefined || payload.vehicle_limit !== undefined) {
    data.vehicle_limit = optionalNumber(payload.vehicleLimit ?? payload.vehicle_limit);
  }

  if (!partial || payload.observation !== undefined) {
    data.observation = optionalText(payload.observation);
  }

  if (payload.status !== undefined) {
    data.status = normalizeStatus(payload.status);
  }

  if (!partial && (!data.name || !data.slug || !data.city)) {
    throw new ApiError(400, "name, slug and city are required.");
  }

  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    throw new ApiError(400, "slug must contain only lowercase letters, numbers and hyphens.");
  }

  return data;
}

async function addCounts(association) {
  if (!association) {
    return null;
  }

  const [drivers, vehicles, trips] = await prisma.$transaction([
    prisma.user.count({
      where: {
        association_id: association.association_id,
        role: "DRIVER",
        status: { not: "DELETED" }
      }
    }),
    prisma.vehicle.count({
      where: {
        association_id: association.association_id,
        status: { not: "DELETED" }
      }
    }),
    prisma.trip.count({
      where: {
        association_id: association.association_id
      }
    })
  ]);

  return {
    ...association,
    counts: {
      drivers,
      vehicles,
      trips
    }
  };
}

async function getCurrentAssociation(associationId) {
  const association = await associationRepository.findActiveByAssociationId(associationId);
  return serializeAssociation(await addCounts(association));
}

async function listAssociations(query = {}) {
  const limit = Math.min(Number(query.limit || 20), 100);
  const offset = Number(query.offset || 0);
  const search = String(query.search || "").trim();
  const where = {};

  if (query.status) {
    where.status = normalizeStatus(query.status);
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { representative_name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } }
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.association.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.association.count({ where })
  ]);

  const itemsWithCounts = await Promise.all(items.map(addCounts));

  return {
    items: itemsWithCounts.map(serializeAssociation),
    pagination: { limit, offset, total }
  };
}

async function getAssociationDetail(associationId) {
  const association = await associationRepository.findByAssociationId(associationId);
  if (!association) {
    throw new ApiError(404, "Association not found.");
  }

  return serializeAssociation(await addCounts(association));
}

async function createAssociation(user, payload) {
  const data = associationData(payload);

  const association = await prisma.$transaction(async (tx) => {
    const createdAssociation = await tx.association.create({
      data: {
        ...data,
        created_by: user.id,
        updated_by: user.id
      }
    });

    await tx.fareConfig.create({
      data: {
        association_id: createdAssociation.association_id,
        name: "Tarifa principal",
        base_fare: Number(payload.baseFare || 5),
        minimum_fare: Number(payload.minimumFare || 8),
        per_kilometer_fare: Number(payload.perKilometerFare || 2.5),
        night_surcharge: Number(payload.nightSurcharge || 3),
        waiting_per_minute_fare: Number(payload.waitingPerMinuteFare || 0.5),
        association_commission_percent: Number(payload.associationCommissionPercent || 8),
        platform_commission_percent: Number(payload.platformCommissionPercent || 5),
        max_driver_search_radius_km: Number(payload.maxDriverSearchRadiusKm || 5),
        created_by: user.id,
        updated_by: user.id
      }
    });

    return createdAssociation;
  });

  return serializeAssociation(await addCounts(association));
}

async function updateAssociation(user, associationId, payload) {
  const currentAssociation = await associationRepository.findByAssociationId(associationId);
  if (!currentAssociation) {
    throw new ApiError(404, "Association not found.");
  }

  const data = associationData(payload, { partial: true });

  const association = await prisma.association.update({
    where: { association_id: associationId },
    data: {
      ...data,
      updated_by: user.id
    }
  });

  return serializeAssociation(await addCounts(association));
}

async function updateAssociationStatus(user, associationId, status) {
  const normalizedStatus = normalizeStatus(status);

  const association = await prisma.association.update({
    where: { association_id: associationId },
    data: {
      status: normalizedStatus,
      updated_by: user.id
    }
  });

  return serializeAssociation(await addCounts(association));
}

module.exports = {
  createAssociation,
  getAssociationDetail,
  getCurrentAssociation,
  listAssociations,
  updateAssociation,
  updateAssociationStatus
};
