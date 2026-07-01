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

router.get(
  "/api/v1/drivers/available",
  authenticate,
  authorize("CUSTOMER", "ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(driverController.availableDrivers)
);

module.exports = { driverRoutes: router };
