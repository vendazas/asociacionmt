const { prisma } = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { haversineKm } = require("../utils/geo");
const { money, serializeFareConfig } = require("../utils/serializers");

const fareStatuses = ["ACTIVE", "INACTIVE"];

function valueFrom(payload, camelKey, snakeKey) {
  return payload[camelKey] !== undefined ? payload[camelKey] : payload[snakeKey];
}

function normalizeFareStatus(status) {
  const normalized = String(status || "ACTIVE").trim().toUpperCase();

  if (!fareStatuses.includes(normalized)) {
    throw new ApiError(400, "Invalid fare status.");
  }

  return normalized;
}

function numberField(payload, camelKey, snakeKey, { partial = false, defaultValue = undefined, min = 0, max = null } = {}) {
  const rawValue = valueFrom(payload, camelKey, snakeKey);

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    if (partial) {
      return undefined;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new ApiError(400, `${camelKey} is required.`);
  }

  const value = Number(rawValue);
  if (Number.isNaN(value) || value < min || (max !== null && value > max)) {
    throw new ApiError(400, `${camelKey} must be a valid number.`);
  }

  return value;
}

function hourField(payload, camelKey, snakeKey, defaultValue, partial = false) {
  const value = numberField(payload, camelKey, snakeKey, {
    partial,
    defaultValue,
    min: 0,
    max: 23
  });

  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value)) {
    throw new ApiError(400, `${camelKey} must be an integer between 0 and 23.`);
  }

  return value;
}

function normalizeFarePayload(payload, { partial = false } = {}) {
  const data = {};
  const fieldMap = [
    ["base_fare", "baseFare", "base_fare"],
    ["minimum_fare", "minimumFare", "minimum_fare"],
    ["per_kilometer_fare", "perKilometerFare", "per_kilometer_fare"],
    ["night_surcharge", "nightSurcharge", "night_surcharge"],
    ["waiting_per_minute_fare", "waitingPerMinuteFare", "waiting_per_minute_fare"],
    ["association_commission_percent", "associationCommissionPercent", "association_commission_percent"],
    ["platform_commission_percent", "platformCommissionPercent", "platform_commission_percent"],
    ["max_driver_search_radius_km", "maxDriverSearchRadiusKm", "max_driver_search_radius_km"]
  ];

  if (!partial || payload.name !== undefined) {
    data.name = String(valueFrom(payload, "name", "name") || "Tarifa principal").trim();
  }

  for (const [dbKey, camelKey, snakeKey] of fieldMap) {
    const defaultValue = dbKey === "max_driver_search_radius_km" ? 5 : undefined;
    const max = dbKey.endsWith("_commission_percent") ? 100 : null;
    const value = numberField(payload, camelKey, snakeKey, { partial, defaultValue, min: 0, max });

    if (value !== undefined) {
      data[dbKey] = value;
    }
  }

  const nightStartHour = hourField(payload, "nightStartHour", "night_start_hour", 22, partial);
  const nightEndHour = hourField(payload, "nightEndHour", "night_end_hour", 6, partial);

  if (nightStartHour !== undefined) {
    data.night_start_hour = nightStartHour;
  }

  if (nightEndHour !== undefined) {
    data.night_end_hour = nightEndHour;
  }

  if (!partial || payload.status !== undefined) {
    data.status = normalizeFareStatus(payload.status);
  }

  return data;
}

async function deactivateOtherActiveFares(tx, associationId, excludeFareId = null) {
  await tx.fareConfig.updateMany({
    where: {
      association_id: associationId,
      status: "ACTIVE",
      ...(excludeFareId ? { id: { not: excludeFareId } } : {})
    },
    data: {
      status: "INACTIVE"
    }
  });
}

async function getActiveFareConfig(associationId) {
  const fareConfig = await prisma.fareConfig.findFirst({
    where: {
      association_id: associationId,
      status: "ACTIVE"
    },
    orderBy: {
      created_at: "desc"
    }
  });

  if (!fareConfig) {
    throw new ApiError(404, "No active fare config exists for this association.");
  }

  return fareConfig;
}

function isNightFare(fareConfig, requestedAt = new Date()) {
  const hour = new Date(requestedAt).getHours();
  const start = fareConfig.night_start_hour;
  const end = fareConfig.night_end_hour;

  if (start > end) {
    return hour >= start || hour < end;
  }

  return hour >= start && hour < end;
}

function calculateDistanceKm(payload) {
  if (payload.distanceKm !== undefined && payload.distanceKm !== null && payload.distanceKm !== "") {
    const distanceKm = Number(payload.distanceKm);
    if (Number.isNaN(distanceKm) || distanceKm < 0) {
      throw new ApiError(400, "distanceKm must be a valid number.");
    }

    return distanceKm;
  }

  const originLatitude = Number(payload.originLatitude);
  const originLongitude = Number(payload.originLongitude);
  const destinationLatitude = Number(payload.destinationLatitude);
  const destinationLongitude = Number(payload.destinationLongitude);

  if ([originLatitude, originLongitude, destinationLatitude, destinationLongitude].some(Number.isNaN)) {
    throw new ApiError(400, "origin and destination coordinates must be valid numbers.");
  }

  return haversineKm(
    { latitude: originLatitude, longitude: originLongitude },
    { latitude: destinationLatitude, longitude: destinationLongitude }
  );
}

