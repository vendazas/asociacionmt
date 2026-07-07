import { logger } from "../utils/logger.js";

function roomName(prefix, id) {
  return `${prefix}:${id}`;
}

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function reply(ack, payload) {
  if (typeof ack === "function") {
    ack(payload);
  }
}

function validateRequired(payload, fields) {
  const missing = fields.filter((field) => !isPresent(payload?.[field]));

  if (missing.length) {
    return `Campos requeridos faltantes: ${missing.join(", ")}`;
  }

  return null;
}

function joinRoom(socket, prefix, id, ack) {
  if (!isPresent(id)) {
    reply(ack, { ok: false, error: "Room id is required." });
    return;
  }

  const room = roomName(prefix, id);
  socket.join(room);
  logger.info("Socket joined room.", { socketId: socket.id, room, userId: socket.user?.id });
  reply(ack, { ok: true, room });
}

function leaveRoom(socket, prefix, id, ack) {
  if (!isPresent(id)) {
    reply(ack, { ok: false, error: "Room id is required." });
    return;
  }

  const room = roomName(prefix, id);
  socket.leave(room);
  logger.info("Socket left room.", { socketId: socket.id, room, userId: socket.user?.id });
  reply(ack, { ok: true, room });
}

export function registerSocketEvents(io, socket) {
  logger.info("Socket connected.", {
    socketId: socket.id,
    userId: socket.user?.id,
    asociacionId: socket.user?.asociacionId
  });

  socket.on("join_asociacion", (payload = {}, ack) => {
    joinRoom(socket, "asociacion", payload.asociacionId, ack);
  });

  socket.on("join_pasajero", (payload = {}, ack) => {
    joinRoom(socket, "pasajero", payload.pasajeroId, ack);
  });

  socket.on("join_conductor", (payload = {}, ack) => {
    joinRoom(socket, "conductor", payload.conductorId, ack);
  });

  socket.on("join_viaje", (payload = {}, ack) => {
    joinRoom(socket, "viaje", payload.viajeId, ack);
  });

  socket.on("leave_viaje", (payload = {}, ack) => {
    leaveRoom(socket, "viaje", payload.viajeId, ack);
  });

  socket.on("conductor_ubicacion", (payload = {}, ack) => {
    const requiredError = validateRequired(payload, ["asociacionId", "conductorId", "lat", "lng"]);
    const lat = toNumber(payload.lat);
    const lng = toNumber(payload.lng);

    if (requiredError || lat === null || lng === null) {
      reply(ack, { ok: false, error: requiredError || "lat and lng must be valid numbers." });
      return;
    }

    const data = {
      asociacionId: payload.asociacionId,
      conductorId: payload.conductorId,
      viajeId: payload.viajeId || null,
      lat,
      lng,
      heading: toNumber(payload.heading),
      speed: toNumber(payload.speed),
      emittedAt: new Date().toISOString()
    };

    // El backend principal conserva la verdad en BD; aqui solo difundimos la ubicacion en vivo.
    io.to(roomName("asociacion", payload.asociacionId)).emit("conductor_ubicacion_actualizada", data);
    io.to(roomName("conductor", payload.conductorId)).emit("conductor_ubicacion_actualizada", data);

    if (isPresent(payload.viajeId)) {
      io.to(roomName("viaje", payload.viajeId)).emit("conductor_ubicacion_actualizada", data);
    }

    reply(ack, { ok: true });
  });

  socket.on("mensaje_viaje", (payload = {}, ack) => {
    const requiredError = validateRequired(payload, ["viajeId", "emisorId", "tipoEmisor", "mensaje"]);

    if (requiredError) {
      reply(ack, { ok: false, error: requiredError });
      return;
    }

    const data = {
      viajeId: payload.viajeId,
      emisorId: payload.emisorId,
      tipoEmisor: payload.tipoEmisor,
      mensaje: String(payload.mensaje),
      emittedAt: new Date().toISOString()
    };

    io.to(roomName("viaje", payload.viajeId)).emit("mensaje_viaje_recibido", data);
    reply(ack, { ok: true });
  });

  socket.on("disconnect", (reason) => {
    logger.info("Socket disconnected.", { socketId: socket.id, reason });
  });
}
