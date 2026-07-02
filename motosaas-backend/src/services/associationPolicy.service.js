const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { AssociationStatuses } = require("../constants/statuses");
const { ApiError } = require("../utils/apiError");

async function findAssociationOrThrow(associationId) {
  const association = await prisma.association.findUnique({
    where: { association_id: associationId }
  });

  if (!association) {
    throw new ApiError(404, "Association not found.");
  }

  if (association.status === AssociationStatuses.SUSPENDED) {
    throw new ApiError(403, "Association is suspended.");
  }

  return association;
}

async function assertCanRegisterDriver(associationId) {
  const association = await findAssociationOrThrow(associationId);

  if (association.status !== AssociationStatuses.LIMITED || association.driver_limit === null) {
    return;
  }

  const drivers = await prisma.user.count({
    where: {
      association_id: associationId,
      role: Roles.DRIVER,
      status: { not: "DELETED" }
    }
  });

  if (drivers >= association.driver_limit) {
    throw new ApiError(409, "Driver limit reached for this association.");
  }
}

async function assertCanRegisterVehicle(associationId) {
  const association = await findAssociationOrThrow(associationId);

  if (association.status !== AssociationStatuses.LIMITED || association.vehicle_limit === null) {
    return;
  }

  const vehicles = await prisma.vehicle.count({
    where: {
      association_id: associationId,
      status: { not: "DELETED" }
    }
  });

  if (vehicles >= association.vehicle_limit) {
    throw new ApiError(409, "Vehicle limit reached for this association.");
  }
}

module.exports = {
  assertCanRegisterDriver,
  assertCanRegisterVehicle,
  findAssociationOrThrow
};
