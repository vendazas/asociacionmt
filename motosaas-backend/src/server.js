const { app } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./config/db");
const { logger } = require("./config/logger");
const { syncDatabaseSchema } = require("./config/schemaSync");

let server;

async function start() {
  try {
    await syncDatabaseSchema();

    server = app.listen(env.port, env.host, () => {
      logger.info(`motosaas-backend listening on ${env.host}:${env.port}`);
    });
  } catch (error) {
    logger.error("Failed to start motosaas-backend.", {
      message: error.message,
      stack: error.stack
    });
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down.`);

  if (!server) {
    await prisma.$disconnect();
    process.exit(0);
  }

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

start();
