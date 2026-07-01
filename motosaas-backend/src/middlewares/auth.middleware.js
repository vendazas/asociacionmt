const userRepository = require("../repositories/user.repository");
const { ApiError } = require("../utils/apiError");
const { verifyAccessToken } = require("../utils/jwt");

async function authenticate(req, _res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "Bearer token required.");
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findActiveById(payload.associationId, payload.sub);

    if (!user) {
      throw new ApiError(401, "Invalid session.");
    }

    req.user = user;
    req.associationId = user.association_id;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };
