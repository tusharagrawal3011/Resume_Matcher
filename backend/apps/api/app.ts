import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import router from "./routes";
import { createApiKeyMiddleware } from "./middleware/apiKeyAuth";
import { requestLogger } from "./middleware/requestLogger";
import { toPositiveNumber } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { openApiSpec } from "./docs/openapi";
import { getMongoClient } from "../../infrastructure/db/mongodbClient";
import { getRedisConnection } from "../../queues/redisConnection";
import IORedis from "ioredis";

async function checkMongo(): Promise<void> {
  const client = await getMongoClient();
  await client.db("admin").command({ ping: 1 });
}

async function checkRedis(): Promise<void> {
  const conn = getRedisConnection();
  const redis = "url" in conn && conn.url ? new IORedis(conn.url) : new IORedis(conn);
  try {
    await redis.ping();
  } finally {
    redis.disconnect();
  }
}

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

  app.use(requestLogger());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", async (_req, res) => {
    const checks = await Promise.allSettled([
      checkMongo(),
      checkRedis()
    ]);

    const mongo = checks[0].status === "fulfilled" ? "ok" : "error";
    const redis = checks[1].status === "fulfilled" ? "ok" : "error";
    const overall = mongo === "ok" && redis === "ok" ? "ok" : "degraded";

    res.status(overall === "ok" ? 200 : 503).json({
      status: overall,
      dependencies: { mongo, redis }
    });
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
