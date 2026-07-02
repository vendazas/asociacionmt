DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'LIMITED'
      AND enumtypid = '"RecordStatus"'::regtype
  ) THEN
    ALTER TYPE "RecordStatus" ADD VALUE 'LIMITED';
  END IF;
END
$$;

ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "representative_name" TEXT;
ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "driver_limit" INTEGER;
ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "vehicle_limit" INTEGER;
ALTER TABLE "associations" ADD COLUMN IF NOT EXISTS "observation" TEXT;
