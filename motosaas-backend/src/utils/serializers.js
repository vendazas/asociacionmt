const { toNumber } = require("./geo");

function money(value) {
  return Number(toNumber(value) || 0);
}

function serializeAssociation(association) {
  if (!association) {
    return null;
  }

  return {
    association_id: association.association_id,
    name: association.name,
    slug: association.slug,
    city: association.city,
    country: association.country,
    timezone: association.timezone,
    status: association.status
  };
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    association_id: user.association_id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    status: user.status
  };
}

function serializeDriver(driverProfile) {
  if (!driverProfile) {
    return null;
  }

  return {
    id: driverProfile.id,
    association_id: driverProfile.association_id,
    user_id: driverProfile.user_id,
    license_number: driverProfile.license_number,
    latitude: toNumber(driverProfile.current_latitude),
    longitude: toNumber(driverProfile.current_longitude),
    last_location_at: driverProfile.last_location_at,
    availability_status: driverProfile.availability_status,
    status: driverProfile.status,
    user: serializeUser(driverProfile.user),
    vehicles: driverProfile.user?.vehicles || []
  };
}

function serializeFareConfig(fare) {
  if (!fare) {
    return null;
  }

  return {
    id: fare.id,
    association_id: fare.association_id,
    name: fare.name,
    base_fare: money(fare.base_fare),
    minimum_fare: money(fare.minimum_fare),
    per_kilometer_fare: money(fare.per_kilometer_fare),
    night_surcharge: money(fare.night_surcharge),
    waiting_per_minute_fare: money(fare.waiting_per_minute_fare),
    association_commission_percent: money(fare.association_commission_percent),
    platform_commission_percent: money(fare.platform_commission_percent),
    night_start_hour: fare.night_start_hour,
    night_end_hour: fare.night_end_hour,
    status: fare.status
  };
}

function serializeTrip(trip) {
  if (!trip) {
    return null;
  }

  return {
    id: trip.id,
    association_id: trip.association_id,
    customer_user_id: trip.customer_user_id,
    driver_user_id: trip.driver_user_id,
    vehicle_id: trip.vehicle_id,
    coverage_zone_id: trip.coverage_zone_id,
    origin: {
      address: trip.origin_address,
      latitude: toNumber(trip.origin_latitude),
      longitude: toNumber(trip.origin_longitude)
    },
    destination: {
      address: trip.destination_address,
      latitude: toNumber(trip.destination_latitude),
      longitude: toNumber(trip.destination_longitude)
    },
    estimated_distance_km: money(trip.estimated_distance_km),
    estimated_duration_minutes: trip.estimated_duration_minutes,
    estimated_fare: money(trip.estimated_fare),
    final_distance_km: trip.final_distance_km ? money(trip.final_distance_km) : null,
    waiting_minutes: trip.waiting_minutes,
    final_fare: trip.final_fare ? money(trip.final_fare) : null,
    fare_breakdown: trip.fare_breakdown,
    status: trip.status,
    cancel_reason: trip.cancel_reason,
    requested_at: trip.requested_at,
    accepted_at: trip.accepted_at,
    started_at: trip.started_at,
    completed_at: trip.completed_at,
    canceled_at: trip.canceled_at,
    customer: serializeUser(trip.customer),
    driver: serializeUser(trip.driver),
    vehicle: trip.vehicle || null
  };
}

module.exports = {
  money,
  serializeAssociation,
  serializeDriver,
  serializeFareConfig,
  serializeTrip,
  serializeUser
};
