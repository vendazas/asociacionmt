const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { ApiError } = require("../utils/apiError");
const { serializeTrip } = require("../utils/serializers");
const fareService = require("./fare.service");

const terminalStatuses = ["COMPLETED", "CANCELED"];

function assertTripAccess(user, trip) {
  if ([Roles.SUPER_ADMIN, Roles.ASSOCIATION_ADMIN].includes(user.role)) {
    return;
  }

  if (trip.customer_user_id === user.id || trip.driver_user_id === user.id) {
    return;
  }

  throw new ApiError(403, "Trip access denied.");
}

async function createTripHistory(tx, trip, user, event, fromStatus, toStatus, metadata = {}) {
  return tx.tripHistory.create({
    data: {
      association_id: trip.association_id,
      trip_id: trip.id,
      actor_user_id: user?.id || null,
      event,
      from_status: fromStatus || null,
      to_status: toStatus || null,
      metadata,
      created_by: user?.id || "system",
      updated_by: user?.id || "system"
    }
  });
}

function tripInclude() {
  return {
    customer: true,
    driver: true,
    vehicle: true
  };
}

async function findTripForUser(user, tripId) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      association_id: user.association_id
    },
    include: tripInclude()
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found.");
  }

  assertTripAccess(user, trip);
  return trip;
}

async function requestTrip(user, payload) {
  if (user.role !== Roles.CUSTOMER) {
    throw new ApiError(403, "Only CUSTOMER users can request trips.");
  }

  const fare = await fareService.estimateFare(user.association_id, {
    originLatitude: payload.originLatitude,
    originLongitude: payload.originLongitude,
    destinationLatitude: payload.destinationLatitude,
    destinationLongitude: payload.destinationLongitude,
    waitingMinutes: 0
  });

  const trip = await prisma.$transaction(async (tx) => {
    const createdTrip = await tx.trip.create({
      data: {
        association_id: user.association_id,
        customer_user_id: user.id,
        coverage_zone_id: payload.coverageZoneId || null,
        origin_address: payload.originAddress || null,
        origin_latitude: Number(payload.originLatitude),
        origin_longitude: Number(payload.originLongitude),
        destination_address: payload.destinationAddress || null,
        destination_latitude: Number(payload.destinationLatitude),
        destination_longitude: Number(payload.destinationLongitude),
        estimated_distance_km: fare.estimate.distanceKm,
        estimated_duration_minutes: payload.estimatedDurationMinutes
          ? Number(payload.estimatedDurationMinutes)
          : null,
        estimated_fare: fare.estimate.total,
        fare_breakdown: fare.estimate,
        status: "REQUESTED",
        created_by: user.id,
        updated_by: user.id
      },
      include: tripInclude()
    });

    await createTripHistory(tx, createdTrip, user, "REQUESTED", null, "REQUESTED");
    return createdTrip;
  });

  return serializeTrip(trip);
}

async function acceptTrip(user, tripId) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can accept trips.");
  }

  const driverProfile = await prisma.driverProfile.findFirst({
    where: {
      association_id: user.association_id,
      user_id: user.id,
      status: "ACTIVE"
    }
  });

  if (!driverProfile || driverProfile.availability_status !== "AVAILABLE") {
    throw new ApiError(409, "Driver is not available.");
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      association_id: user.association_id,
      driver_user_id: user.id,
      status: "ACTIVE"
    },
    orderBy: { created_at: "desc" }
  });

  const trip = await prisma.$transaction(async (tx) => {
    const currentTrip = await tx.trip.findFirst({
      where: {
        id: tripId,
        association_id: user.association_id
      }
    });

    if (!currentTrip) {
      throw new ApiError(404, "Trip not found.");
    }

    if (currentTrip.status !== "REQUESTED") {
      throw new ApiError(409, "Only requested trips can be accepted.");
    }

    const updatedTrip = await tx.trip.update({
      where: { id: currentTrip.id },
      data: {
        driver_user_id: user.id,
        vehicle_id: vehicle?.id || null,
        status: "ACCEPTED",
        accepted_at: new Date(),
        updated_by: user.id
      },
      include: tripInclude()
    });

    await tx.driverProfile.update({
      where: { id: driverProfile.id },
      data: {
        availability_status: "BUSY",
        updated_by: user.id
      }
    });

    await createTripHistory(tx, updatedTrip, user, "ACCEPTED", currentTrip.status, "ACCEPTED");
    return updatedTrip;
  });

  return serializeTrip(trip);
}

