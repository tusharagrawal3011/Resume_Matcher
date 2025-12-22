import { LLMComparisonResult, LLMProvider } from "../../core/interfaces/llmProvider";
import { withTimeout } from "../../shared/utils/withTimeout";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class RetryingLLMProvider implements LLMProvider {
  constructor(
    private readonly provider: LLMProvider,
    private readonly maxRetries = 2,
    private readonly timeoutMs = 60_000
  ) {}

  async compare(
    job: string,
    resume: string
  ): Promise<LLMComparisonResult> {

    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        return await withTimeout(
          this.provider.compare(job, resume),
          this.timeoutMs
        );
      } catch (error) {
        attempt++;

        if (attempt > this.maxRetries) {
          console.error(
            "LLM Failed after retries:",
            (error as Error).message
          );
          throw error;
        }

        const backoffMs = 1000 * attempt;
        console.warn(
          `LLM Retry ${attempt} after ${backoffMs}ms`
        );

        await sleep(backoffMs);
      }
    }

    throw new Error("Unreachable");
  }
}
