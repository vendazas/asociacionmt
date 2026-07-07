import { io } from "socket.io-client";
import { env } from "../config/env";
import { getAccessToken } from "./storage";

const tripEvents = [
  "viaje_solicitado",
  "viaje_aceptado",
  "viaje_cancelado",
  "viaje_iniciado",
  "viaje_finalizado",
  "conductor_asignado",
  "viaje_actualizado"
];

let socket = null;
let activeRealtimeUrl = env.realtimeBaseUrl;
let resolvedRealtimeUrl = false;
let resolveRealtimeUrlPromise = null;
const pendingTripRooms = new Set();

function healthUrl(baseUrl) {
  return `${baseUrl.replace(/\/+$/, "")}/health`;
}

async function canReach(baseUrl) {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(false), 1500);
  });

  const request = fetch(healthUrl(baseUrl))
    .then((response) => response.ok)
    .catch(() => false);

  return Promise.race([request, timeout]);
}

async function resolveRealtimeBaseUrl() {
  if (resolvedRealtimeUrl) {
    return activeRealtimeUrl;
  }

  if (!resolveRealtimeUrlPromise) {
    resolveRealtimeUrlPromise = (async () => {
      const candidates = env.realtimeBaseUrls?.length ? env.realtimeBaseUrls : [env.realtimeBaseUrl];

      for (const baseUrl of candidates) {
        if (await canReach(baseUrl)) {
          activeRealtimeUrl = baseUrl;
          resolvedRealtimeUrl = true;
          return activeRealtimeUrl;
        }
      }

      return activeRealtimeUrl;
    })().finally(() => {
      resolveRealtimeUrlPromise = null;
    });
  }

  return resolveRealtimeUrlPromise;
}

export async function connectRealtime({ onConnect, onLocationEvent, onMessageEvent, onTripEvent } = {}) {
  const token = await getAccessToken();

  if (!token) {
    return null;
  }

  disconnectRealtime({ clearPending: false });

  const baseUrl = await resolveRealtimeBaseUrl();
  socket = io(baseUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    onConnect?.(socket);

    pendingTripRooms.forEach((viajeId) => {
      socket.emit("join_viaje", { viajeId });
    });
  });

  tripEvents.forEach((event) => {
    socket.on(event, (payload) => {
      onTripEvent?.(event, payload);
    });
  });

  socket.on("conductor_ubicacion_actualizada", (payload) => {
    onLocationEvent?.(payload);
  });

  socket.on("mensaje_viaje_recibido", (payload) => {
    onMessageEvent?.(payload);
  });

  return socket;
}

export function disconnectRealtime({ clearPending = true } = {}) {
  if (!socket) {
    if (clearPending) {
      pendingTripRooms.clear();
    }
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;

  if (clearPending) {
    pendingTripRooms.clear();
  }
}

export function emitRealtime(event, payload, ack) {
  if (event === "join_viaje" && payload?.viajeId) {
    pendingTripRooms.add(payload.viajeId);
  }

  if (event === "leave_viaje" && payload?.viajeId) {
    pendingTripRooms.delete(payload.viajeId);
  }

  if (!socket?.connected) {
    return false;
  }

  socket.emit(event, payload, ack);
  return true;
}
