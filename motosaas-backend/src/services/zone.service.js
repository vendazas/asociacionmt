const { prisma } = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { serializeZone } = require("../utils/serializers");

const zoneStatuses = ["ACTIVE", "INACTIVE"];

function valueFrom(payload, camelKey, snakeKey) {
  return payload[camelKey] !== undefined ? payload[camelKey] : payload[snakeKey];
}

function normalizeZoneStatus(status) {
  const normalized = String(status || "ACTIVE").trim().toUpperCase();

  if (!zoneStatuses.includes(normalized)) {
    throw new ApiError(400, "Invalid zone status.");
  }

  return normalized;
}

function numberField(payload, camelKey, snakeKey, { partial = false, min = null, max = null } = {}) {
  const rawValue = valueFrom(payload, camelKey, snakeKey);

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    if (partial) {
      return undefined;
    }

    throw new ApiError(400, `${camelKey} is required.`);
  }

  const value = Number(rawValue);
  if (Number.isNaN(value) || (min !== null && value < min) || (max !== null && value > max)) {
    throw new ApiError(400, `${camelKey} must be a valid number.`);
  }

  return value;
}

function normalizeZonePayload(payload, { partial = false } = {}) {
  const data = {};

  if (!partial || payload.name !== undefined) {
    data.name = String(payload.name || "").trim();
    if (!data.name) {
      throw new ApiError(400, "name is required.");
    }
  }

  if (!partial || payload.city !== undefined) {
    data.city = String(payload.city || "").trim();
    if (!data.city) {
      throw new ApiError(400, "city is required.");
    }
  }

  if (!partial || payload.description !== undefined) {
    data.description = payload.description ? String(payload.description).trim() : null;
  }

  const latitude = numberField(payload, "centerLatitude", "center_latitude", { partial, min: -90, max: 90 });
  const longitude = numberField(payload, "centerLongitude", "center_longitude", { partial, min: -180, max: 180 });
  const radiusKm = numberField(payload, "radiusKm", "radius_km", { partial, min: 0.1 });

  if (latitude !== undefined) {
    data.center_latitude = latitude;
  }

  if (longitude !== undefined) {
    data.center_longitude = longitude;
  }

  if (radiusKm !== undefined) {
    data.radius_km = radiusKm;
  }

  if (!partial || payload.polygon !== undefined) {
    data.polygon = payload.polygon || null;
  }

  if (!partial || payload.status !== undefined) {
    data.status = normalizeZoneStatus(payload.status);
  }

  return data;
}

async function listZones(associationId, query = {}) {
  const search = String(query.search || "").trim();
  const where = {
    association_id: associationId,
    status: query.status ? normalizeZoneStatus(query.status) : { not: "DELETED" }
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];
  }

  const zones = await prisma.coverageZone.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { name: "asc" }
    ],
    take: Math.min(Number(query.limit || 100), 100)
  });

  return zones.map(serializeZone);
}

async function findZoneOrThrow(associationId, zoneId) {
  const zone = await prisma.coverageZone.findFirst({
    where: {
      id: zoneId,
      association_id: associationId,
      status: { not: "DELETED" }
    }
  });

  if (!zone) {
    throw new ApiError(404, "Zone not found.");
  }

  return zone;
}

async function getZone(user, zoneId) {
  return serializeZone(await findZoneOrThrow(user.association_id, zoneId));
}

async function createZone(user, payload) {
  const data = normalizeZonePayload(payload);
  const zone = await prisma.coverageZone.create({
    data: {
      ...data,
      association_id: user.association_id,
      created_by: user.id,
      updated_by: user.id
    }
  });

  return serializeZone(zone);
}

async function updateZone(user, zoneId, payload) {
  await findZoneOrThrow(user.association_id, zoneId);
  const data = normalizeZonePayload(payload, { partial: true });

  const zone = await prisma.coverageZone.update({
    where: { id: zoneId },
    data: {
      ...data,
      updated_by: user.id
    }
  });

  return serializeZone(zone);
}

async function updateZoneStatus(user, zoneId, status) {
  await findZoneOrThrow(user.association_id, zoneId);
  const zone = await prisma.coverageZone.update({
    where: { id: zoneId },
    data: {
      status: normalizeZoneStatus(status),
      updated_by: user.id
    }
  });

  return serializeZone(zone);
}

async function deleteZone(user, zoneId) {
  await findZoneOrThrow(user.association_id, zoneId);
  const zone = await prisma.coverageZone.update({
    where: { id: zoneId },
    data: {
      status: "DELETED",
      updated_by: user.id
    }
  });

  return serializeZone(zone);
}

module.exports = {
  createZone,
  deleteZone,
  getZone,
  listZones,
  updateZone,
  updateZoneStatus
};