function calculateFareFromConfig(fareConfig, payload) {
  const distanceKm = calculateDistanceKm(payload);
  const waitingMinutes = Number(payload.waitingMinutes || 0);

  if (Number.isNaN(waitingMinutes) || waitingMinutes < 0) {
    throw new ApiError(400, "waitingMinutes must be a valid number.");
  }

  const night = isNightFare(fareConfig, payload.requestedAt);
  const distanceAmount = distanceKm * money(fareConfig.per_kilometer_fare);
  const waitingAmount = waitingMinutes * money(fareConfig.waiting_per_minute_fare);
  const nightAmount = night ? money(fareConfig.night_surcharge) : 0;
  const subtotal = money(fareConfig.base_fare) + distanceAmount + waitingAmount + nightAmount;
  const total = Math.max(subtotal, money(fareConfig.minimum_fare));
  const associationCommission = total * (money(fareConfig.association_commission_percent) / 100);
  const platformCommission = total * (money(fareConfig.platform_commission_percent) / 100);

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    waitingMinutes,
    isNightFare: night,
    currency: "BOB",
    baseFare: money(fareConfig.base_fare),
    distanceAmount: Number(distanceAmount.toFixed(2)),
    nightSurcharge: Number(nightAmount.toFixed(2)),
    waitingAmount: Number(waitingAmount.toFixed(2)),
    minimumFare: money(fareConfig.minimum_fare),
    total: Number(total.toFixed(2)),
    associationCommission: Number(associationCommission.toFixed(2)),
    platformCommission: Number(platformCommission.toFixed(2)),
    maxDriverSearchRadiusKm: money(fareConfig.max_driver_search_radius_km)
  };
}

async function estimateFare(associationId, payload) {
  const fareConfig = await getActiveFareConfig(associationId);
  const estimate = calculateFareFromConfig(fareConfig, payload);

  return {
    fareConfig: serializeFareConfig(fareConfig),
    estimate
  };
}

async function getCurrentFareConfig(associationId) {
  const fareConfig = await getActiveFareConfig(associationId);
  return serializeFareConfig(fareConfig);
}

async function listFareConfigs(user, query = {}) {
  const search = String(query.search || "").trim();
  const where = {
    association_id: user.association_id,
    status: query.status ? normalizeFareStatus(query.status) : { not: "DELETED" }
  };

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const fares = await prisma.fareConfig.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { created_at: "desc" }
    ],
    take: Math.min(Number(query.limit || 50), 100)
  });

  return fares.map(serializeFareConfig);
}

async function findFareOrThrow(user, fareId) {
  const fare = await prisma.fareConfig.findFirst({
    where: {
      id: fareId,
      association_id: user.association_id,
      status: { not: "DELETED" }
    }
  });

  if (!fare) {
    throw new ApiError(404, "Fare config not found.");
  }

  return fare;
}

async function getFareConfig(user, fareId) {
  return serializeFareConfig(await findFareOrThrow(user, fareId));
}

async function createFareConfig(user, payload) {
  const data = normalizeFarePayload(payload);

  const fare = await prisma.$transaction(async (tx) => {
    if (data.status === "ACTIVE") {
      await deactivateOtherActiveFares(tx, user.association_id);
    }

    return tx.fareConfig.create({
      data: {
        ...data,
        association_id: user.association_id,
        created_by: user.id,
        updated_by: user.id
      }
    });
  });

  return serializeFareConfig(fare);
}

async function updateFareConfig(user, fareId, payload) {
  await findFareOrThrow(user, fareId);
  const data = normalizeFarePayload(payload, { partial: true });

  const fare = await prisma.$transaction(async (tx) => {
    if (data.status === "ACTIVE") {
      await deactivateOtherActiveFares(tx, user.association_id, fareId);
    }

    return tx.fareConfig.update({
      where: { id: fareId },
      data: {
        ...data,
        updated_by: user.id
      }
    });
  });

  return serializeFareConfig(fare);
}

async function updateFareStatus(user, fareId, status) {
  await findFareOrThrow(user, fareId);
  const normalizedStatus = normalizeFareStatus(status);

  const fare = await prisma.$transaction(async (tx) => {
    if (normalizedStatus === "ACTIVE") {
      await deactivateOtherActiveFares(tx, user.association_id, fareId);
    }

    return tx.fareConfig.update({
      where: { id: fareId },
      data: {
        status: normalizedStatus,
        updated_by: user.id
      }
    });
  });

  return serializeFareConfig(fare);
}

async function deleteFareConfig(user, fareId) {
  await findFareOrThrow(user, fareId);
  const fare = await prisma.fareConfig.update({
    where: { id: fareId },
    data: {
      status: "DELETED",
      updated_by: user.id
    }
  });

  return serializeFareConfig(fare);
}

async function upsertCurrentFareConfig(user, payload) {
  const data = {
    ...normalizeFarePayload(payload),
    status: "ACTIVE"
  };

  const fareConfig = await prisma.$transaction(async (tx) => {
    const currentFare = await tx.fareConfig.findFirst({
      where: {
        association_id: user.association_id,
        status: "ACTIVE"
      },
      orderBy: {
        created_at: "desc"
      }
    });

    if (currentFare) {
      await deactivateOtherActiveFares(tx, user.association_id, currentFare.id);
      return tx.fareConfig.update({
        where: { id: currentFare.id },
        data: {
          ...data,
          updated_by: user.id
        }
      });
    }

    return tx.fareConfig.create({
      data: {
        ...data,
        association_id: user.association_id,
        created_by: user.id,
        updated_by: user.id
      }
    });
  });

  return serializeFareConfig(fareConfig);
}

module.exports = {
  calculateFareFromConfig,
  createFareConfig,
  deleteFareConfig,
  estimateFare,
  getActiveFareConfig,
  getCurrentFareConfig,
  getFareConfig,
  listFareConfigs,
  updateFareConfig,
  updateFareStatus,
  upsertCurrentFareConfig
};
