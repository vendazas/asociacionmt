const authService = require("../services/auth.service");
const associationRepository = require("../repositories/association.repository");
const { serializeAssociation, serializeUser } = require("../utils/serializers");

async function login(req, res) {
  const data = await authService.loginWithPassword(req.body);
  res.status(200).json({ data });
}

async function register(req, res) {
  const data = await authService.register(req.body);
  res.status(201).json({ data });
}

async function googleLogin(req, res) {
  const data = await authService.loginWithGoogle(req.body);
  res.status(200).json({ data });
}

async function forgotPassword(req, res) {
  const data = await authService.requestPasswordRecovery(req.body);
  res.status(200).json({ data });
}

async function me(req, res) {
  const association = await associationRepository.findActiveByAssociationId(req.associationId);

  res.status(200).json({
    data: {
      user: serializeUser(req.user),
      association_id: req.associationId,
      association: serializeAssociation(association)
    }
  });
}

module.exports = {
  forgotPassword,
  login,
  register,
  googleLogin,
  me
};
