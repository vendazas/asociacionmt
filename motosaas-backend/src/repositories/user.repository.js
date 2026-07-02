const { prisma } = require("../config/db");

function findActiveByEmail(associationId, email) {
  return prisma.user.findFirst({
    where: {
      association_id: associationId,
      email,
      status: "ACTIVE"
    }
  });
}

function findActiveByEmailOrUsername(associationId, identifier) {
  return prisma.user.findFirst({
    where: {
      association_id: associationId,
      status: "ACTIVE",
      OR: [
        { email: identifier },
        { username: identifier }
      ]
    }
  });
}

function findActiveById(associationId, id) {
  return prisma.user.findFirst({
    where: {
      association_id: associationId,
      id,
      status: "ACTIVE"
    },
      select: {
        id: true,
        association_id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        document_number: true,
        full_name: true,
        phone: true,
        role: true,
        password_is_temporary: true,
        status: true
      }
  });
}

function createUser(data) {
  return prisma.user.create({ data });
}

function updateLastLogin(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      last_login_at: new Date(),
      updated_by: userId
    }
  });
}

module.exports = {
  createUser,
  findActiveByEmailOrUsername,
  findActiveByEmail,
  findActiveById,
  updateLastLogin
};
