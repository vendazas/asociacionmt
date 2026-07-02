DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'BLOCKED'
      AND enumtypid = '"RecordStatus"'::regtype
  ) THEN
    ALTER TYPE "RecordStatus" ADD VALUE 'BLOCKED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'MAINTENANCE'
      AND enumtypid = '"RecordStatus"'::regtype
  ) THEN
    ALTER TYPE "RecordStatus" ADD VALUE 'MAINTENANCE';
  END IF;
END
$$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_is_temporary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "document_number" TEXT;

ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "internal_number" TEXT;
ALTER TABLE "vehicles" ALTER COLUMN "driver_user_id" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_association_id_username_key"
  ON "users"("association_id", "username");

CREATE UNIQUE INDEX IF NOT EXISTS "users_association_id_document_number_key"
  ON "users"("association_id", "document_number");

CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_association_id_internal_number_key"
  ON "vehicles"("association_id", "internal_number");
