import { EmbeddingProvider } from "../interfaces/embeddingProvider";
import { VectorSearchProvider } from "../interfaces/vectorSearchProvider";
import { LLMProvider } from "../interfaces/llmProvider";
import { MatchResumesInput, MatchResumesOutput } from "./matchResumesTypes";
import { CandidateMatch } from "../domain/candidateMatch";

const MIN_LLM_SCORE = 0.4; // hard rejection threshold

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

    //  LLM comparison
    for (const candidate of retrieved) {
      const resume = resumeMap.get(candidate.id);
      if (!resume) continue;

      const result = await this.llmProvider.compare(
        job.content,
        resume.content
      );

      // reject weak candidates
      if (result.score < MIN_LLM_SCORE) continue;

      matches.push({
        resumeId: resume.id,
        score: result.score,
        explanation: result.explanation
      });
    }

    // Final ranking (only valid candidates remain)
    matches.sort((a, b) => b.score - a.score);

    return { matches };
  }
}
