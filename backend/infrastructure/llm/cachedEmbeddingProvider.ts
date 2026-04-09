import crypto from "node:crypto";
import { InMemoryCache } from "../../shared/cache/inMemorycache";
import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";
import { logger } from "../../shared/logger/logger";

const embeddingCache = new InMemoryCache<number[]>(
  10 * 60 * 1000 // 10 minutes
);

export class CachedEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly provider: EmbeddingProvider) {}

  async embed(text: string): Promise<number[]> {
    const key = crypto.createHash("sha256").update(text).digest("hex");

    const cached = embeddingCache.get(key);
    if (cached) {
      logger.debug("embedding cache hit");
      return cached;
    }

    logger.debug("embedding cache miss");
    const embedding = await this.provider.embed(text);
    embeddingCache.set(key, embedding);

    return embedding;
  }
}
