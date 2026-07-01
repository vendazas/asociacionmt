const { prisma } = require("../config/db");

async function listZones(associationId) {
  return prisma.coverageZone.findMany({
    where: {
      association_id: associationId,
      status: "ACTIVE"
    },
    orderBy: {
      name: "asc"
    }
  });
}

async function createZone(user, payload) {
  return prisma.coverageZone.create({
    data: {
      association_id: user.association_id,
      name: payload.name,
      description: payload.description || null,
      center_latitude: payload.centerLatitude ? Number(payload.centerLatitude) : null,
      center_longitude: payload.centerLongitude ? Number(payload.centerLongitude) : null,
      radius_km: payload.radiusKm ? Number(payload.radiusKm) : null,
      polygon: payload.polygon || null,
      created_by: user.id,
      updated_by: user.id
    }
  });
}

module.exports = {
  createZone,
  listZones
};
