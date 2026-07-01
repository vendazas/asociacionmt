const tripService = require("../services/trip.service");

async function requestTrip(req, res) {
  const data = await tripService.requestTrip(req.user, req.body);
  res.status(201).json({ data });
}

async function acceptTrip(req, res) {
  const data = await tripService.acceptTrip(req.user, req.params.tripId);
  res.status(200).json({ data });
}

async function rejectTrip(req, res) {
  const data = await tripService.rejectTrip(req.user, req.params.tripId, req.body);
  res.status(200).json({ data });
}

async function startTrip(req, res) {
  const data = await tripService.startTrip(req.user, req.params.tripId);
  res.status(200).json({ data });
}

async function finishTrip(req, res) {
  const data = await tripService.finishTrip(req.user, req.params.tripId, req.body);
  res.status(200).json({ data });
}

async function cancelTrip(req, res) {
  const data = await tripService.cancelTrip(req.user, req.params.tripId, req.body);
  res.status(200).json({ data });
}

async function getTripStatus(req, res) {
  const data = await tripService.getTripStatus(req.user, req.params.tripId);
  res.status(200).json({ data });
}

async function tripHistory(req, res) {
  const data = await tripService.listTripHistory(req.user, req.query);
  res.status(200).json({ data });
}

async function openTrips(req, res) {
  const data = await tripService.listOpenTripsForDrivers(req.user);
  res.status(200).json({ data });
}

module.exports = {
  acceptTrip,
  cancelTrip,
  finishTrip,
  getTripStatus,
  openTrips,
  rejectTrip,
  requestTrip,
  startTrip,
  tripHistory
};
