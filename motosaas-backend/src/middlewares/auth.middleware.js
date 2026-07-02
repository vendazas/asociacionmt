const associationRepository = require("../repositories/association.repository");
const userRepository = require("../repositories/user.repository");
const { Roles } = require("../constants/roles");
const { AssociationStatuses } = require("../constants/statuses");
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

    const association = await associationRepository.findByAssociationId(user.association_id);
    if (!association) {
      throw new ApiError(401, "Invalid association context.");
    }

    if (association.status === AssociationStatuses.SUSPENDED && user.role !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, "Association is suspended.");
    }

    req.user = user;
    req.associationId = user.association_id;
    req.association = association;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };
