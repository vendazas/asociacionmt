const { spawnSync } = require("child_process");
const path = require("path");
const { env } = require("./env");
const { logger } = require("./logger");

const BLOCKED_PROXY_PATTERNS = ["127.0.0.1:9", "localhost:9"];
const proxyVars = [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
  "GIT_HTTP_PROXY",
  "GIT_HTTPS_PROXY"
];

function prismaEnv() {
  const nextEnv = { ...process.env };
  const clearedVars = [];

  for (const key of proxyVars) {
    const value = nextEnv[key];
    if (value && BLOCKED_PROXY_PATTERNS.some((pattern) => value.includes(pattern))) {
      delete nextEnv[key];
      clearedVars.push(key);
    }
  }

  if (clearedVars.length > 0) {
    logger.info("Ignoring invalid local proxy variables for Prisma schema sync.", {
      variables: clearedVars
    });
  }

  return nextEnv;
}

async function syncDatabaseSchema() {
  if (!env.syncDatabaseOnStart) {
    logger.info("Database schema sync on start is disabled.");
    return;
  }

  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL must be configured before syncing the database schema.");
  }

  logger.info("Ensuring database schema exists.");

  const prismaCli = require.resolve("prisma/build/index.js");
  const result = spawnSync(process.execPath, [prismaCli, "db", "push", "--skip-generate"], {
    cwd: path.resolve(__dirname, "../.."),
    env: prismaEnv(),
    encoding: "utf8"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.stdout?.trim()) {
    logger.info(result.stdout.trim());
  }

  if (result.stderr?.trim()) {
    logger.warn(result.stderr.trim());
  }

  if (result.status !== 0) {
    throw new Error(`Prisma db push failed with exit code ${result.status}.`);
  }

  logger.info("Database schema is ready.");
}

module.exports = { syncDatabaseSchema };
