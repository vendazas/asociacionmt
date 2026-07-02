const express = require("express");
const tripController = require("../controllers/trip.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/api/v1/trips/estimate",
  authenticate,
  authorize("CUSTOMER", "DRIVER"),
  requireFields("originLatitude", "originLongitude", "destinationLatitude", "destinationLongitude"),
  asyncHandler(tripController.estimateTrip)
);

router.get("/api/v1/trips/current", authenticate, authorize("CUSTOMER", "DRIVER"), asyncHandler(tripController.currentTrip));
router.get("/api/v1/trips/history", authenticate, asyncHandler(tripController.tripHistory));
router.get("/api/v1/trips/open", authenticate, authorize("DRIVER"), asyncHandler(tripController.openTrips));

router.get("/api/v1/driver/trips/pending", authenticate, authorize("DRIVER"), asyncHandler(tripController.openTrips));
router.get("/api/v1/driver/trips/history", authenticate, authorize("DRIVER"), asyncHandler(tripController.tripHistory));

router.get(
  "/api/v1/admin/trips",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(tripController.adminTrips)
);

router.get(
  "/api/v1/admin/trips/:tripId",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(tripController.adminTripDetail)
);

router.post(
  "/api/v1/trips/request",
  authenticate,
  authorize("CUSTOMER", "DRIVER"),
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
  "/api/v1/driver/trips/:tripId/accept",
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
  "/api/v1/driver/trips/:tripId/reject",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.rejectTrip)
);

router.post(
  "/api/v1/driver/trips/:tripId/arrived",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.arrivedTrip)
);

router.post(
  "/api/v1/trips/:tripId/arrived",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.arrivedTrip)
);

router.post(
  "/api/v1/trips/:tripId/start",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.startTrip)
);

router.post(
  "/api/v1/driver/trips/:tripId/start",
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

router.post(
  "/api/v1/driver/trips/:tripId/finish",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(tripController.finishTrip)
);

router.post("/api/v1/trips/:tripId/cancel", authenticate, asyncHandler(tripController.cancelTrip));
router.get("/api/v1/trips/:tripId/status", authenticate, asyncHandler(tripController.getTripStatus));

module.exports = { tripRoutes: router };
