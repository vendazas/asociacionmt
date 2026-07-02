const vehicleService = require("../services/vehicle.service");

async function listMyVehicles(req, res) {
  const data = await vehicleService.listMyVehicles(req.user);
  res.status(200).json({ data });
}

async function listVehicles(req, res) {
  const data = await vehicleService.listVehicles(req.user, req.query);
  res.status(200).json({ data });
}

async function getVehicle(req, res) {
  const data = await vehicleService.getVehicle(req.user, req.params.vehicleId);
  res.status(200).json({ data });
}

async function createVehicle(req, res) {
  const data = await vehicleService.createVehicle(req.user, req.body);
  res.status(201).json({ data });
}

async function updateVehicle(req, res) {
  const data = await vehicleService.updateVehicle(req.user, req.params.vehicleId, req.body);
  res.status(200).json({ data });
}

async function updateVehicleStatus(req, res) {
  const data = await vehicleService.updateVehicleStatus(req.user, req.params.vehicleId, req.body.status);
  res.status(200).json({ data });
}

async function assignVehicle(req, res) {
  const data = await vehicleService.assignVehicle(req.user, req.params.vehicleId, req.body.driverUserId || null);
  res.status(200).json({ data });
}

async function upsertMyVehicle(req, res) {
  const data = await vehicleService.upsertMyVehicle(req.user, req.body);
  res.status(200).json({ data });
}

module.exports = {
  assignVehicle,
  createVehicle,
  getVehicle,
  updateVehicle,
  updateVehicleStatus,
  listVehicles,
  listMyVehicles,
  upsertMyVehicle
};
