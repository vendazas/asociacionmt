const { spawnSync } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

const prisma = new PrismaClient();
const prismaCli = require.resolve("prisma/build/index.js");

const migrations = [
  "20260702161000_association_admin_module",
  "20260702172000_drivers_vehicles_module",
  "20260702184000_fares_zones_module",
  "20260702193000_rest_trip_flow"
];

async function execute(label, sql) {
  process.stdout.write(`[baseline] ${label}...\n`);
  await prisma.$executeRawUnsafe(sql);
}

async function executeMany(label, statements) {
  for (const [index, statement] of statements.entries()) {
    await execute(`${label} ${index + 1}/${statements.length}`, statement);
  }
}

function addEnumValue(typeName, value) {
  return `
DO $$
BEGIN
  IF to_regtype('"${typeName}"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_enum
       WHERE enumlabel = '${value}'
         AND enumtypid = '"${typeName}"'::regtype
     ) THEN
    ALTER TYPE "${typeName}" ADD VALUE '${value}';
  END IF;
END
$$;
`;
}

async function applyExistingDbChanges() {
  for (const value of ["LIMITED", "BLOCKED", "MAINTENANCE"]) {
    await execute(`enum RecordStatus.${value}`, addEnumValue("RecordStatus", value));
  }

  await executeMany(
    "association admin columns",
    [
      'ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "representative_name" TEXT',
      'ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "phone" TEXT',
      'ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "email" TEXT',
      'ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "address" TEXT',
      'ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "driver_limit" INTEGER',
      'ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "vehicle_limit" INTEGER',
      'ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "observation" TEXT'
    ]
  );

  await executeMany(
    "driver and vehicle columns",
    [
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT',
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_is_temporary" BOOLEAN NOT NULL DEFAULT false',
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" TEXT',
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" TEXT',
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "document_number" TEXT',
      'ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "internal_number" TEXT',
      'ALTER TABLE "vehicles" ALTER COLUMN "driver_user_id" DROP NOT NULL'
    ]
  );

  await executeMany(
    "vehicle driver FK optional",
    [
      'ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "vehicles_driver_user_id_fkey"',
      `ALTER TABLE "vehicles"
        ADD CONSTRAINT "vehicles_driver_user_id_fkey"
        FOREIGN KEY ("driver_user_id")
        REFERENCES "users"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE`
    ]
  );

  await executeMany(
    "driver and vehicle indexes",
    [
      'CREATE UNIQUE INDEX IF NOT EXISTS "users_association_id_username_key" ON "users"("association_id", "username")',
      'CREATE UNIQUE INDEX IF NOT EXISTS "users_association_id_document_number_key" ON "users"("association_id", "document_number")',
      'CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_association_id_internal_number_key" ON "vehicles"("association_id", "internal_number")'
    ]
  );

  await executeMany(
    "fare and zone columns",
    [
      'ALTER TABLE "fare_configs" ADD COLUMN IF NOT EXISTS "max_driver_search_radius_km" DECIMAL(10, 2) NOT NULL DEFAULT 5',
      'ALTER TABLE "coverage_zones" ADD COLUMN IF NOT EXISTS "city" TEXT'
    ]
  );

  for (const value of [
    "SEARCHING_DRIVER",
    "DRIVER_ASSIGNED",
    "DRIVER_ARRIVING",
    "TRIP_STARTED",
    "TRIP_FINISHED",
    "TRIP_CANCELLED",
    "EXPIRED"
  ]) {
    await execute(`enum TripStatus.${value}`, addEnumValue("TripStatus", value));
  }

  for (const value of ["SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "CANCELLED", "EXPIRED"]) {
    await execute(`enum TripEvent.${value}`, addEnumValue("TripEvent", value));
  }

  await executeMany(
    "trip status data",
    [
      `UPDATE "trips" SET "status" = 'DRIVER_ASSIGNED' WHERE "status" = 'ACCEPTED'`,
      `UPDATE "trips" SET "status" = 'TRIP_STARTED' WHERE "status" = 'IN_PROGRESS'`,
      `UPDATE "trips" SET "status" = 'TRIP_FINISHED' WHERE "status" = 'COMPLETED'`,
      `UPDATE "trips" SET "status" = 'TRIP_CANCELLED' WHERE "status" = 'CANCELED'`
    ]
  );

  await executeMany(
    "trip history status data",
    [
      `UPDATE "trip_history" SET "from_status" = 'DRIVER_ASSIGNED' WHERE "from_status" = 'ACCEPTED'`,
      `UPDATE "trip_history" SET "to_status" = 'DRIVER_ASSIGNED' WHERE "to_status" = 'ACCEPTED'`,
      `UPDATE "trip_history" SET "from_status" = 'TRIP_STARTED' WHERE "from_status" = 'IN_PROGRESS'`,
      `UPDATE "trip_history" SET "to_status" = 'TRIP_STARTED' WHERE "to_status" = 'IN_PROGRESS'`,
      `UPDATE "trip_history" SET "from_status" = 'TRIP_FINISHED' WHERE "from_status" = 'COMPLETED'`,
      `UPDATE "trip_history" SET "to_status" = 'TRIP_FINISHED' WHERE "to_status" = 'COMPLETED'`,
      `UPDATE "trip_history" SET "from_status" = 'TRIP_CANCELLED' WHERE "from_status" = 'CANCELED'`,
      `UPDATE "trip_history" SET "to_status" = 'TRIP_CANCELLED' WHERE "to_status" = 'CANCELED'`,
      `UPDATE "trip_history" SET "event" = 'DRIVER_ASSIGNED' WHERE "event" = 'ACCEPTED'`,
      `UPDATE "trip_history" SET "event" = 'CANCELLED' WHERE "event" = 'CANCELED'`
    ]
  );
}

function resolveMigration(migration) {
  process.stdout.write(`[baseline] Marcando ${migration} como aplicada...\n`);

  const result = spawnSync(process.execPath, [prismaCli, "migrate", "resolve", "--applied", migration], {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function main() {
  await applyExistingDbChanges();
  await prisma.$disconnect();

  for (const migration of migrations) {
    resolveMigration(migration);
  }

  process.stdout.write("[baseline] Base existente alineada y migraciones registradas.\n");
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exit(1);
});
