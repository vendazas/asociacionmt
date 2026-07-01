const { Prisma } = require("@prisma/client");
const { logger } = require("../config/logger");
const { ApiError } = require("../utils/apiError");

function normalizeError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    return new ApiError(401, "Invalid or expired token.");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new ApiError(409, "Unique constraint violation.", error.meta);
  }

  return new ApiError(500, "Internal server error.");
}

function errorMiddleware(error, req, res, _next) {
  const normalized = normalizeError(error);

  logger.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode: normalized.statusCode,
    message: normalized.message,
    stack: error.stack
  });

  res.status(normalized.statusCode).json({
    error: {
      message: normalized.message,
      details: normalized.details
    }
  });
}

module.exports = { errorMiddleware };
