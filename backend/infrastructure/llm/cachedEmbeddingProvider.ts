import crypto from "node:crypto";
import { InMemoryCache } from "../../shared/cache/inMemorycache";
import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";
import { logger } from "../../shared/logger/logger";

export class CachedEmbeddingProvider implements EmbeddingProvider {
  private readonly cache: InMemoryCache<number[]>;

  constructor(
    private readonly provider: EmbeddingProvider,
    ttlMs = 10 * 60 * 1000
  ) {
    this.cache = new InMemoryCache<number[]>(ttlMs);
  }

  async embed(text: string): Promise<number[]> {
    const key = crypto.createHash("sha256").update(text).digest("hex");

    const cached = this.cache.get(key);
    if (cached) {
      logger.debug("embedding cache hit");
      return cached;
    }

    logger.debug("embedding cache miss");
    const embedding = await this.provider.embed(text);
    this.cache.set(key, embedding);

    return embedding;
  }
}
