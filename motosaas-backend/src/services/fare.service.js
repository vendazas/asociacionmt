const { prisma } = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { haversineKm } = require("../utils/geo");
const { money, serializeFareConfig } = require("../utils/serializers");

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
    throw new ApiError(404, "Active fare config not found for this association.");
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

function calculateFareFromConfig(fareConfig, payload) {
  const distanceKm =
    payload.distanceKm ||
    haversineKm(
      {
        latitude: Number(payload.originLatitude),
        longitude: Number(payload.originLongitude)
      },
      {
        latitude: Number(payload.destinationLatitude),
        longitude: Number(payload.destinationLongitude)
      }
    );
  const waitingMinutes = Number(payload.waitingMinutes || 0);
  const night = isNightFare(fareConfig, payload.requestedAt);

  const distanceAmount = distanceKm * money(fareConfig.per_kilometer_fare);
  const waitingAmount = waitingMinutes * money(fareConfig.waiting_per_minute_fare);
  const nightAmount = night ? money(fareConfig.night_surcharge) : 0;
  const subtotal = money(fareConfig.base_fare) + distanceAmount + waitingAmount + nightAmount;
  const total = Math.max(subtotal, money(fareConfig.minimum_fare));
  const associationCommission =
    total * (money(fareConfig.association_commission_percent) / 100);
  const platformCommission =
    total * (money(fareConfig.platform_commission_percent) / 100);

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
    platformCommission: Number(platformCommission.toFixed(2))
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

async function upsertCurrentFareConfig(user, payload) {
  const currentFare = await prisma.fareConfig.findFirst({
    where: {
      association_id: user.association_id,
      status: "ACTIVE"
    },
    orderBy: {
      created_at: "desc"
    }
  });

  const data = {
    name: payload.name || "Tarifa principal",
    base_fare: Number(payload.baseFare),
    minimum_fare: Number(payload.minimumFare),
    per_kilometer_fare: Number(payload.perKilometerFare),
    night_surcharge: Number(payload.nightSurcharge),
    waiting_per_minute_fare: Number(payload.waitingPerMinuteFare),
    association_commission_percent: Number(payload.associationCommissionPercent),
    platform_commission_percent: Number(payload.platformCommissionPercent),
    night_start_hour: Number(payload.nightStartHour ?? 22),
    night_end_hour: Number(payload.nightEndHour ?? 6),
    updated_by: user.id
  };

  const fareConfig = currentFare
    ? await prisma.fareConfig.update({
        where: { id: currentFare.id },
        data
      })
    : await prisma.fareConfig.create({
        data: {
          ...data,
          association_id: user.association_id,
          created_by: user.id
        }
      });

  return serializeFareConfig(fareConfig);
}

module.exports = {
  calculateFareFromConfig,
  estimateFare,
  getActiveFareConfig,
  getCurrentFareConfig,
  upsertCurrentFareConfig
};
