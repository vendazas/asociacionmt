const { env } = require("../config/env");
const { logger } = require("../config/logger");

const EMIT_TIMEOUT_MS = 2500;

function normalizeBaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function isConfigured() {
  return Boolean(env.realtimeServiceUrl && env.realtimeApiSecret);
}

async function emitToRoom(room, event, data) {
  if (!isConfigured()) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMIT_TIMEOUT_MS);

  try {
    const response = await fetch(`${normalizeBaseUrl(env.realtimeServiceUrl)}/emit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-secret": env.realtimeApiSecret
      },
      body: JSON.stringify({ room, event, data }),
      signal: controller.signal
    });

    if (!response.ok) {
      logger.warn("Realtime emit returned a non-success response.", {
        room,
        event,
        status: response.status
      });
    }
  } catch (error) {
    logger.warn("Realtime emit failed.", {
      room,
      event,
      message: error.message
    });
  } finally {
    clearTimeout(timeout);
  }
}

function tripRooms(trip) {
  const candidateDriverRooms = Array.isArray(trip.fare_breakdown?.candidateDriverIds)
    ? trip.fare_breakdown.candidateDriverIds.map((driverId) => (driverId ? `conductor:${driverId}` : null))
    : [];

  return [
    trip.association_id ? `asociacion:${trip.association_id}` : null,
    trip.customer_user_id ? `pasajero:${trip.customer_user_id}` : null,
    trip.driver_user_id ? `conductor:${trip.driver_user_id}` : null,
    trip.id ? `viaje:${trip.id}` : null,
    ...candidateDriverRooms
  ].filter(Boolean);
}

function publishTripEvent(event, trip, metadata = {}) {
  if (!isConfigured() || !trip) {
    return;
  }

  const data = {
    event,
    trip,
    status: trip.status,
    metadata,
    emittedAt: new Date().toISOString()
  };

  const rooms = [...new Set(tripRooms(trip))];

  for (const room of rooms) {
    void emitToRoom(room, event, data);

    // Evento generico para que los clientes puedan refrescar cualquier cambio de estado no listado.
    if (event !== "viaje_actualizado") {
      void emitToRoom(room, "viaje_actualizado", data);
    }
  }
}

module.exports = {
  emitToRoom,
  publishTripEvent
};
