const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { ApiError } = require("../utils/apiError");
const { haversineKm, toNumber } = require("../utils/geo");
const { serializeDriver } = require("../utils/serializers");

async function updateLocation(user, payload) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can update driver location.");
  }

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new ApiError(400, "latitude and longitude must be valid numbers.");
  }

  const availabilityStatus = payload.availabilityStatus || "AVAILABLE";

  const driverProfile = await prisma.driverProfile.upsert({
    where: { user_id: user.id },
    update: {
      current_latitude: latitude,
      current_longitude: longitude,
      availability_status: availabilityStatus,
      last_location_at: new Date(),
      updated_by: user.id
    },
    create: {
      association_id: user.association_id,
      user_id: user.id,
      current_latitude: latitude,
      current_longitude: longitude,
      availability_status: availabilityStatus,
      last_location_at: new Date(),
      created_by: user.id,
      updated_by: user.id
    },
    include: {
      user: {
        include: {
          vehicles: {
            where: { status: "ACTIVE" }
          }
        }
      }
    }
  });

  return serializeDriver(driverProfile);
}

async function listAvailableDrivers(associationId, query = {}) {
  const drivers = await prisma.driverProfile.findMany({
    where: {
      association_id: associationId,
      availability_status: "AVAILABLE",
      status: "ACTIVE",
      current_latitude: { not: null },
      current_longitude: { not: null },
      user: {
        role: Roles.DRIVER,
        status: "ACTIVE"
      }
    },
    include: {
      user: {
        include: {
          vehicles: {
            where: { status: "ACTIVE" }
          }
        }
      }
    },
    orderBy: {
      last_location_at: "desc"
    }
  });

  const latitude = query.latitude ? Number(query.latitude) : null;
  const longitude = query.longitude ? Number(query.longitude) : null;
  const radiusKm = query.radiusKm ? Number(query.radiusKm) : null;

  const filteredDrivers = drivers
    .map((driver) => {
      const distanceKm =
        latitude !== null && longitude !== null
          ? haversineKm(
              { latitude, longitude },
              {
                latitude: toNumber(driver.current_latitude),
                longitude: toNumber(driver.current_longitude)
              }
            )
          : null;

      return {
        ...serializeDriver(driver),
        distance_km: distanceKm
      };
    })
    .filter((driver) => {
      if (!radiusKm || driver.distance_km === null) {
        return true;
      }

      return driver.distance_km <= radiusKm;
    });

  return filteredDrivers;
}

async function listDrivers(associationId, query = {}) {
  const search = String(query.search || "").trim();
  const where = {
    association_id: associationId,
    role: Roles.DRIVER
  };

  if (query.status) {
    where.status = query.status;
  }

  if (search) {
    where.OR = [
      { full_name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } }
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      driver_profile: true,
      vehicles: {
        where: { status: "ACTIVE" }
      }
    },
    orderBy: { created_at: "desc" },
    take: Math.min(Number(query.limit || 50), 100)
  });

  return users.map((user) => ({
    id: user.id,
    association_id: user.association_id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    driver_profile: user.driver_profile,
    vehicles: user.vehicles
  }));
}

module.exports = {
  listDrivers,
  listAvailableDrivers,
  updateLocation
};
