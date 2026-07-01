const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { ApiError } = require("../utils/apiError");

async function listMyVehicles(user) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can manage vehicles.");
  }

  return prisma.vehicle.findMany({
    where: {
      association_id: user.association_id,
      driver_user_id: user.id,
      status: "ACTIVE"
    },
    orderBy: {
      created_at: "desc"
    }
  });
}

async function listVehicles(user, query = {}) {
  const search = String(query.search || "").trim();
  const where = {
    association_id: user.association_id
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.driverUserId) {
    where.driver_user_id = query.driverUserId;
  }

  if (search) {
    where.OR = [
      { plate: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { color: { contains: search, mode: "insensitive" } }
    ];
  }

  return prisma.vehicle.findMany({
    where,
    include: {
      driver: {
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: { created_at: "desc" },
    take: Math.min(Number(query.limit || 50), 100)
  });
}

async function createVehicle(user, payload) {
  if (!payload.driverUserId || !payload.plate) {
    throw new ApiError(400, "driverUserId and plate are required.");
  }

  const driver = await prisma.user.findFirst({
    where: {
      id: payload.driverUserId,
      association_id: user.association_id,
      role: Roles.DRIVER,
      status: "ACTIVE"
    }
  });

  if (!driver) {
    throw new ApiError(404, "Driver not found.");
  }

  return prisma.vehicle.create({
    data: {
      association_id: user.association_id,
      driver_user_id: driver.id,
      plate: String(payload.plate).trim().toUpperCase(),
      brand: payload.brand || null,
      model: payload.model || null,
      color: payload.color || null,
      year: payload.year ? Number(payload.year) : null,
      created_by: user.id,
      updated_by: user.id
    }
  });
}

async function upsertMyVehicle(user, payload) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can manage vehicles.");
  }

  if (!payload.plate) {
    throw new ApiError(400, "plate is required.");
  }

  return prisma.vehicle.upsert({
    where: {
      association_id_plate: {
        association_id: user.association_id,
        plate: String(payload.plate).trim().toUpperCase()
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
      plate: String(payload.plate).trim().toUpperCase(),
      brand: payload.brand || null,
      model: payload.model || null,
      color: payload.color || null,
      year: payload.year ? Number(payload.year) : null,
      created_by: user.id,
      updated_by: user.id
    }
  });
}

module.exports = {
  createVehicle,
  listVehicles,
  listMyVehicles,
  upsertMyVehicle
};
