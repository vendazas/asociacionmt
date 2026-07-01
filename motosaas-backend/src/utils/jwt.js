const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function signAccessToken(user) {
  return jwt.sign(
    {
      associationId: user.association_id,
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    {
      subject: user.id,
      issuer: "motosaas",
      expiresIn: env.jwtExpiresIn
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, {
    issuer: "motosaas"
  });
}

module.exports = {
  signAccessToken,
  verifyAccessToken
};
