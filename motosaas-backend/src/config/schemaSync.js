const { spawnSync } = require("child_process");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
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

function runPrisma(args, label) {
  const prismaCli = require.resolve("prisma/build/index.js");
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
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
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    const hint = output.includes("P3005")
      ? " Run npm run prisma:baseline-existing once for an existing database without Prisma migration history."
      : "";

    throw new Error(`${label} failed with exit code ${result.status}.${hint}`);
  }
}

async function databaseHasApplicationTables() {
  const prisma = new PrismaClient();

  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
      LIMIT 1
    `;

    return tables.length > 0;
  } finally {
    await prisma.$disconnect();
  }
}

function markLocalMigrationsApplied() {
  const migrationsDir = path.resolve(__dirname, "../../prisma/migrations");
  const fs = require("fs");

  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const migrations = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migration of migrations) {
    logger.info(`Marking migration as applied after initial schema creation: ${migration}`);
    runPrisma(["migrate", "resolve", "--applied", migration], "Prisma migrate resolve");
  }
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

  if (await databaseHasApplicationTables()) {
    logger.info("Database has existing tables. Applying pending Prisma migrations.");
    runPrisma(["migrate", "deploy"], "Prisma migrate deploy");
  } else {
    logger.info("Database is empty. Creating initial schema with Prisma db push.");
    runPrisma(["db", "push", "--skip-generate"], "Prisma db push");
    markLocalMigrationsApplied();
  }

  logger.info("Database schema is ready.");
}

module.exports = { syncDatabaseSchema };
