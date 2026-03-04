import { Request, Response, NextFunction } from "express";

function toBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
}

export function createApiKeyMiddleware() {
  const requireApiKey = toBoolean(process.env.REQUIRE_API_KEY, false);
  const configuredApiKey = process.env.API_KEY?.trim();

  if (requireApiKey && !configuredApiKey) {
    throw new Error("REQUIRE_API_KEY is true but API_KEY is not set");
  }

  if (!configuredApiKey) {
    console.warn("API_KEY is not configured. Auth is disabled.");
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/health") {
      return next();
    }

    const provided = req.header("x-api-key");
    if (!provided || provided !== configuredApiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return next();
  };
}
