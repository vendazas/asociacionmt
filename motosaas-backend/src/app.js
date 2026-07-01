const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const { env } = require("./config/env");
const { swaggerSpec } = require("./config/swagger");
const { requestLogger } = require("./middlewares/requestLogger.middleware");
const { notFoundMiddleware } = require("./middlewares/notFound.middleware");
const { errorMiddleware } = require("./middlewares/error.middleware");
const { router } = require("./routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(requestLogger);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = { app };
