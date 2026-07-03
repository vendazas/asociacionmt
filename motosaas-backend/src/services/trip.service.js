const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { ApiError } = require("../utils/apiError");
const { haversineKm, toNumber } = require("../utils/geo");
const { serializeTrip, serializeZone } = require("../utils/serializers");
const fareService = require("./fare.service");

const TripStatuses = Object.freeze({
  REQUESTED: "REQUESTED",
  SEARCHING_DRIVER: "SEARCHING_DRIVER",
  DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
  DRIVER_ARRIVING: "DRIVER_ARRIVING",
  TRIP_STARTED: "TRIP_STARTED",
  TRIP_FINISHED: "TRIP_FINISHED",
  TRIP_CANCELLED: "TRIP_CANCELLED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED"
});

const terminalStatuses = [
  TripStatuses.TRIP_FINISHED,
  TripStatuses.TRIP_CANCELLED,
  TripStatuses.REJECTED,
  TripStatuses.EXPIRED
];
const pendingStatuses = [TripStatuses.REQUESTED, TripStatuses.SEARCHING_DRIVER];
const driverActiveStatuses = [
  TripStatuses.DRIVER_ASSIGNED,
  TripStatuses.DRIVER_ARRIVING,
  TripStatuses.TRIP_STARTED
];

function tripInclude() {
  return {
    customer: true,
    driver: true,
    vehicle: true,
    coverage_zone: true
  };
}

function serializedTrip(trip) {
  return {
    ...serializeTrip(trip),
    coverage_zone: serializeZone(trip.coverage_zone)
  };
}

function assertTripAccess(user, trip) {
  if (user.role === Roles.SUPER_ADMIN) {
    return;
  }

  if (user.role === Roles.ASSOCIATION_ADMIN && trip.association_id === user.association_id) {
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

async function findTripForUser(user, tripId) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      ...(user.role === Roles.SUPER_ADMIN ? {} : { association_id: user.association_id })
    },
    include: tripInclude()
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found.");
  }

  assertTripAccess(user, trip);
  return trip;
}

async function resolveCoverageZone(associationId, payload) {
  if (payload.coverageZoneId) {
    const zone = await prisma.coverageZone.findFirst({
      where: {
        id: payload.coverageZoneId,
        association_id: associationId,
        status: "ACTIVE"
      }
    });

    if (!zone) {
      throw new ApiError(404, "Coverage zone not found.");
    }

    return zone;
  }

  const zones = await prisma.coverageZone.findMany({
    where: {
      association_id: associationId,
      status: "ACTIVE",
      center_latitude: { not: null },
      center_longitude: { not: null },
      radius_km: { not: null }
    },
    orderBy: { name: "asc" }
  });

  if (!zones.length) {
    return null;
  }

  const origin = {
    latitude: Number(payload.originLatitude),
    longitude: Number(payload.originLongitude)
  };

  const zone = zones.find((candidate) => {
    const distanceKm = haversineKm(origin, {
      latitude: toNumber(candidate.center_latitude),
      longitude: toNumber(candidate.center_longitude)
    });

    return distanceKm <= toNumber(candidate.radius_km);
  });

  if (!zone) {
    throw new ApiError(409, "Origin is outside active coverage zones.");
  }

  return zone;
}

async function estimateTrip(user, payload) {
  if (![Roles.CUSTOMER, Roles.DRIVER].includes(user.role)) {
    throw new ApiError(403, "Only PASSENGER and DRIVER users can estimate trips.");
  }

  const fare = await fareService.estimateFare(user.association_id, payload);
  const coverageZone = await resolveCoverageZone(user.association_id, payload);

  return {
    ...fare,
    coverageZone: serializeZone(coverageZone)
  };
}

function isInsideZone(location, zone) {
  if (
    !zone ||
    zone.center_latitude === null ||
    zone.center_longitude === null ||
    zone.radius_km === null
  ) {
    return true;
  }

  if (location.latitude === null || location.longitude === null) {
    return false;
  }

  const distanceKm = haversineKm(location, {
    latitude: toNumber(zone.center_latitude),
    longitude: toNumber(zone.center_longitude)
  });

  return distanceKm <= toNumber(zone.radius_km);
}

