const express = require("express");
const vehicleController = require("../controllers/vehicle.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/api/v1/vehicles",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(vehicleController.listVehicles)
);

router.post(
  "/api/v1/vehicles",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields("plate"),
  asyncHandler(vehicleController.createVehicle)
);

router.get(
  "/api/v1/vehicles/me",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(vehicleController.listMyVehicles)
);

router.put(
  "/api/v1/vehicles/me",
  authenticate,
  authorize("DRIVER"),
  requireFields("plate"),
  asyncHandler(vehicleController.upsertMyVehicle)
);

router.get(
  "/api/v1/vehicles/:vehicleId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(vehicleController.getVehicle)
);

router.put(
  "/api/v1/vehicles/:vehicleId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(vehicleController.updateVehicle)
);

router.patch(
  "/api/v1/vehicles/:vehicleId/status",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields("status"),
  asyncHandler(vehicleController.updateVehicleStatus)
);

router.patch(
  "/api/v1/vehicles/:vehicleId/assign",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(vehicleController.assignVehicle)
);

module.exports = { vehicleRoutes: router };
