import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { authenticateSocket } from "./middlewares/auth.socket.js";
import { registerSocketEvents } from "./socket/events.js";
import { logger } from "./utils/logger.js";

const PORT = Number(process.env.PORT || 4001);
const socketCorsOrigin = process.env.FRONTEND_URL || "*";
const appCorsCredentials = Boolean(process.env.FRONTEND_URL);

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: socketCorsOrigin,
    credentials: appCorsCredentials
  }
});

const app = createApp(io);
httpServer.on("request", app);

// Todas las conexiones socket deben traer un JWT valido antes de registrar eventos.
io.use(authenticateSocket);

io.on("connection", (socket) => {
  registerSocketEvents(io, socket);
});

httpServer.listen(PORT, () => {
  logger.info(`Realtime service listening on port ${PORT}.`);
});

function shutdown(signal) {
  logger.info(`Received ${signal}; shutting down realtime service.`);

  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