async function findAvailableDriversForTrip(associationId, payload, maxRadiusKm, coverageZone = null, excludeUserId = null) {
  const drivers = await prisma.driverProfile.findMany({
    where: {
      association_id: associationId,
      ...(excludeUserId ? { user_id: { not: excludeUserId } } : {}),
      availability_status: "AVAILABLE",
      status: "ACTIVE",
      current_latitude: { not: null },
      current_longitude: { not: null },
      user: {
        role: Roles.DRIVER,
        status: "ACTIVE"
      }
    },
    include: {
      user: true
    }
  });

  const origin = {
    latitude: Number(payload.originLatitude),
    longitude: Number(payload.originLongitude)
  };

  return drivers
    .map((driver) => {
      const location = {
        latitude: toNumber(driver.current_latitude),
        longitude: toNumber(driver.current_longitude)
      };

      return {
        id: driver.user_id,
        location,
        distanceKm: haversineKm(origin, location)
      };
    })
    .filter((driver) => isInsideZone(driver.location, coverageZone))
    .filter((driver) => !maxRadiusKm || driver.distanceKm <= maxRadiusKm);
}

async function requestTrip(user, payload) {
  if (![Roles.CUSTOMER, Roles.DRIVER].includes(user.role)) {
    throw new ApiError(403, "Only PASSENGER and DRIVER users can request trips.");
  }

  const fare = await fareService.estimateFare(user.association_id, {
    originLatitude: payload.originLatitude,
    originLongitude: payload.originLongitude,
    destinationLatitude: payload.destinationLatitude,
    destinationLongitude: payload.destinationLongitude,
    waitingMinutes: 0
  });
  const coverageZone = await resolveCoverageZone(user.association_id, payload);
  const availableDrivers = await findAvailableDriversForTrip(
    user.association_id,
    payload,
    fare.fareConfig.max_driver_search_radius_km,
    coverageZone,
    user.id
  );

  const trip = await prisma.$transaction(async (tx) => {
    const createdTrip = await tx.trip.create({
      data: {
        association_id: user.association_id,
        customer_user_id: user.id,
        coverage_zone_id: coverageZone?.id || null,
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
        fare_breakdown: {
          ...fare.estimate,
          candidateDriverIds: availableDrivers.map((driver) => driver.id)
        },
        status: TripStatuses.REQUESTED,
        created_by: user.id,
        updated_by: user.id
      },
      include: tripInclude()
    });

    await createTripHistory(tx, createdTrip, user, "REQUESTED", null, TripStatuses.REQUESTED);

    const searchingTrip = await tx.trip.update({
      where: { id: createdTrip.id },
      data: {
        status: TripStatuses.SEARCHING_DRIVER,
        updated_by: user.id
      },
      include: tripInclude()
    });

    await createTripHistory(
      tx,
      searchingTrip,
      user,
      "SEARCHING_DRIVER",
      TripStatuses.REQUESTED,
      TripStatuses.SEARCHING_DRIVER,
      {
        availableDriverCount: availableDrivers.length,
        maxDriverSearchRadiusKm: fare.fareConfig.max_driver_search_radius_km
      }
    );

    return searchingTrip;
  });

  return serializedTrip(trip);
}

async function assertAvailableDriver(user) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can perform this action.");
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

  return driverProfile;
}

async function getDriverVehicle(user) {
  return prisma.vehicle.findFirst({
    where: {
      association_id: user.association_id,
      driver_user_id: user.id,
      status: "ACTIVE"
    },
    orderBy: { created_at: "desc" }
  });
}

