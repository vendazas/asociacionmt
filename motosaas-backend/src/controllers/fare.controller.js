const fareService = require("../services/fare.service");

async function getCurrentFare(req, res) {
  const data = await fareService.getCurrentFareConfig(req.associationId);
  res.status(200).json({ data });
}

async function updateCurrentFare(req, res) {
  const data = await fareService.upsertCurrentFareConfig(req.user, req.body);
  res.status(200).json({ data });
}

async function estimateFare(req, res) {
  const data = await fareService.estimateFare(req.associationId, req.body);
  res.status(200).json({ data });
}

module.exports = {
  estimateFare,
  getCurrentFare,
  updateCurrentFare
};
