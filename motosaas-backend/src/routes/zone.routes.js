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
  requireFields("name"),
  asyncHandler(zoneController.createZone)
);

module.exports = { zoneRoutes: router };
