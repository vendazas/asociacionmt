const express = require("express");
const tripController = require("../controllers/trip.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/api/v1/trips/history", authenticate, asyncHandler(tripController.tripHistory));
router.get("/api/v1/trips/open", authenticate, authorize("DRIVER"), asyncHandler(tripController.openTrips));

router.post(
  "/api/v1/trips/request",
  authenticate,
  authorize("CUSTOMER"),
  requireFields("originLatitude", "originLongitude", "destinationLatitude", "destinationLongitude"),
  asyncHandler(tripController.requestTrip)
);

router.post(
  "/api/v1/trips/:tripId/accept",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.acceptTrip)
);

router.post(
  "/api/v1/trips/:tripId/reject",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.rejectTrip)
);

router.post(
  "/api/v1/trips/:tripId/start",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.startTrip)
);

router.post(
  "/api/v1/trips/:tripId/finish",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.finishTrip)
);

router.post("/api/v1/trips/:tripId/cancel", authenticate, asyncHandler(tripController.cancelTrip));
router.get("/api/v1/trips/:tripId/status", authenticate, asyncHandler(tripController.getTripStatus));

module.exports = { tripRoutes: router };
