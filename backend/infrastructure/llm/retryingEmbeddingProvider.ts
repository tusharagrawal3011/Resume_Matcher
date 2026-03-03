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
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        return await withTimeout(
          this.provider.embed(text),
          this.timeoutMs,
          "Embedding request timed out"
        );
      } catch (error) {
        attempt++;

        if (attempt > this.maxRetries) {
          console.error("Embedding failed after retries:", (error as Error).message);
          throw error;
        }

        const backoffMs = 1000 * attempt;
        console.warn(`Embedding retry ${attempt} after ${backoffMs}ms`);
        await sleep(backoffMs);
      }
    }

    throw new Error("Unreachable");
  }
}
