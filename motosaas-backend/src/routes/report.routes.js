const express = require("express");
const reportController = require("../controllers/report.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/api/v1/reports/platform-summary",
  authenticate,
  authorize("SUPER_ADMIN"),
  asyncHandler(reportController.platformSummary)
);

router.get(
  "/api/v1/reports/dashboard",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(reportController.dashboard)
);

router.get(
  "/api/v1/reports/summary",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(reportController.associationSummary)
);
router.get(
  "/api/v1/reports/today",
  authenticate,
  authorize("ASSOCIATION_ADMIN", "SUPER_ADMIN"),
  asyncHandler(reportController.todaySummary)
);
router.get(
  "/api/v1/reports/driver-earnings",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(reportController.driverEarnings)
);

module.exports = { reportRoutes: router };
