const { OAuth2Client } = require("google-auth-library");
const { env } = require("./env");

const googleClient = new OAuth2Client(env.googleClientId);

module.exports = { googleClient };
