const associationRepository = require("../repositories/association.repository");
const { prisma } = require("../config/db");
const { serializeAssociation } = require("../utils/serializers");

async function getCurrentAssociation(associationId) {
  const association = await associationRepository.findActiveByAssociationId(associationId);
  return serializeAssociation(association);
}

async function listAssociations(query = {}) {
  const limit = Math.min(Number(query.limit || 20), 100);
  const offset = Number(query.offset || 0);
  const search = String(query.search || "").trim();
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } }
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

  return {
    items: items.map(serializeAssociation),
    pagination: { limit, offset, total }
  };
}

async function createAssociation(user, payload) {
  const slug = String(payload.slug || "").trim().toLowerCase();

  const association = await prisma.$transaction(async (tx) => {
    const createdAssociation = await tx.association.create({
      data: {
        name: payload.name,
        slug,
        city: payload.city,
        country: payload.country || "BO",
        timezone: payload.timezone || "America/La_Paz",
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
        created_by: user.id,
        updated_by: user.id
      }
    });

    return createdAssociation;
  });

  return serializeAssociation(association);
}

async function updateAssociationStatus(user, associationId, status) {
  const association = await prisma.association.update({
    where: { association_id: associationId },
    data: {
      status,
      updated_by: user.id
    }
  });

  return serializeAssociation(association);
}

module.exports = {
  createAssociation,
  getCurrentAssociation,
  listAssociations,
  updateAssociationStatus
};
