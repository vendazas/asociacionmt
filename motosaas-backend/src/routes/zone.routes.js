const express = require("express");
const zoneController = require("../controllers/zone.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/api/v1/zones", authenticate, asyncHandler(zoneController.listZones));

router.post(
  "/api/v1/zones",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields("name", "city", "centerLatitude", "centerLongitude", "radiusKm"),
  asyncHandler(zoneController.createZone)
);

router.get(
  "/api/v1/zones/:zoneId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(zoneController.getZone)
);

router.put(
  "/api/v1/zones/:zoneId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(zoneController.updateZone)
);

router.patch(
  "/api/v1/zones/:zoneId/status",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields("status"),
  asyncHandler(zoneController.updateZoneStatus)
);

router.delete(
  "/api/v1/zones/:zoneId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(zoneController.deleteZone)
);

module.exports = { zoneRoutes: router };
