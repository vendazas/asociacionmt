import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import { logger } from "./utils/logger.js";

const backendNotificationEvents = new Set([
  "viaje_solicitado",
  "viaje_aceptado",
  "viaje_cancelado",
  "viaje_iniciado",
  "viaje_finalizado",
  "conductor_asignado"
]);

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateApiSecret(req, res, next) {
  const expectedSecret = process.env.API_SECRET;
  const receivedSecret = req.header("x-api-secret");

  if (!expectedSecret) {
    logger.error("API_SECRET is not configured; /emit is disabled.");
    res.status(503).json({ ok: false, error: "API_SECRET is not configured." });
    return;
  }

  if (!receivedSecret || !safeCompare(receivedSecret, expectedSecret)) {
    res.status(401).json({ ok: false, error: "Invalid API secret." });
    return;
  }

  next();
}

function validateEmitPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required.";
  }

  if (!body.room || typeof body.room !== "string") {
    return "room must be a non-empty string.";
  }

  if (!body.event || typeof body.event !== "string") {
    return "event must be a non-empty string.";
  }

  return null;
}

export function createApp(io) {
  const app = express();
  const corsOrigin = process.env.FRONTEND_URL || true;

  app.use(cors({ origin: corsOrigin, credentials: Boolean(process.env.FRONTEND_URL) }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "realtime-service",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.post("/emit", validateApiSecret, (req, res) => {
    const validationError = validateEmitPayload(req.body);

    if (validationError) {
      res.status(400).json({ ok: false, error: validationError });
      return;
    }

    const { room, event, data = null } = req.body;

    // Este endpoint lo consume el backend principal para publicar cambios ya persistidos en BD.
    // Los eventos esperados hoy son viaje_solicitado, viaje_aceptado, viaje_cancelado,
    // viaje_iniciado, viaje_finalizado y conductor_asignado, pero no se bloquean eventos futuros.
    if (!backendNotificationEvents.has(event)) {
      logger.warn("Internal event is outside the documented backend notification list.", { event });
    }

    io.to(room).emit(event, data);
    logger.info("Internal event emitted.", { room, event });

    res.json({ ok: true, room, event });
  });

  return app;
}
