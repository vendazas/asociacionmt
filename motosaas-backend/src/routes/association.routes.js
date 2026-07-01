const express = require("express");
const associationController = require("../controllers/association.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/api/v1/associations/current", authenticate, asyncHandler(associationController.getCurrentAssociation));
router.get(
  "/api/v1/associations",
  authenticate,
  authorize("SUPER_ADMIN"),
  asyncHandler(associationController.listAssociations)
);
router.post(
  "/api/v1/associations",
  authenticate,
  authorize("SUPER_ADMIN"),
  requireFields("name", "slug", "city"),
  asyncHandler(associationController.createAssociation)
);
router.patch(
  "/api/v1/associations/:associationId/status",
  authenticate,
  authorize("SUPER_ADMIN"),
  requireFields("status"),
  asyncHandler(associationController.updateAssociationStatus)
);

module.exports = { associationRoutes: router };
