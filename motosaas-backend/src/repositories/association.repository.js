const { prisma } = require("../config/db");
const { operableAssociationStatuses } = require("../constants/statuses");

function findActiveBySlug(slug) {
  return prisma.association.findFirst({
    where: {
      slug,
      status: { in: operableAssociationStatuses }
    }
  });
}

function findActiveByAssociationId(associationId) {
  return prisma.association.findFirst({
    where: {
      association_id: associationId,
      status: { in: operableAssociationStatuses }
    }
  });
}

function createAssociation(data) {
  return prisma.association.create({ data });
}

function findByAssociationId(associationId) {
  return prisma.association.findUnique({
    where: { association_id: associationId }
  });
}

module.exports = {
  createAssociation,
  findByAssociationId,
  findActiveByAssociationId,
  findActiveBySlug
};
