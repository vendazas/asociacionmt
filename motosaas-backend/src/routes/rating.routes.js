const express = require("express");
const ratingController = require("../controllers/rating.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireFields } = require("../validators/common.validator");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/api/v1/ratings",
  authenticate,
  requireFields("tripId", "ratedUserId", "score"),
  asyncHandler(ratingController.rateTrip)
);

module.exports = { ratingRoutes: router };
