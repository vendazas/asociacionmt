const { ApiError } = require("../utils/apiError");

function validateLogin(req, _res, next) {
  const { associationSlug, email, username, password } = req.body || {};

  if (!associationSlug || !(email || username) || !password) {
    return next(new ApiError(400, "associationSlug, email or username, and password are required."));
  }

  return next();
}

function validateRegister(req, _res, next) {
  const { associationSlug, email, password, fullName, full_name: fullNameSnake } = req.body || {};

  if (!associationSlug || !email || !password || !(fullName || fullNameSnake)) {
    return next(new ApiError(400, "associationSlug, email, password and fullName are required."));
  }

  return next();
}

function validateGoogleLogin(req, _res, next) {
  const { associationSlug, idToken } = req.body || {};

  if (!associationSlug || !idToken) {
    return next(new ApiError(400, "associationSlug and idToken are required."));
  }

  return next();
}

function validateForgotPassword(req, _res, next) {
  const { associationSlug, email } = req.body || {};

  if (!associationSlug || !email) {
    return next(new ApiError(400, "associationSlug and email are required."));
  }

  return next();
}

module.exports = {
  validateForgotPassword,
  validateRegister,
  validateLogin,
  validateGoogleLogin
};
