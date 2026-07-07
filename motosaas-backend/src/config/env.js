require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 4007),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "replace-with-a-secure-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  swaggerServerUrl: process.env.SWAGGER_SERVER_URL || "http://localhost:4007",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  realtimeServiceUrl: process.env.REALTIME_SERVICE_URL || "",
  realtimeApiSecret: process.env.REALTIME_API_SECRET || "",
  logLevel: process.env.LOG_LEVEL || "info",
  logToFile: process.env.LOG_TO_FILE !== "false",
  syncDatabaseOnStart: process.env.SYNC_DATABASE_ON_START !== "false"
};

if (env.nodeEnv === "production" && env.jwtSecret.includes("replace-with")) {
  throw new Error("JWT_SECRET must be configured in production.");
}

module.exports = { env };
