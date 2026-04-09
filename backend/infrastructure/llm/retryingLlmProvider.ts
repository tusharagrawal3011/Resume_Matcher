import { LLMComparisonResult, LLMProvider } from "../../core/interfaces/llmProvider";
import { withTimeout } from "../../shared/utils/withTimeout";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryingLLMProvider implements LLMProvider {
  constructor(
    private readonly provider: LLMProvider,
    private readonly maxRetries = 2,
    private readonly timeoutMs = 60_000
  ) {}

  async compare(job: string, resume: string): Promise<LLMComparisonResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        return await withTimeout(
          this.provider.compare(job, resume),
          this.timeoutMs,
          "LLM request timed out"
        );
      } catch (error) {
        lastError = error;
        if (attempt <= this.maxRetries) {
          const backoffMs = 1000 * attempt;
          console.warn(`LLM retry ${attempt} after ${backoffMs}ms`);
          await sleep(backoffMs);
        }
      }
    }

    console.error("LLM failed after retries:", (lastError as Error).message);
    throw lastError;
  }
}
