require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "replace-with-a-secure-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  swaggerServerUrl: process.env.SWAGGER_SERVER_URL || "http://localhost:4000",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  logLevel: process.env.LOG_LEVEL || "info",
  logToFile: process.env.LOG_TO_FILE !== "false"
};

if (env.nodeEnv === "production" && env.jwtSecret.includes("replace-with")) {
  throw new Error("JWT_SECRET must be configured in production.");
}

module.exports = { env };
