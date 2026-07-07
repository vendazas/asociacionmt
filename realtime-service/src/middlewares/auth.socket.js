import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

function getTokenFromHandshake(socket) {
  const authToken = socket.handshake.auth?.token;
  const queryToken = socket.handshake.query?.token;
  const headerToken = socket.handshake.headers?.authorization;
  const customHeaderToken = socket.handshake.headers?.["x-access-token"];

  if (authToken) {
    return authToken;
  }

  if (queryToken) {
    return queryToken;
  }

  if (customHeaderToken) {
    return customHeaderToken;
  }

  if (headerToken?.startsWith("Bearer ")) {
    return headerToken.slice("Bearer ".length);
  }

  return null;
}

function normalizeUser(payload) {
  return {
    id: payload.sub || payload.id || payload.userId || payload.user_id || null,
    asociacionId: payload.asociacionId || payload.associationId || payload.association_id || null,
    role: payload.role || null,
    payload
  };
}

export function authenticateSocket(socket, next) {
  const token = getTokenFromHandshake(socket);

  if (!process.env.JWT_SECRET) {
    logger.error("JWT_SECRET is not configured; rejecting socket connection.");
    next(new Error("JWT_SECRET is not configured."));
    return;
  }

  if (!token) {
    next(new Error("Authentication token is required."));
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Guardamos los datos decodificados para que los eventos puedan auditar quien se conecto.
    socket.user = normalizeUser(payload);
    next();
  } catch (error) {
    logger.warn("Socket authentication failed.", { reason: error.message });
    next(new Error("Invalid authentication token."));
  }
}
