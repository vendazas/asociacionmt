const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { VehicleStatuses } = require("../constants/statuses");
const { ApiError } = require("../utils/apiError");
const { serializeVehicle } = require("../utils/serializers");
const associationPolicy = require("./associationPolicy.service");

function normalizeVehicleStatus(status) {
  const normalized = String(status || VehicleStatuses.ACTIVE).trim().toUpperCase();

  if (!Object.values(VehicleStatuses).includes(normalized)) {
    throw new ApiError(400, "Invalid vehicle status.");
  }

  return normalized;
}

function normalizeVehiclePayload(payload, { partial = false } = {}) {
  const data = {};

  if (!partial || payload.plate !== undefined) {
    data.plate = String(payload.plate || "").trim().toUpperCase();
  }

  if (!partial || payload.internalNumber !== undefined || payload.internal_number !== undefined) {
    const internalNumber = payload.internalNumber ?? payload.internal_number;
    data.internal_number = internalNumber ? String(internalNumber).trim().toUpperCase() : null;
  }

  if (!partial || payload.brand !== undefined) {
    data.brand = payload.brand ? String(payload.brand).trim() : null;
  }

  if (!partial || payload.model !== undefined) {
    data.model = payload.model ? String(payload.model).trim() : null;
  }

  if (!partial || payload.color !== undefined) {
    data.color = payload.color ? String(payload.color).trim() : null;
  }

  if (!partial || payload.year !== undefined) {
    data.year = payload.year ? Number(payload.year) : null;

    if (data.year !== null && (!Number.isInteger(data.year) || data.year < 1900)) {
      throw new ApiError(400, "year must be a valid integer.");
    }
  }

  if (!partial || payload.status !== undefined) {
    data.status = normalizeVehicleStatus(payload.status);
  }

  if (!partial && !data.plate) {
    throw new ApiError(400, "plate is required.");
  }

  return data;
}

async function assertUniqueVehicleFields(associationId, data, excludeVehicleId = null) {
  const OR = [];

  if (data.plate) {
    OR.push({ plate: data.plate });
  }

  if (data.internal_number) {
    OR.push({ internal_number: data.internal_number });
  }

  if (!OR.length) {
    return;
  }

  const existingVehicle = await prisma.vehicle.findFirst({
    where: {
      association_id: associationId,
      OR,
      ...(excludeVehicleId ? { id: { not: excludeVehicleId } } : {})
    }
  });

  if (!existingVehicle) {
    return;
  }

  if (data.plate && existingVehicle.plate === data.plate) {
    throw new ApiError(409, "Plate is already registered in this association.");
  }

  throw new ApiError(409, "Internal number is already registered in this association.");
}

async function findVehicleOrThrow(associationId, vehicleId) {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      association_id: associationId,
      status: { not: "DELETED" }
    },
    include: { driver: true }
  });

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found.");
  }

  return vehicle;
}

async function findDriverForAssignment(associationId, driverUserId) {
  if (!driverUserId) {
    return null;
  }

  const driver = await prisma.user.findFirst({
    where: {
      id: driverUserId,
      association_id: associationId,
      role: Roles.DRIVER,
      status: { not: "DELETED" }
    }
  });

  if (!driver) {
    throw new ApiError(404, "Driver not found.");
  }

  return driver;
}

async function assertDriverHasNoOtherActiveVehicle(associationId, driverUserId, vehicleId = null) {
  if (!driverUserId) {
    return;
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      association_id: associationId,
      driver_user_id: driverUserId,
      status: VehicleStatuses.ACTIVE,
      ...(vehicleId ? { id: { not: vehicleId } } : {})
    }
  });

  if (vehicle) {
    throw new ApiError(409, "Driver already has an active vehicle assigned.");
  }
}

async function unassignOtherVehicles(tx, associationId, driverUserId, vehicleId, actorId) {
  if (!driverUserId) {
    return;
  }

  await tx.vehicle.updateMany({
    where: {
      association_id: associationId,
      driver_user_id: driverUserId,
      id: { not: vehicleId },
      status: { not: "DELETED" }
    },
    data: {
      driver_user_id: null,
      updated_by: actorId
    }
  });
}

async function listMyVehicles(user) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can manage vehicles.");
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      association_id: user.association_id,
      driver_user_id: user.id,
      status: "ACTIVE"
    },
    orderBy: {
      created_at: "desc"
    },
    include: { driver: true }
  });

  return vehicles.map(serializeVehicle);
}

async function listVehicles(user, query = {}) {
  const search = String(query.search || "").trim();
  const status = query.status ? normalizeVehicleStatus(query.status) : null;
  const where = {
    association_id: user.association_id,
    status: status || { not: "DELETED" }
  };

  if (query.driverUserId) {
    where.driver_user_id = query.driverUserId;
  }

  if (search) {
    where.OR = [
      { plate: { contains: search, mode: "insensitive" } },
      { internal_number: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { color: { contains: search, mode: "insensitive" } }
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      driver: true
    },
    orderBy: { created_at: "desc" },
    take: Math.min(Number(query.limit || 50), 100)
  });

  return vehicles.map(serializeVehicle);
}

