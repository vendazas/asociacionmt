const fareService = require("../services/fare.service");

async function getCurrentFare(req, res) {
  const data = await fareService.getCurrentFareConfig(req.associationId);
  res.status(200).json({ data });
}

async function listFares(req, res) {
  const data = await fareService.listFareConfigs(req.user, req.query);
  res.status(200).json({ data });
}

async function getFare(req, res) {
  const data = await fareService.getFareConfig(req.user, req.params.fareId);
  res.status(200).json({ data });
}

async function createFare(req, res) {
  const data = await fareService.createFareConfig(req.user, req.body);
  res.status(201).json({ data });
}

async function updateCurrentFare(req, res) {
  const data = await fareService.upsertCurrentFareConfig(req.user, req.body);
  res.status(200).json({ data });
}

async function updateFare(req, res) {
  const data = await fareService.updateFareConfig(req.user, req.params.fareId, req.body);
  res.status(200).json({ data });
}

async function updateFareStatus(req, res) {
  const data = await fareService.updateFareStatus(req.user, req.params.fareId, req.body.status);
  res.status(200).json({ data });
}

async function deleteFare(req, res) {
  const data = await fareService.deleteFareConfig(req.user, req.params.fareId);
  res.status(200).json({ data });
}

async function estimateFare(req, res) {
  const data = await fareService.estimateFare(req.associationId, req.body);
  res.status(200).json({ data });
}

module.exports = {
  createFare,
  deleteFare,
  estimateFare,
  getFare,
  getCurrentFare,
  listFares,
  updateFare,
  updateFareStatus,
  updateCurrentFare
};
