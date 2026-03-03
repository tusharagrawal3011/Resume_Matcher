import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import router from "./routes";
import { createApiKeyMiddleware } from "./middleware/apiKeyAuth";
import { toPositiveNumber } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { openApiSpec } from "./docs/openapi";

function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!configured) {
    return ["http://localhost:3001", "http://127.0.0.1:3001"];
  }

  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();
  const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key"],
    optionsSuccessStatus: 204
  };

  app.use(cors(corsOptions));
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
