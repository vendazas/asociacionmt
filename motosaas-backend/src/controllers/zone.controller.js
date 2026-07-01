const zoneService = require("../services/zone.service");

async function listZones(req, res) {
  const data = await zoneService.listZones(req.associationId);
  res.status(200).json({ data });
}

async function createZone(req, res) {
  const data = await zoneService.createZone(req.user, req.body);
  res.status(201).json({ data });
}

module.exports = {
  createZone,
  listZones
};
