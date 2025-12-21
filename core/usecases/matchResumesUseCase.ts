import { EmbeddingProvider } from "../interfaces/embeddingProvider";
import { VectorSearchProvider } from "../interfaces/vectorSearchProvider";
import { LLMProvider } from "../interfaces/llmProvider";
import { MatchResumesInput, MatchResumesOutput } from "./matchResumesTypes";
import { CandidateMatch } from "../domain/candidateMatch";
import { MatchEvaluator } from "../../services/matchEvaluator";

export class MatchResumesUseCase {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorSearchProvider: VectorSearchProvider,
    private readonly llmProvider: LLMProvider
  ) {}

  async execute(input: MatchResumesInput): Promise<MatchResumesOutput> {
    const { job, resumes, topK = 3 } = input;

    // Embed JD
    const jobEmbedding = await this.embeddingProvider.embed(job.content);

    // Retrieve candidates semantically
    const retrieved = await this.vectorSearchProvider.search(
      jobEmbedding,
      Math.min(topK, resumes.length)
    );

    const resumeMap = new Map(resumes.map(r => [r.id, r]));
    const matches: CandidateMatch[] = [];
    const evaluator = new MatchEvaluator();

    //  LLM comparison
    for (const candidate of retrieved) {
      const resume = resumeMap.get(candidate.id);
      if (!resume) continue;

      const result = await this.llmProvider.compare(
        job.content,
        resume.content
      );

      const evaluation = evaluator.evaluate({
         vectorScore: candidate.score,
         llmScore: result.score
      });

       if (evaluation.decision !== "REJECTED") {
    matches.push({
      resumeId: resume.id,
      score: evaluation.finalScore,
      decision: evaluation.decision,
      explanation: result.explanation
    });
  }
    }

    // Final ranking (only valid candidates remain)
    matches.sort((a, b) => b.score - a.score);

    return { matches };
  }
}
