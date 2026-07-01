const associationService = require("../services/association.service");

async function getCurrentAssociation(req, res) {
  const data = await associationService.getCurrentAssociation(req.associationId);
  res.status(200).json({ data });
}

async function listAssociations(req, res) {
  const data = await associationService.listAssociations(req.query);
  res.status(200).json({ data });
}

async function createAssociation(req, res) {
  const data = await associationService.createAssociation(req.user, req.body);
  res.status(201).json({ data });
}

async function updateAssociationStatus(req, res) {
  const data = await associationService.updateAssociationStatus(
    req.user,
    req.params.associationId,
    req.body.status
  );
  res.status(200).json({ data });
}

module.exports = {
  createAssociation,
  getCurrentAssociation,
  listAssociations,
  updateAssociationStatus
};
