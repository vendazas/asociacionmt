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

module.exports = {
  availableDrivers,
  listDrivers,
  updateLocation
};
