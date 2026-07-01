const { ApiError } = require("../utils/apiError");

function requireFields(...fields) {
  return (req, _res, next) => {
    const missingFields = fields.filter((field) => {
      const value = req.body?.[field];
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      return next(new ApiError(400, `Missing required fields: ${missingFields.join(", ")}.`));
    }

    return next();
  };
}

module.exports = { requireFields };
