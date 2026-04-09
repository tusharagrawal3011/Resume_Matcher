import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../../../shared/logger/logger";

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startMs = Date.now();

    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      logger.info({
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startMs
      });
    });

    // Attach to req so route handlers can use it
    (req as Request & { requestId: string }).requestId = requestId;

    next();
  };
}