async function acceptTrip(user, tripId) {
  const driverProfile = await assertAvailableDriver(user);
  const vehicle = await getDriverVehicle(user);

  const trip = await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: {
        id: tripId,
        association_id: user.association_id,
        customer_user_id: { not: user.id },
        driver_user_id: null,
        status: { in: pendingStatuses }
      },
      data: {
        driver_user_id: user.id,
        vehicle_id: vehicle?.id || null,
        status: TripStatuses.DRIVER_ASSIGNED,
        accepted_at: new Date(),
        updated_by: user.id
      }
    });

    if (result.count !== 1) {
      throw new ApiError(409, "Trip is no longer available.");
    }

    await tx.driverProfile.update({
      where: { id: driverProfile.id },
      data: {
        availability_status: "BUSY",
        updated_by: user.id
      }
    });

    const updatedTrip = await tx.trip.findUnique({
      where: { id: tripId },
      include: tripInclude()
    });

    await createTripHistory(
      tx,
      updatedTrip,
      user,
      "DRIVER_ASSIGNED",
      TripStatuses.SEARCHING_DRIVER,
      TripStatuses.DRIVER_ASSIGNED,
      { vehicleId: vehicle?.id || null }
    );

    return updatedTrip;
  });

  return serializedTrip(trip);
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

    if (terminalStatuses.includes(currentTrip.status)) {
      throw new ApiError(409, "Trip is already closed.");
    }

    if (currentTrip.driver_user_id && currentTrip.driver_user_id !== user.id) {
      throw new ApiError(403, "This trip is assigned to another driver.");
    }

    let updatedTrip = currentTrip;
    let nextStatus = currentTrip.status;

    if (currentTrip.driver_user_id === user.id) {
      nextStatus = TripStatuses.SEARCHING_DRIVER;
      updatedTrip = await tx.trip.update({
        where: { id: currentTrip.id },
        data: {
          driver_user_id: null,
          vehicle_id: null,
          status: nextStatus,
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

    await createTripHistory(tx, updatedTrip, user, "REJECTED", currentTrip.status, nextStatus, {
      reason: payload.reason || null
    });

    return updatedTrip;
  });

  return serializedTrip(trip);
}

async function arrivedTrip(user, tripId) {
  if (user.role !== Roles.DRIVER) {
    throw new ApiError(403, "Only DRIVER users can mark arrival.");
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

    if (currentTrip.status !== TripStatuses.DRIVER_ASSIGNED) {
      throw new ApiError(409, "Only assigned trips can be marked as arriving.");
    }

    const updatedTrip = await tx.trip.update({
      where: { id: currentTrip.id },
      data: {
        status: TripStatuses.DRIVER_ARRIVING,
        updated_by: user.id
      },
      include: tripInclude()
    });

    await createTripHistory(
      tx,
      updatedTrip,
      user,
      "DRIVER_ARRIVING",
      currentTrip.status,
      TripStatuses.DRIVER_ARRIVING
    );

    return updatedTrip;
  });

  return serializedTrip(trip);
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

    if (![TripStatuses.DRIVER_ASSIGNED, TripStatuses.DRIVER_ARRIVING].includes(currentTrip.status)) {
      throw new ApiError(409, "Only assigned or arriving trips can be started.");
    }

    const updatedTrip = await tx.trip.update({
      where: { id: currentTrip.id },
      data: {
        status: TripStatuses.TRIP_STARTED,
        started_at: new Date(),
        updated_by: user.id
      },
      include: tripInclude()
    });

    await createTripHistory(tx, updatedTrip, user, "STARTED", currentTrip.status, TripStatuses.TRIP_STARTED);
    return updatedTrip;
  });

  return serializedTrip(trip);
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

    if (currentTrip.status !== TripStatuses.TRIP_STARTED) {
      throw new ApiError(409, "Only started trips can be finished.");
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
        status: TripStatuses.TRIP_FINISHED,
        final_distance_km: finalDistanceKm,
        waiting_minutes: waitingMinutes,
        final_fare: fare.total,
        fare_breakdown: {
          ...(typeof currentTrip.fare_breakdown === "object" ? currentTrip.fare_breakdown : {}),
          final: fare
        },
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

    await createTripHistory(tx, updatedTrip, user, "FINISHED", currentTrip.status, TripStatuses.TRIP_FINISHED, {
      finalDistanceKm,
      waitingMinutes
    });

    return updatedTrip;
  });

  return serializedTrip(trip);
}

async function cancelTrip(user, tripId, payload = {}) {
  const trip = await prisma.$transaction(async (tx) => {
    const currentTrip = await tx.trip.findFirst({
      where: {
        id: tripId,
        ...(user.role === Roles.SUPER_ADMIN ? {} : { association_id: user.association_id })
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
        status: TripStatuses.TRIP_CANCELLED,
        cancel_reason: payload.reason || null,
        canceled_at: new Date(),
        updated_by: user.id
      },
      include: tripInclude()
    });

    if (currentTrip.driver_user_id) {
      await tx.driverProfile.updateMany({
        where: {
          association_id: currentTrip.association_id,
          user_id: currentTrip.driver_user_id
        },
        data: {
          availability_status: "AVAILABLE",
          updated_by: user.id
        }
      });
    }

    await createTripHistory(tx, updatedTrip, user, "CANCELLED", currentTrip.status, TripStatuses.TRIP_CANCELLED, {
      reason: payload.reason || null
    });

    return updatedTrip;
  });

  return serializedTrip(trip);
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

  return serializedTrip(trip);
}

