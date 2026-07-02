const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { ApiError } = require("../utils/apiError");
const { hashPassword } = require("../utils/password");
const { serializeUser } = require("../utils/serializers");
const associationPolicy = require("./associationPolicy.service");

async function listUsers(user, query = {}) {
  const where = {
    association_id: user.association_id,
    status: query.status || "ACTIVE"
  };

  if (query.role) {
    where.role = query.role;
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: Math.min(Number(query.limit || 50), 100)
  });

  return users.map(serializeUser);
}

async function createUser(user, payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  const fullName = String(payload.fullName || payload.full_name || "").trim();
  const role = payload.role || Roles.CUSTOMER;

  if (!email || !fullName || !payload.password || !role) {
    throw new ApiError(400, "email, fullName, password and role are required.");
  }

  if (role === Roles.SUPER_ADMIN && user.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(403, "Only SUPER_ADMIN can create SUPER_ADMIN users.");
  }

  if (![Roles.SUPER_ADMIN, Roles.ASSOCIATION_ADMIN, Roles.DRIVER, Roles.CUSTOMER].includes(role)) {
    throw new ApiError(400, "Invalid role.");
  }

  if (role === Roles.DRIVER) {
    await associationPolicy.assertCanRegisterDriver(user.association_id);
  }

  const passwordHash = await hashPassword(payload.password);

  const createdUser = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        association_id: user.association_id,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone: payload.phone || null,
        role,
        created_by: user.id,
        updated_by: user.id
      }
    });

    if (role === Roles.DRIVER) {
      await tx.driverProfile.create({
        data: {
          association_id: user.association_id,
          user_id: newUser.id,
          license_number: payload.licenseNumber || null,
          availability_status: "OFFLINE",
          created_by: user.id,
          updated_by: user.id
        }
      });
    }

    return newUser;
  });

  return serializeUser(createdUser);
}

async function getProfile(user) {
  return serializeUser(user);
}

module.exports = {
  createUser,
  getProfile,
  listUsers
};
