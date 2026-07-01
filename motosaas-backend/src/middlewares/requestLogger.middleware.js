const { logger } = require("../config/logger");

function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info("Request completed", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      association_id: req.associationId || null,
      user_id: req.user?.id || null
    });
  });

  next();
}

module.exports = { requestLogger };