async function rejectTrip(user, tripId, payload = {}) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can reject trips.");
  }

  const trip = await prisma.$transaction(async (tx) => {
    const currentTrip = await tx.trip.findFirst({
      where: {
        id: tripId,
        association_id: user.association_id
      },
      include: tripInclude()
    });

    if (!currentTrip) {
      throw new ApiError(404, "Trip not found.");
    }

    if (!["REQUESTED", "ACCEPTED"].includes(currentTrip.status)) {
      throw new ApiError(409, "Trip cannot be rejected in its current status.");
    }

    if (currentTrip.driver_user_id && currentTrip.driver_user_id !== user.id) {
      throw new ApiError(403, "This trip is assigned to another driver.");
    }

    let updatedTrip = currentTrip;
    if (currentTrip.driver_user_id === user.id) {
      updatedTrip = await tx.trip.update({
        where: { id: currentTrip.id },
        data: {
          driver_user_id: null,
          vehicle_id: null,
          status: "REQUESTED",
          updated_by: user.id
        },
        include: tripInclude()
      });

      await tx.driverProfile.updateMany({
        where: {
          association_id: user.association_id,
          user_id: user.id
        },
        data: {
          availability_status: "AVAILABLE",
          updated_by: user.id
        }
      });
    }

    await createTripHistory(tx, updatedTrip, user, "REJECTED", currentTrip.status, updatedTrip.status, {
      reason: payload.reason || null
    });

    return updatedTrip;
  });

  return serializeTrip(trip);
}

async function startTrip(user, tripId) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can start trips.");
  }

  const trip = await prisma.$transaction(async (tx) => {
    const currentTrip = await tx.trip.findFirst({
      where: {
        id: tripId,
        association_id: user.association_id,
        driver_user_id: user.id
      }
    });

    if (!currentTrip) {
      throw new ApiError(404, "Trip not found.");
    }

    if (currentTrip.status !== "ACCEPTED") {
      throw new ApiError(409, "Only accepted trips can be started.");
    }

    const updatedTrip = await tx.trip.update({
      where: { id: currentTrip.id },
      data: {
        status: "IN_PROGRESS",
        started_at: new Date(),
        updated_by: user.id
      },
      include: tripInclude()
    });

    await createTripHistory(tx, updatedTrip, user, "STARTED", currentTrip.status, "IN_PROGRESS");
    return updatedTrip;
  });

  return serializeTrip(trip);
}

async function finishTrip(user, tripId, payload = {}) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can finish trips.");
  }

  const trip = await prisma.$transaction(async (tx) => {
    const currentTrip = await tx.trip.findFirst({
      where: {
        id: tripId,
        association_id: user.association_id,
        driver_user_id: user.id
      }
    });

    if (!currentTrip) {
      throw new ApiError(404, "Trip not found.");
    }

    if (currentTrip.status !== "IN_PROGRESS") {
      throw new ApiError(409, "Only in-progress trips can be finished.");
    }

    const fareConfig = await tx.fareConfig.findFirst({
      where: {
        association_id: user.association_id,
        status: "ACTIVE"
      },
      orderBy: { created_at: "desc" }
    });

    if (!fareConfig) {
      throw new ApiError(404, "Active fare config not found for this association.");
    }

    const finalDistanceKm = payload.finalDistanceKm
      ? Number(payload.finalDistanceKm)
      : Number(currentTrip.estimated_distance_km);
    const waitingMinutes = Number(payload.waitingMinutes || currentTrip.waiting_minutes || 0);
    const fare = fareService.calculateFareFromConfig(fareConfig, {
      distanceKm: finalDistanceKm,
      waitingMinutes,
      requestedAt: new Date()
    });

    const updatedTrip = await tx.trip.update({
      where: { id: currentTrip.id },
      data: {
        status: "COMPLETED",
        final_distance_km: finalDistanceKm,
        waiting_minutes: waitingMinutes,
        final_fare: fare.total,
        fare_breakdown: fare,
        completed_at: new Date(),
        updated_by: user.id
      },
      include: tripInclude()
    });

    await tx.driverProfile.updateMany({
      where: {
        association_id: user.association_id,
        user_id: user.id
      },
      data: {
        availability_status: "AVAILABLE",
        updated_by: user.id
      }
    });

    await createTripHistory(tx, updatedTrip, user, "FINISHED", currentTrip.status, "COMPLETED", {
      finalDistanceKm,
      waitingMinutes
    });

    return updatedTrip;
  });

  return serializeTrip(trip);
}

