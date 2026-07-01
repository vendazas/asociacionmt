const { prisma } = require("../config/db");

function findActiveBySlug(slug) {
  return prisma.association.findFirst({
    where: {
      slug,
      status: "ACTIVE"
    }
  });
}

function findActiveByAssociationId(associationId) {
  return prisma.association.findFirst({
    where: {
      association_id: associationId,
      status: "ACTIVE"
    }
  });
}

function createAssociation(data) {
  return prisma.association.create({ data });
}

module.exports = {
  createAssociation,
  findActiveByAssociationId,
  findActiveBySlug
};
