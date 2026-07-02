const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { DriverStatuses, VehicleStatuses } = require("../constants/statuses");
const { ApiError } = require("../utils/apiError");
const { haversineKm, toNumber } = require("../utils/geo");
const { hashPassword } = require("../utils/password");
const { serializeDriver } = require("../utils/serializers");
const associationPolicy = require("./associationPolicy.service");
const fareService = require("./fare.service");

function fullName(firstName, lastName, fallback) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

function serializeDriverUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    association_id: user.association_id,
    email: user.email,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    document_number: user.document_number,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    password_is_temporary: Boolean(user.password_is_temporary),
    driver_profile: user.driver_profile || null,
    vehicles: user.vehicles || []
  };
}

function normalizeDriverStatus(status) {
  const normalized = String(status || DriverStatuses.PENDING).trim().toUpperCase();

  if (!Object.values(DriverStatuses).includes(normalized)) {
    throw new ApiError(400, "Invalid driver status.");
  }

  return normalized;
}

function normalizeDriverPayload(payload, { partial = false } = {}) {
  const firstName = String(payload.firstName || payload.first_name || "").trim();
  const lastName = String(payload.lastName || payload.last_name || "").trim();
  const fallbackName = String(payload.fullName || payload.full_name || "").trim();
  const data = {};

  if (!partial || firstName || payload.firstName !== undefined || payload.first_name !== undefined) {
    data.first_name = firstName || null;
  }

  if (!partial || lastName || payload.lastName !== undefined || payload.last_name !== undefined) {
    data.last_name = lastName || null;
  }

  if (!partial || fallbackName || firstName || lastName) {
    data.full_name = fullName(firstName, lastName, fallbackName);
  }

  if (!partial || payload.email !== undefined) {
    data.email = String(payload.email || "").trim().toLowerCase();
  }

  if (!partial || payload.username !== undefined) {
    data.username = String(payload.username || "").trim().toLowerCase();
  }

  if (data.username && !/^[a-zA-Z0-9._-]+$/.test(data.username)) {
    throw new ApiError(400, "username can only contain letters, numbers, dots, underscores and hyphens.");
  }

  if (!partial || payload.phone !== undefined) {
    data.phone = payload.phone ? String(payload.phone).trim() : null;
  }

  if (!partial || payload.documentNumber !== undefined || payload.document_number !== undefined) {
    const documentNumber = payload.documentNumber ?? payload.document_number;
    data.document_number = documentNumber ? String(documentNumber).trim() : null;
  }

  if (!partial || payload.status !== undefined) {
    data.status = normalizeDriverStatus(payload.status);
  }

  if (!partial && (!data.full_name || !data.email || !data.username || !data.document_number || !payload.password)) {
    throw new ApiError(400, "firstName, lastName, email, username, documentNumber and password are required.");
  }

  return data;
}

async function assertUniqueDriverFields(associationId, data, excludeUserId = null) {
  const OR = [];

  if (data.email) {
    OR.push({ email: data.email });
  }

  if (data.username) {
    OR.push({ username: data.username });
  }

  if (data.document_number) {
    OR.push({ document_number: data.document_number });
  }

  if (!OR.length) {
    return;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      association_id: associationId,
      OR,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {})
    }
  });

  if (!existingUser) {
    return;
  }

  if (data.email && existingUser.email === data.email) {
    throw new ApiError(409, "Email is already registered in this association.");
  }

  if (data.username && existingUser.username === data.username) {
    throw new ApiError(409, "Username is already registered in this association.");
  }

  throw new ApiError(409, "Document number is already registered in this association.");
}

async function findDriverOrThrow(associationId, driverId) {
  const driver = await prisma.user.findFirst({
    where: {
      id: driverId,
      association_id: associationId,
      role: Roles.DRIVER,
      status: { not: "DELETED" }
    },
    include: {
      driver_profile: true,
      vehicles: {
        where: { status: { not: "DELETED" } },
        orderBy: { created_at: "desc" }
      }
    }
  });

  if (!driver) {
    throw new ApiError(404, "Driver not found.");
  }

  return driver;
}

