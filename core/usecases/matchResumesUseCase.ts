import { EmbeddingProvider } from "../interfaces/embeddingProvider";
import { VectorSearchProvider } from "../interfaces/vectorSearchProvider";
import { LLMProvider } from "../interfaces/llmProvider";
import {
  MatchResumesInput,
  MatchResumesOutput
} from "./matchResumesTypes";
import { CandidateMatch } from "../domain/candidateMatch";
import { MatchEvaluator } from "../../services/matchEvaluator";
import { ConcurrencyLimiter } from "../../shared/concurrency/concurrencyLimiter";

export class MatchResumesUseCase {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorSearchProvider: VectorSearchProvider,
    private readonly llmProvider: LLMProvider
  ) {}

  async execute(
    input: MatchResumesInput
  ): Promise<MatchResumesOutput> {
    const { job, resumes = [], topK = 3 } = input;
    const normalizedTopK = Number.isFinite(topK) && topK > 0
      ? Math.floor(topK)
      : 3;

    // Embed JD
    const jobEmbedding = await this.embeddingProvider.embed(job.content);

    // Retrieve candidates semantically
    const retrieved = await this.vectorSearchProvider.search(
      jobEmbedding,
      normalizedTopK
    );

    const resumeMap = new Map(
      resumes.map(r => [r.id, r])
    );

    const evaluator = new MatchEvaluator();
    const limiter = new ConcurrencyLimiter(3);

    // Controlled parallel LLM evaluation
    const tasks: Promise<CandidateMatch | null>[] =
      retrieved.map(candidate =>
        limiter.run(async () => {
          const resume = resumeMap.get(candidate.id);
          const resumeContent = resume?.content ?? candidate.content;
          if (!resumeContent) return null;

          const llmResult = await this.llmProvider.compare(
            job.content,
            resumeContent
          );

          const evaluation = evaluator.evaluate({
            vectorScore: candidate.score,
            llmScore: llmResult.score
          });

          if (evaluation.decision === "REJECTED") {
            return null;
          }

          return {
            resumeId: resume?.id ?? candidate.id,
            score: evaluation.finalScore,
            decision: evaluation.decision,
            explanation: llmResult.explanation
          };
        })
      );

    const resolved: (CandidateMatch | null)[] =
      await Promise.all(tasks);

    // Type-safe filtering
    const matches: CandidateMatch[] = resolved.filter(
      (m): m is CandidateMatch => m !== null
    );

    // Final ranking
    matches.sort((a, b) => b.score - a.score);

    return { matches };
  }
}
