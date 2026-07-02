DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SEARCHING_DRIVER'
      AND enumtypid = '"TripStatus"'::regtype
  ) THEN
    ALTER TYPE "TripStatus" ADD VALUE 'SEARCHING_DRIVER';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'DRIVER_ASSIGNED'
      AND enumtypid = '"TripStatus"'::regtype
  ) THEN
    ALTER TYPE "TripStatus" ADD VALUE 'DRIVER_ASSIGNED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'DRIVER_ARRIVING'
      AND enumtypid = '"TripStatus"'::regtype
  ) THEN
    ALTER TYPE "TripStatus" ADD VALUE 'DRIVER_ARRIVING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'TRIP_STARTED'
      AND enumtypid = '"TripStatus"'::regtype
  ) THEN
    ALTER TYPE "TripStatus" ADD VALUE 'TRIP_STARTED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'TRIP_FINISHED'
      AND enumtypid = '"TripStatus"'::regtype
  ) THEN
    ALTER TYPE "TripStatus" ADD VALUE 'TRIP_FINISHED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'TRIP_CANCELLED'
      AND enumtypid = '"TripStatus"'::regtype
  ) THEN
    ALTER TYPE "TripStatus" ADD VALUE 'TRIP_CANCELLED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'EXPIRED'
      AND enumtypid = '"TripStatus"'::regtype
  ) THEN
    ALTER TYPE "TripStatus" ADD VALUE 'EXPIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SEARCHING_DRIVER'
      AND enumtypid = '"TripEvent"'::regtype
  ) THEN
    ALTER TYPE "TripEvent" ADD VALUE 'SEARCHING_DRIVER';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'DRIVER_ASSIGNED'
      AND enumtypid = '"TripEvent"'::regtype
  ) THEN
    ALTER TYPE "TripEvent" ADD VALUE 'DRIVER_ASSIGNED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'DRIVER_ARRIVING'
      AND enumtypid = '"TripEvent"'::regtype
  ) THEN
    ALTER TYPE "TripEvent" ADD VALUE 'DRIVER_ARRIVING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'CANCELLED'
      AND enumtypid = '"TripEvent"'::regtype
  ) THEN
    ALTER TYPE "TripEvent" ADD VALUE 'CANCELLED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'EXPIRED'
      AND enumtypid = '"TripEvent"'::regtype
  ) THEN
    ALTER TYPE "TripEvent" ADD VALUE 'EXPIRED';
  END IF;
END
$$;

UPDATE "trips" SET "status" = 'DRIVER_ASSIGNED' WHERE "status" = 'ACCEPTED';
UPDATE "trips" SET "status" = 'TRIP_STARTED' WHERE "status" = 'IN_PROGRESS';
UPDATE "trips" SET "status" = 'TRIP_FINISHED' WHERE "status" = 'COMPLETED';
UPDATE "trips" SET "status" = 'TRIP_CANCELLED' WHERE "status" = 'CANCELED';

UPDATE "trip_history" SET "from_status" = 'DRIVER_ASSIGNED' WHERE "from_status" = 'ACCEPTED';
UPDATE "trip_history" SET "to_status" = 'DRIVER_ASSIGNED' WHERE "to_status" = 'ACCEPTED';
UPDATE "trip_history" SET "from_status" = 'TRIP_STARTED' WHERE "from_status" = 'IN_PROGRESS';
UPDATE "trip_history" SET "to_status" = 'TRIP_STARTED' WHERE "to_status" = 'IN_PROGRESS';
UPDATE "trip_history" SET "from_status" = 'TRIP_FINISHED' WHERE "from_status" = 'COMPLETED';
UPDATE "trip_history" SET "to_status" = 'TRIP_FINISHED' WHERE "to_status" = 'COMPLETED';
UPDATE "trip_history" SET "from_status" = 'TRIP_CANCELLED' WHERE "from_status" = 'CANCELED';
UPDATE "trip_history" SET "to_status" = 'TRIP_CANCELLED' WHERE "to_status" = 'CANCELED';

UPDATE "trip_history" SET "event" = 'DRIVER_ASSIGNED' WHERE "event" = 'ACCEPTED';
UPDATE "trip_history" SET "event" = 'CANCELLED' WHERE "event" = 'CANCELED';
