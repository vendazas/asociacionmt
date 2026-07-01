const express = require("express");
const healthController = require("../controllers/health.controller");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio vivo
 */
router.get("/health", healthController.health);

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio listo
 */
router.get("/ready", asyncHandler(healthController.ready));

module.exports = { healthRoutes: router };
