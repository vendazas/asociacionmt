const reportService = require("../services/report.service");

async function associationSummary(req, res) {
  const data = await reportService.getAssociationSummary(req.associationId);
  res.status(200).json({ data });
}

async function platformSummary(req, res) {
  const data = await reportService.getPlatformSummary();
  res.status(200).json({ data });
}

async function todaySummary(req, res) {
  const data = await reportService.getTodaySummary(req.associationId);
  res.status(200).json({ data });
}

async function driverEarnings(req, res) {
  const data = await reportService.getDriverEarnings(req.user);
  res.status(200).json({ data });
}

module.exports = {
  associationSummary,
  driverEarnings,
  platformSummary,
  todaySummary
};
