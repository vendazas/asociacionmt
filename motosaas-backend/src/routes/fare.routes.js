const express = require("express");
const fareController = require("../controllers/fare.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/api/v1/fares/current", authenticate, asyncHandler(fareController.getCurrentFare));

router.put(
  "/api/v1/fares/current",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  requireFields(
    "baseFare",
    "minimumFare",
    "perKilometerFare",
    "nightSurcharge",
    "waitingPerMinuteFare",
    "associationCommissionPercent",
    "platformCommissionPercent"
  ),
  asyncHandler(fareController.updateCurrentFare)
);

router.post(
  "/api/v1/fares/estimate",
  authenticate,
  requireFields("originLatitude", "originLongitude", "destinationLatitude", "destinationLongitude"),
  asyncHandler(fareController.estimateFare)
);

module.exports = { fareRoutes: router };
