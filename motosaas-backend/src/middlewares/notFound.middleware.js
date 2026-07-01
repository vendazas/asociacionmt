const { ApiError } = require("../utils/apiError");

function notFoundMiddleware(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { notFoundMiddleware };
