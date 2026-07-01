const { ApiError } = require("../utils/apiError");

function requireAssociation(req, _res, next) {
  if (!req.associationId) {
    return next(new ApiError(400, "Association context is required."));
  }

  return next();
}

module.exports = { requireAssociation };
