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
    representative_name: association.representative_name,
    phone: association.phone,
    email: association.email,
    city: association.city,
    address: association.address,
    country: association.country,
    timezone: association.timezone,
    status: association.status,
    driver_limit: association.driver_limit,
    vehicle_limit: association.vehicle_limit,
    observation: association.observation,
    created_at: association.created_at,
    updated_at: association.updated_at,
    counts: association.counts || null
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
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    document_number: user.document_number,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    password_is_temporary: Boolean(user.password_is_temporary),
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

function serializeVehicle(vehicle) {
  if (!vehicle) {
    return null;
  }

  return {
    id: vehicle.id,
    association_id: vehicle.association_id,
    driver_user_id: vehicle.driver_user_id,
    plate: vehicle.plate,
    internal_number: vehicle.internal_number,
    brand: vehicle.brand,
    model: vehicle.model,
    color: vehicle.color,
    year: vehicle.year,
    status: vehicle.status,
    driver: serializeUser(vehicle.driver),
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at
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
    max_driver_search_radius_km: money(fare.max_driver_search_radius_km),
    night_start_hour: fare.night_start_hour,
    night_end_hour: fare.night_end_hour,
    status: fare.status,
    created_at: fare.created_at,
    updated_at: fare.updated_at
  };
}

function serializeZone(zone) {
  if (!zone) {
    return null;
  }

  return {
    id: zone.id,
    association_id: zone.association_id,
    name: zone.name,
    city: zone.city,
    description: zone.description,
    center_latitude: toNumber(zone.center_latitude),
    center_longitude: toNumber(zone.center_longitude),
    radius_km: toNumber(zone.radius_km),
    polygon: zone.polygon || null,
    status: zone.status,
    created_at: zone.created_at,
    updated_at: zone.updated_at
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
  serializeVehicle,
  serializeZone,
  serializeUser
};
