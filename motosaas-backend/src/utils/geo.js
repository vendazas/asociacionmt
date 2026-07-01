function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value);
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function haversineKm(origin, destination) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLng = toRadians(destination.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const destinationLat = toRadians(destination.latitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
}

module.exports = {
  haversineKm,
  toNumber
};