async function createVehicle(user, payload) {
  const data = normalizeVehiclePayload(payload);
  await assertUniqueVehicleFields(user.association_id, data);

  const driver = await findDriverForAssignment(user.association_id, payload.driverUserId || payload.driver_user_id);

  await associationPolicy.assertCanRegisterVehicle(user.association_id);

  const vehicle = await prisma.$transaction(async (tx) => {
    const createdVehicle = await tx.vehicle.create({
      data: {
        association_id: user.association_id,
        driver_user_id: driver?.id || null,
        ...data,
        created_by: user.id,
        updated_by: user.id
      }
    });

    await unassignOtherVehicles(tx, user.association_id, driver?.id, createdVehicle.id, user.id);

    return tx.vehicle.findUnique({
      where: { id: createdVehicle.id },
      include: { driver: true }
    });
  });

  return serializeVehicle(vehicle);
}

async function upsertMyVehicle(user, payload) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can manage vehicles.");
  }

  if (!payload.plate) {
    throw new ApiError(400, "plate is required.");
  }

  const plate = String(payload.plate).trim().toUpperCase();
  const existingVehicle = await prisma.vehicle.findUnique({
    where: {
      association_id_plate: {
        association_id: user.association_id,
        plate
      }
    }
  });

  if (!existingVehicle) {
    await associationPolicy.assertCanRegisterVehicle(user.association_id);
  } else if (existingVehicle.driver_user_id && existingVehicle.driver_user_id !== user.id) {
    throw new ApiError(409, "Vehicle is assigned to another driver.");
  }

  const vehicle = await prisma.vehicle.upsert({
    where: {
      association_id_plate: {
        association_id: user.association_id,
        plate
      }
    },
    update: {
      brand: payload.brand || null,
      model: payload.model || null,
      color: payload.color || null,
      year: payload.year ? Number(payload.year) : null,
      updated_by: user.id
    },
    create: {
      association_id: user.association_id,
      driver_user_id: user.id,
      plate,
      brand: payload.brand || null,
      model: payload.model || null,
      color: payload.color || null,
      year: payload.year ? Number(payload.year) : null,
      created_by: user.id,
      updated_by: user.id
    },
    include: { driver: true }
  });

  return serializeVehicle(vehicle);
}

async function getVehicle(user, vehicleId) {
  return serializeVehicle(await findVehicleOrThrow(user.association_id, vehicleId));
}

async function updateVehicle(user, vehicleId, payload) {
  const currentVehicle = await findVehicleOrThrow(user.association_id, vehicleId);
  const data = normalizeVehiclePayload(payload, { partial: true });
  await assertUniqueVehicleFields(user.association_id, data, vehicleId);

  const driverId =
    payload.driverUserId !== undefined || payload.driver_user_id !== undefined
      ? payload.driverUserId || payload.driver_user_id || null
      : currentVehicle.driver_user_id;
  const driver = await findDriverForAssignment(user.association_id, driverId);

  const vehicle = await prisma.$transaction(async (tx) => {
    await unassignOtherVehicles(tx, user.association_id, driver?.id, currentVehicle.id, user.id);

    return tx.vehicle.update({
      where: { id: currentVehicle.id },
      data: {
        ...data,
        driver_user_id: driver?.id || null,
        updated_by: user.id
      },
      include: { driver: true }
    });
  });

  return serializeVehicle(vehicle);
}

async function updateVehicleStatus(user, vehicleId, status) {
  const currentVehicle = await findVehicleOrThrow(user.association_id, vehicleId);
  const normalizedStatus = normalizeVehicleStatus(status);

  const vehicle = await prisma.$transaction(async (tx) => {
    if (normalizedStatus === VehicleStatuses.ACTIVE) {
      await unassignOtherVehicles(tx, user.association_id, currentVehicle.driver_user_id, currentVehicle.id, user.id);
    }

    return tx.vehicle.update({
      where: { id: currentVehicle.id },
      data: {
        status: normalizedStatus,
        updated_by: user.id
      },
      include: { driver: true }
    });
  });

  return serializeVehicle(vehicle);
}

async function assignVehicle(user, vehicleId, driverUserId) {
  const currentVehicle = await findVehicleOrThrow(user.association_id, vehicleId);
  const driver = await findDriverForAssignment(user.association_id, driverUserId || null);

  const vehicle = await prisma.$transaction(async (tx) => {
    await unassignOtherVehicles(tx, user.association_id, driver?.id, currentVehicle.id, user.id);

    return tx.vehicle.update({
      where: { id: currentVehicle.id },
      data: {
        driver_user_id: driver?.id || null,
        updated_by: user.id
      },
      include: { driver: true }
    });
  });

  return serializeVehicle(vehicle);
}

module.exports = {
  assignVehicle,
  createVehicle,
  getVehicle,
  updateVehicle,
  updateVehicleStatus,
  listVehicles,
  listMyVehicles,
  upsertMyVehicle
};
