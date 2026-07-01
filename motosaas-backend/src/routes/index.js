const express = require("express");
const { associationRoutes } = require("./association.routes");
const { authRoutes } = require("./auth.routes");
const { driverRoutes } = require("./driver.routes");
const { fareRoutes } = require("./fare.routes");
const { healthRoutes } = require("./health.routes");
const { ratingRoutes } = require("./rating.routes");
const { reportRoutes } = require("./report.routes");
const { tripRoutes } = require("./trip.routes");
const { userRoutes } = require("./user.routes");
const { vehicleRoutes } = require("./vehicle.routes");
const { zoneRoutes } = require("./zone.routes");

const router = express.Router();

router.use(healthRoutes);
router.use("/api/v1/auth", authRoutes);
router.use(associationRoutes);
router.use(driverRoutes);
router.use(fareRoutes);
router.use(tripRoutes);
router.use(userRoutes);
router.use(vehicleRoutes);
router.use(zoneRoutes);
router.use(ratingRoutes);
router.use(reportRoutes);

module.exports = { router };