async function assertDriverCanReceiveVehicle(tx, associationId, driverId, vehicleId) {
  const activeVehicle = await tx.vehicle.findFirst({
    where: {
      association_id: associationId,
      driver_user_id: driverId,
      status: VehicleStatuses.ACTIVE,
      id: { not: vehicleId }
    }
  });

  if (activeVehicle) {
    throw new ApiError(409, "Driver already has an active vehicle assigned.");
  }
}

async function assignVehicleToDriver(tx, associationId, driverId, vehicleId, actorId) {
  if (!vehicleId) {
    await tx.vehicle.updateMany({
      where: {
        association_id: associationId,
        driver_user_id: driverId
      },
      data: {
        driver_user_id: null,
        updated_by: actorId
      }
    });
    return;
  }

  const vehicle = await tx.vehicle.findFirst({
    where: {
      id: vehicleId,
      association_id: associationId,
      status: { not: "DELETED" }
    }
  });

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found.");
  }

  await tx.vehicle.updateMany({
    where: {
      association_id: associationId,
      driver_user_id: driverId,
      id: { not: vehicle.id },
      status: { not: "DELETED" }
    },
    data: {
      driver_user_id: null,
      updated_by: actorId
    }
  });

  if (vehicle.status === VehicleStatuses.ACTIVE) {
    await assertDriverCanReceiveVehicle(tx, associationId, driverId, vehicle.id);
  }

  await tx.vehicle.update({
    where: { id: vehicle.id },
    data: {
      driver_user_id: driverId,
      updated_by: actorId
    }
  });
}

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
  let radiusKm = query.radiusKm ? Number(query.radiusKm) : null;

  if (!radiusKm && latitude !== null && longitude !== null) {
    try {
      const fareConfig = await fareService.getActiveFareConfig(associationId);
      radiusKm = toNumber(fareConfig.max_driver_search_radius_km);
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
  }

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
  const status = query.status ? normalizeDriverStatus(query.status) : null;
  const where = {
    association_id: associationId,
    role: Roles.DRIVER,
    status: status || { not: "DELETED" }
  };

  if (search) {
    where.OR = [
      { full_name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { document_number: { contains: search, mode: "insensitive" } }
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      driver_profile: true,
      vehicles: {
        where: { status: { not: "DELETED" } },
        orderBy: { created_at: "desc" }
      }
    },
    orderBy: { created_at: "desc" },
    take: Math.min(Number(query.limit || 50), 100)
  });

  return users.map(serializeDriverUser);
}

async function createDriver(user, payload) {
  await associationPolicy.assertCanRegisterDriver(user.association_id);

  const data = normalizeDriverPayload(payload);
  await assertUniqueDriverFields(user.association_id, data);
  const passwordHash = await hashPassword(payload.password);

  const createdDriver = await prisma.$transaction(async (tx) => {
    const driver = await tx.user.create({
      data: {
        association_id: user.association_id,
        ...data,
        password_hash: passwordHash,
        password_is_temporary: true,
        role: Roles.DRIVER,
        created_by: user.id,
        updated_by: user.id
      }
    });

    await tx.driverProfile.create({
      data: {
        association_id: user.association_id,
        user_id: driver.id,
        license_number: payload.licenseNumber || payload.license_number || null,
        availability_status: "OFFLINE",
        status: data.status,
        created_by: user.id,
        updated_by: user.id
      }
    });

    if (payload.vehicleId) {
      await assignVehicleToDriver(tx, user.association_id, driver.id, payload.vehicleId, user.id);
    }

    return tx.user.findUnique({
      where: { id: driver.id },
      include: {
        driver_profile: true,
        vehicles: { where: { status: { not: "DELETED" } } }
      }
    });
  });

  return serializeDriverUser(createdDriver);
}

