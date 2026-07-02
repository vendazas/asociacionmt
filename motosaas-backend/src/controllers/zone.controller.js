const zoneService = require("../services/zone.service");

async function listZones(req, res) {
  const data = await zoneService.listZones(req.associationId, req.query);
  res.status(200).json({ data });
}

async function getZone(req, res) {
  const data = await zoneService.getZone(req.user, req.params.zoneId);
  res.status(200).json({ data });
}

async function createZone(req, res) {
  const data = await zoneService.createZone(req.user, req.body);
  res.status(201).json({ data });
}

async function updateZone(req, res) {
  const data = await zoneService.updateZone(req.user, req.params.zoneId, req.body);
  res.status(200).json({ data });
}

async function updateZoneStatus(req, res) {
  const data = await zoneService.updateZoneStatus(req.user, req.params.zoneId, req.body.status);
  res.status(200).json({ data });
}

async function deleteZone(req, res) {
  const data = await zoneService.deleteZone(req.user, req.params.zoneId);
  res.status(200).json({ data });
}

module.exports = {
  createZone,
  deleteZone,
  getZone,
  listZones,
  updateZone,
  updateZoneStatus
};
