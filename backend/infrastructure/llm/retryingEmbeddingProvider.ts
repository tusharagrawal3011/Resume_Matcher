import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";
import { withTimeout } from "../../shared/utils/withTimeout";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryingEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly provider: EmbeddingProvider,
    private readonly maxRetries = 2,
    private readonly timeoutMs = 30_000
  ) {}

  async embed(text: string): Promise<number[]> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        return await withTimeout(
          this.provider.embed(text),
          this.timeoutMs,
          "Embedding request timed out"
        );
      } catch (error) {
        lastError = error;
        if (attempt <= this.maxRetries) {
          const backoffMs = 1000 * attempt;
          console.warn(`Embedding retry ${attempt} after ${backoffMs}ms`);
          await sleep(backoffMs);
        }
      }
    }

    console.error("Embedding failed after retries:", (lastError as Error).message);
    throw lastError;
  }
}
