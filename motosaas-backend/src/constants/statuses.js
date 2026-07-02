const AssociationStatuses = Object.freeze({
  ACTIVE: "ACTIVE",
  LIMITED: "LIMITED",
  SUSPENDED: "SUSPENDED"
});

const operableAssociationStatuses = [
  AssociationStatuses.ACTIVE,
  AssociationStatuses.LIMITED
];

const DriverStatuses = Object.freeze({
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED"
});

const VehicleStatuses = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE"
});

module.exports = {
  AssociationStatuses,
  DriverStatuses,
  VehicleStatuses,
  operableAssociationStatuses
};
