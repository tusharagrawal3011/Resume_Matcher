import { EmbeddingProvider } from "../interfaces/embeddingProvider";
import { VectorSearchProvider } from "../interfaces/vectorSearchProvider";
import { LLMProvider } from "../interfaces/llmProvider";
import { MatchResumesInput, MatchResumesOutput } from "./matchResumesTypes";
import { CandidateMatch } from "../domain/candidateMatch";
import { MatchEvaluator } from "../../services/matchEvaluator";
import { ConcurrencyLimiter } from "../../shared/concurrency/concurrencyLimiter";

type NonMatchFeedback = {
  resumeId: string;
  score: number;
  reason: string;
  improvementSuggestions: string[];
};

function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "have",
    "has",
    "are",
    "you",
    "your",
    "will",
    "our",
    "job",
    "role",
    "need",
    "looking",
    "experience"
  ]);

  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((token) => token.length > 2 && !stopwords.has(token))
    )
  );
}

function buildImprovementSuggestions(jobText: string, resumeText: string): string[] {
  const jobKeywords = extractKeywords(jobText);
  const resumeKeywords = new Set(extractKeywords(resumeText));
  const missing = jobKeywords.filter((keyword) => !resumeKeywords.has(keyword)).slice(0, 4);

  const suggestions: string[] = [];
  if (missing.length > 0) {
    suggestions.push(`Highlight or add evidence for: ${missing.join(", ")}.`);
  }
  suggestions.push("Quantify achievements using metrics relevant to the target role.");
  suggestions.push("Tailor the resume summary to align directly with this job description.");
  return suggestions.slice(0, 3);
}

export class MatchResumesUseCase {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorSearchProvider: VectorSearchProvider,
    private readonly llmProvider: LLMProvider
  ) {}

  async execute(input: MatchResumesInput): Promise<MatchResumesOutput> {
    const { job, resumes = [], resumeIds, topK = 3 } = input;
    const normalizedTopK = Number.isFinite(topK) && topK > 0 ? Math.floor(topK) : 3;

    // Embed JD
    const jobEmbedding = await this.embeddingProvider.embed(job.content);

    // Retrieve candidates semantically
    const retrieved = await this.vectorSearchProvider.search(jobEmbedding, normalizedTopK, {
      resumeIds
    });

    const resumeMap = new Map(resumes.map((r) => [r.id, r]));

    const evaluator = new MatchEvaluator();
    const limiter = new ConcurrencyLimiter(3);

    // Controlled parallel LLM evaluation
    const tasks: Promise<{ match: CandidateMatch | null; nonMatch: NonMatchFeedback | null }>[] =
      retrieved.map((candidate) =>
      limiter.run(async () => {
        const resume = resumeMap.get(candidate.id);
        const resumeContent = resume?.content ?? candidate.content;
        if (!resumeContent) {
          return { match: null, nonMatch: null };
        }

        const llmResult = await this.llmProvider.compare(job.content, resumeContent);

        const evaluation = evaluator.evaluate({
          vectorScore: candidate.score,
          llmScore: llmResult.score
        });

        if (evaluation.decision === "REJECTED") {
          return {
            match: null,
            nonMatch: {
              resumeId: resume?.id ?? candidate.id,
              score: evaluation.finalScore,
              reason: llmResult.explanation,
              improvementSuggestions: buildImprovementSuggestions(
                job.content,
                resumeContent
              )
            }
          };
        }

        return {
          match: {
            resumeId: resume?.id ?? candidate.id,
            score: evaluation.finalScore,
            decision: evaluation.decision,
            explanation: llmResult.explanation
          },
          nonMatch: null
        };
      }));

    const resolved = await Promise.all(tasks);

    const matches: CandidateMatch[] = resolved
      .map((item) => item.match)
      .filter((m): m is CandidateMatch => m !== null);

    const nonMatches: NonMatchFeedback[] = resolved
      .map((item) => item.nonMatch)
      .filter((m): m is NonMatchFeedback => m !== null);

    // Final ranking
    matches.sort((a, b) => b.score - a.score);
    nonMatches.sort((a, b) => b.score - a.score);

    return { matches, nonMatches };
  }
}