async function getCurrentTrip(user) {
  if (![Roles.CUSTOMER, Roles.DRIVER].includes(user.role)) {
    throw new ApiError(403, "Only PASSENGER and DRIVER users can view current trips.");
  }

  const trip = await prisma.trip.findFirst({
    where: {
      association_id: user.association_id,
      status: { notIn: terminalStatuses },
      OR: [
        { customer_user_id: user.id },
        { driver_user_id: user.id }
      ]
    },
    include: tripInclude(),
    orderBy: { requested_at: "desc" }
  });

  return trip ? serializedTrip(trip) : null;
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
    where.OR = [
      { customer_user_id: user.id },
      { driver_user_id: user.id }
    ];
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
    items: items.map(serializedTrip),
    pagination: {
      limit,
      offset: skip,
      total
    }
  };
}

async function listPendingTripsForDriver(user) {
  const driverProfile = await assertAvailableDriver(user);
  const trips = await prisma.trip.findMany({
    where: {
      association_id: user.association_id,
      customer_user_id: { not: user.id },
      status: { in: pendingStatuses },
      driver_user_id: null
    },
    include: tripInclude(),
    orderBy: { requested_at: "asc" },
    take: 50
  });

  if (!trips.length) {
    return [];
  }

  const rejected = await prisma.tripHistory.findMany({
    where: {
      association_id: user.association_id,
      actor_user_id: user.id,
      event: "REJECTED",
      trip_id: { in: trips.map((trip) => trip.id) }
    },
    select: { trip_id: true }
  });
  const rejectedIds = new Set(rejected.map((item) => item.trip_id));
  const driverLocation = {
    latitude: toNumber(driverProfile.current_latitude),
    longitude: toNumber(driverProfile.current_longitude)
  };

  return trips
    .filter((trip) => !rejectedIds.has(trip.id))
    .filter((trip) => {
      if (!isInsideZone(driverLocation, trip.coverage_zone)) {
        return false;
      }

      const maxRadiusKm = Number(trip.fare_breakdown?.maxDriverSearchRadiusKm || 0);
      if (!maxRadiusKm || driverLocation.latitude === null || driverLocation.longitude === null) {
        return true;
      }

      const distanceKm = haversineKm(driverLocation, {
        latitude: toNumber(trip.origin_latitude),
        longitude: toNumber(trip.origin_longitude)
      });

      return distanceKm <= maxRadiusKm;
    })
    .map(serializedTrip);
}

async function listAdminTrips(user, query = {}) {
  if (![Roles.SUPER_ADMIN, Roles.ASSOCIATION_ADMIN].includes(user.role)) {
    throw new ApiError(403, "Only admins can list trips.");
  }

  const limit = Math.min(Number(query.limit || 50), 100);
  const skip = Number(query.offset || 0);
  const where = {};

  if (user.role !== Roles.SUPER_ADMIN) {
    where.association_id = user.association_id;
  } else if (query.associationId) {
    where.association_id = query.associationId;
  }

  if (query.status) {
    where.status = String(query.status).trim().toUpperCase();
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
    items: items.map(serializedTrip),
    pagination: {
      limit,
      offset: skip,
      total
    }
  };
}

async function getAdminTrip(user, tripId) {
  if (![Roles.SUPER_ADMIN, Roles.ASSOCIATION_ADMIN].includes(user.role)) {
    throw new ApiError(403, "Only admins can view trips.");
  }

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      ...(user.role === Roles.SUPER_ADMIN ? {} : { association_id: user.association_id })
    },
    include: {
      ...tripInclude(),
      history: {
        orderBy: { created_at: "asc" }
      }
    }
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found.");
  }

  return {
    ...serializedTrip(trip),
    history: trip.history
  };
}

module.exports = {
  acceptTrip,
  arrivedTrip,
  cancelTrip,
  estimateTrip,
  finishTrip,
  getAdminTrip,
  getCurrentTrip,
  getTripStatus,
  listAdminTrips,
  listOpenTripsForDrivers: listPendingTripsForDriver,
  listPendingTripsForDriver,
  listTripHistory,
  rejectTrip,
  requestTrip,
  startTrip,
  TripStatuses
};
