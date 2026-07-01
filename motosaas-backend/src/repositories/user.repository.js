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
        full_name: true,
        phone: true,
        role: true,
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
  findActiveByEmail,
  findActiveById,
  updateLastLogin
};
