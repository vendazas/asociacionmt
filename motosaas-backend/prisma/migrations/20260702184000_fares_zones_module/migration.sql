ALTER TABLE "fare_configs"
  ADD COLUMN IF NOT EXISTS "max_driver_search_radius_km" DECIMAL(10, 2) NOT NULL DEFAULT 5;

ALTER TABLE "coverage_zones"
  ADD COLUMN IF NOT EXISTS "city" TEXT;
