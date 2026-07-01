const vehicleService = require("../services/vehicle.service");

async function listMyVehicles(req, res) {
  const data = await vehicleService.listMyVehicles(req.user);
  res.status(200).json({ data });
}

async function listVehicles(req, res) {
  const data = await vehicleService.listVehicles(req.user, req.query);
  res.status(200).json({ data });
}

async function createVehicle(req, res) {
  const data = await vehicleService.createVehicle(req.user, req.body);
  res.status(201).json({ data });
}

async function upsertMyVehicle(req, res) {
  const data = await vehicleService.upsertMyVehicle(req.user, req.body);
  res.status(200).json({ data });
}

module.exports = {
  createVehicle,
  listVehicles,
  listMyVehicles,
  upsertMyVehicle
};
