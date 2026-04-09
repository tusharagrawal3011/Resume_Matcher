import { NextFunction, Request, Response } from "express";
import { logger } from "../../../shared/logger/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: "Not Found",
    path: req.path
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, "Unhandled API error");
  res.status(500).json({ error: "Internal Server Error" });
}