async function cancelTrip(user, tripId, payload = {}) {
  const trip = await prisma.$transaction(async (tx) => {
    const currentTrip = await tx.trip.findFirst({
      where: {
        id: tripId,
        association_id: user.association_id
      },
      include: tripInclude()
    });

    if (!currentTrip) {
      throw new ApiError(404, "Trip not found.");
    }

    assertTripAccess(user, currentTrip);

    if (terminalStatuses.includes(currentTrip.status)) {
      throw new ApiError(409, "Trip is already closed.");
    }

    const updatedTrip = await tx.trip.update({
      where: { id: currentTrip.id },
      data: {
        status: "CANCELED",
        cancel_reason: payload.reason || null,
        canceled_at: new Date(),
        updated_by: user.id
      },
      include: tripInclude()
    });

    if (currentTrip.driver_user_id) {
      await tx.driverProfile.updateMany({
        where: {
          association_id: user.association_id,
          user_id: currentTrip.driver_user_id
        },
        data: {
          availability_status: "AVAILABLE",
          updated_by: user.id
        }
      });
    }

    await createTripHistory(tx, updatedTrip, user, "CANCELED", currentTrip.status, "CANCELED", {
      reason: payload.reason || null
    });

    return updatedTrip;
  });

  return serializeTrip(trip);
}

async function getTripStatus(user, tripId) {
  const trip = await findTripForUser(user, tripId);

  await prisma.tripHistory.create({
    data: {
      association_id: trip.association_id,
      trip_id: trip.id,
      actor_user_id: user.id,
      event: "STATUS_CHECKED",
      from_status: trip.status,
      to_status: trip.status,
      metadata: { polling: true },
      created_by: user.id,
      updated_by: user.id
    }
  });

  return serializeTrip(trip);
}

async function listTripHistory(user, query = {}) {
  const limit = Math.min(Number(query.limit || 20), 100);
  const skip = Number(query.offset || 0);
  const where = {
    association_id: user.association_id
  };

  if (user.role === Roles.CUSTOMER) {
    where.customer_user_id = user.id;
  }

  if (user.role === Roles.DRIVER) {
    where.driver_user_id = user.id;
  }

  const [items, total] = await prisma.$transaction([
    prisma.trip.findMany({
      where,
      include: tripInclude(),
      orderBy: { requested_at: "desc" },
      take: limit,
      skip
    }),
    prisma.trip.count({ where })
  ]);

  return {
    items: items.map(serializeTrip),
    pagination: {
      limit,
      offset: skip,
      total
    }
  };
}

async function listOpenTripsForDrivers(user) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can list open trips.");
  }

  const trips = await prisma.trip.findMany({
    where: {
      association_id: user.association_id,
      status: "REQUESTED"
    },
    include: tripInclude(),
    orderBy: { requested_at: "asc" },
    take: 25
  });

  return trips.map(serializeTrip);
}

module.exports = {
  acceptTrip,
  cancelTrip,
  finishTrip,
  getTripStatus,
  listOpenTripsForDrivers,
  listTripHistory,
  rejectTrip,
  requestTrip,
  startTrip
};
