import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import router from "./routes";
import { createApiKeyMiddleware } from "./middleware/apiKeyAuth";
import { toPositiveNumber } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { openApiSpec } from "./docs/openapi";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use(createApiKeyMiddleware());

  app.use(
    rateLimit({
      windowMs: toPositiveNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
      max: toPositiveNumber(process.env.RATE_LIMIT_MAX, 60),
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." }
    })
  );

  app.use("/", router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
