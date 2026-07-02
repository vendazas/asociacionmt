const driverService = require("../services/driver.service");

async function updateLocation(req, res) {
  const data = await driverService.updateLocation(req.user, req.body);
  res.status(200).json({ data });
}

async function availableDrivers(req, res) {
  const data = await driverService.listAvailableDrivers(req.associationId, req.query);
  res.status(200).json({ data });
}

async function listDrivers(req, res) {
  const data = await driverService.listDrivers(req.associationId, req.query);
  res.status(200).json({ data });
}

async function getDriver(req, res) {
  const data = await driverService.getDriver(req.associationId, req.params.driverId);
  res.status(200).json({ data });
}

async function createDriver(req, res) {
  const data = await driverService.createDriver(req.user, req.body);
  res.status(201).json({ data });
}

async function updateDriver(req, res) {
  const data = await driverService.updateDriver(req.user, req.params.driverId, req.body);
  res.status(200).json({ data });
}

async function updateDriverStatus(req, res) {
  const data = await driverService.updateDriverStatus(req.user, req.params.driverId, req.body.status);
  res.status(200).json({ data });
}

async function assignVehicle(req, res) {
  const data = await driverService.assignVehicle(req.user, req.params.driverId, req.body.vehicleId || null);
  res.status(200).json({ data });
}

module.exports = {
  assignVehicle,
  availableDrivers,
  createDriver,
  getDriver,
  listDrivers,
  updateDriver,
  updateDriverStatus,
  updateLocation
};
