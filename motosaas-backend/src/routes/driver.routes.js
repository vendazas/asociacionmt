const express = require("express");
const driverController = require("../controllers/driver.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.patch(
  "/api/v1/drivers/me/location",
  authenticate,
  authorize("DRIVER"),
  requireFields("latitude", "longitude"),
  asyncHandler(driverController.updateLocation)
);

router.get(
  "/api/v1/drivers",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(driverController.listDrivers)
);

router.post(
  "/api/v1/drivers",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields("firstName", "lastName", "phone", "documentNumber", "email", "username", "password"),
  asyncHandler(driverController.createDriver)
);

router.get(
  "/api/v1/drivers/available",
  authenticate,
  authorize("CUSTOMER", "ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(driverController.availableDrivers)
);

router.get(
  "/api/v1/drivers/:driverId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(driverController.getDriver)
);

router.put(
  "/api/v1/drivers/:driverId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(driverController.updateDriver)
);

router.patch(
  "/api/v1/drivers/:driverId/status",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields("status"),
  asyncHandler(driverController.updateDriverStatus)
);

router.patch(
  "/api/v1/drivers/:driverId/vehicle",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(driverController.assignVehicle)
);

module.exports = { driverRoutes: router };
