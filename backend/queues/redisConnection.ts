import { toPositiveNumber, toStringOrDefault } from "../apps/api/config/env";

export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    // rediss:// requires explicit TLS options — without this ioredis
    // hangs the TLS handshake and eventually throws ETIMEDOUT (e.g. Upstash)
    const tls = redisUrl.startsWith("rediss://") ? { tls: {} } : {};
    return { url: redisUrl, ...tls };
  }

  return {
    host: toStringOrDefault(process.env.REDIS_HOST, "127.0.0.1"),
    port: toPositiveNumber(process.env.REDIS_PORT, 6379)
  };
}
