const fs = require("fs");
const path = require("path");
const winston = require("winston");
const { env } = require("./env");

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

if (env.logToFile) {
  fs.mkdirSync(path.join(process.cwd(), "logs"), { recursive: true });
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "app.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  );
}

const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: "motosaas-backend"
  },
  transports
});

module.exports = { logger };
