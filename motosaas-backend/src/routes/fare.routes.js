const express = require("express");
const fareController = require("../controllers/fare.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

const fareRequiredFields = [
  "baseFare",
  "minimumFare",
  "perKilometerFare",
  "nightSurcharge",
  "waitingPerMinuteFare",
  "associationCommissionPercent",
  "platformCommissionPercent",
  "maxDriverSearchRadiusKm"
];

router.get("/api/v1/fares/current", authenticate, asyncHandler(fareController.getCurrentFare));

router.put(
  "/api/v1/fares/current",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields(...fareRequiredFields),
  asyncHandler(fareController.updateCurrentFare)
);

router.get(
  "/api/v1/fares",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(fareController.listFares)
);

router.post(
  "/api/v1/fares",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields(...fareRequiredFields),
  asyncHandler(fareController.createFare)
);

router.post(
  "/api/v1/fares/estimate",
  authenticate,
  requireFields("originLatitude", "originLongitude", "destinationLatitude", "destinationLongitude"),
  asyncHandler(fareController.estimateFare)
);

router.get(
  "/api/v1/fares/:fareId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(fareController.getFare)
);

router.put(
  "/api/v1/fares/:fareId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(fareController.updateFare)
);

router.patch(
  "/api/v1/fares/:fareId/status",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields("status"),
  asyncHandler(fareController.updateFareStatus)
);

router.delete(
  "/api/v1/fares/:fareId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(fareController.deleteFare)
);

module.exports = { fareRoutes: router };
