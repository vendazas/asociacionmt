const { app } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./config/db");
const { logger } = require("./config/logger");

const server = app.listen(env.port, () => {
  logger.info(`motosaas-backend listening on port ${env.port}`);
});

async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down.`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});
