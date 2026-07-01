const authService = require("../services/auth.service");

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

async function me(req, res) {
  res.status(200).json({
    data: {
      user: req.user,
      association_id: req.associationId
    }
  });
}

module.exports = {
  login,
  register,
  googleLogin,
  me
};