async function getDriver(associationId, driverId) {
  return serializeDriverUser(await findDriverOrThrow(associationId, driverId));
}

async function updateDriver(user, driverId, payload) {
  const currentDriver = await findDriverOrThrow(user.association_id, driverId);
  const data = normalizeDriverPayload(payload, { partial: true });
  await assertUniqueDriverFields(user.association_id, data, driverId);

  if (data.first_name !== undefined || data.last_name !== undefined || data.full_name !== undefined) {
    const nextFirstName = data.first_name !== undefined ? data.first_name : currentDriver.first_name;
    const nextLastName = data.last_name !== undefined ? data.last_name : currentDriver.last_name;
    const explicitFullName = String(payload.fullName || payload.full_name || "").trim();
    data.full_name = fullName(nextFirstName, nextLastName, explicitFullName || currentDriver.full_name);
  }

  if (payload.password) {
    data.password_hash = await hashPassword(payload.password);
    data.password_is_temporary = true;
  }

  const updatedDriver = await prisma.$transaction(async (tx) => {
    const driver = await tx.user.update({
      where: { id: driverId },
      data: {
        ...data,
        updated_by: user.id
      }
    });

    const driverProfileData = {
      updated_by: user.id
    };

    if (payload.licenseNumber !== undefined || payload.license_number !== undefined) {
      driverProfileData.license_number = payload.licenseNumber || payload.license_number || null;
    }

    if (data.status) {
      driverProfileData.status = data.status;
      if (data.status !== DriverStatuses.ACTIVE) {
        driverProfileData.availability_status = "OFFLINE";
      }
    }

    await tx.driverProfile.updateMany({
      where: {
        association_id: user.association_id,
        user_id: driver.id
      },
      data: driverProfileData
    });

    if (payload.vehicleId !== undefined) {
      await assignVehicleToDriver(tx, user.association_id, driver.id, payload.vehicleId, user.id);
    }

    return tx.user.findUnique({
      where: { id: driver.id },
      include: {
        driver_profile: true,
        vehicles: { where: { status: { not: "DELETED" } } }
      }
    });
  });

  return serializeDriverUser(updatedDriver);
}

async function updateDriverStatus(user, driverId, status) {
  const normalizedStatus = normalizeDriverStatus(status);
  await findDriverOrThrow(user.association_id, driverId);

  const updatedDriver = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: driverId },
      data: {
        status: normalizedStatus,
        updated_by: user.id
      }
    });

    const driverProfileData = {
      status: normalizedStatus,
      updated_by: user.id
    };

    if (normalizedStatus !== DriverStatuses.ACTIVE) {
      driverProfileData.availability_status = "OFFLINE";
    }

    await tx.driverProfile.updateMany({
      where: {
        association_id: user.association_id,
        user_id: driverId
      },
      data: driverProfileData
    });

    return tx.user.findUnique({
      where: { id: driverId },
      include: {
        driver_profile: true,
        vehicles: { where: { status: { not: "DELETED" } } }
      }
    });
  });

  return serializeDriverUser(updatedDriver);
}

async function assignVehicle(user, driverId, vehicleId) {
  await findDriverOrThrow(user.association_id, driverId);

  const updatedDriver = await prisma.$transaction(async (tx) => {
    await assignVehicleToDriver(tx, user.association_id, driverId, vehicleId, user.id);

    return tx.user.findUnique({
      where: { id: driverId },
      include: {
        driver_profile: true,
        vehicles: { where: { status: { not: "DELETED" } } }
      }
    });
  });

  return serializeDriverUser(updatedDriver);
}

module.exports = {
  assignVehicle,
  createDriver,
  getDriver,
  listDrivers,
  listAvailableDrivers,
  updateDriver,
  updateDriverStatus,
  updateLocation
};
