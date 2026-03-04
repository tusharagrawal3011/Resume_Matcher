import { toPositiveNumber, toStringOrDefault } from "../apps/api/config/env";

export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    return { url: redisUrl };
  }

  return {
    host: toStringOrDefault(process.env.REDIS_HOST, "127.0.0.1"),
    port: toPositiveNumber(process.env.REDIS_PORT, 6379)
  };
}
