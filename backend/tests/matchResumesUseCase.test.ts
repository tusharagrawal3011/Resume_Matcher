import test from "node:test";
import assert from "node:assert/strict";
import { MatchResumesUseCase } from "../core/usecases/matchResumesUseCase";
import { EmbeddingProvider } from "../core/interfaces/embeddingProvider";
import { VectorSearchProvider, VectorSearchResult } from "../core/interfaces/vectorSearchProvider";
import { LLMProvider, LLMComparisonResult } from "../core/interfaces/llmProvider";

const MOCK_EMBEDDING = [0.1, 0.2, 0.3];

function makeEmbeddingProvider(): EmbeddingProvider {
  return { async embed() { return MOCK_EMBEDDING; } };
}

function makeVectorSearch(results: VectorSearchResult[]): VectorSearchProvider {
  return { async search() { return results; } };
}

function makeLlmProvider(score: number, explanation = "good match"): LLMProvider {
  return { async compare(): Promise<LLMComparisonResult> { return { score, explanation }; } };
}

test("returns matches for high-scoring candidates", async () => {
  const useCase = new MatchResumesUseCase(
    makeEmbeddingProvider(),
    makeVectorSearch([{ id: "res-1", score: 0.95, content: "senior engineer with 8 years" }]),
    makeLlmProvider(0.9)
  );

  const result = await useCase.execute({ job: { id: "job-1", content: "senior engineer role" } });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].resumeId, "res-1");
  assert.equal(result.nonMatches.length, 0);
});

test("puts low-scoring candidates in nonMatches", async () => {
  const useCase = new MatchResumesUseCase(
    makeEmbeddingProvider(),
    makeVectorSearch([{ id: "res-2", score: 0.2, content: "entry level intern" }]),
    makeLlmProvider(0.1)
  );

  const result = await useCase.execute({ job: { id: "job-1", content: "senior engineer role" } });

  assert.equal(result.matches.length, 0);
  assert.equal(result.nonMatches.length, 1);
  assert.equal(result.nonMatches[0].resumeId, "res-2");
});

test("matches are sorted by score descending", async () => {
  const useCase = new MatchResumesUseCase(
    makeEmbeddingProvider(),
    makeVectorSearch([
      { id: "res-a", score: 0.7, content: "developer with react" },
      { id: "res-b", score: 0.95, content: "senior engineer" },
      { id: "res-c", score: 0.8, content: "full stack engineer" }
    ]),
    makeLlmProvider(0.85)
  );

  const result = await useCase.execute({ job: { id: "job-1", content: "engineer" } });

  assert.ok(result.matches.length >= 2);
  for (let i = 1; i < result.matches.length; i++) {
    assert.ok(result.matches[i - 1].score >= result.matches[i].score);
  }
});

test("skips candidates with no content", async () => {
  const useCase = new MatchResumesUseCase(
    makeEmbeddingProvider(),
    makeVectorSearch([{ id: "res-empty", score: 0.9 }]), // no content field
    makeLlmProvider(0.9)
  );

  const result = await useCase.execute({ job: { id: "job-1", content: "engineer" } });

  assert.equal(result.matches.length, 0);
  assert.equal(result.nonMatches.length, 0);
});

test("uses content from resumes map when provided", async () => {
  let capturedResume = "";
  const llm: LLMProvider = {
    async compare(_job, resume) {
      capturedResume = resume;
      return { score: 0.9, explanation: "good" };
    }
  };

  const useCase = new MatchResumesUseCase(
    makeEmbeddingProvider(),
    makeVectorSearch([{ id: "res-1", score: 0.9 }]),
    llm
  );

  await useCase.execute({
    job: { id: "job-1", content: "engineer" },
    resumes: [{ id: "res-1", content: "override content from map" }]
  });

  assert.equal(capturedResume, "override content from map");
});

test("defaults topK to 3 when invalid value provided", async () => {
  let capturedTopK = 0;
  const vectorSearch: VectorSearchProvider = {
    async search(_vec, topK) {
      capturedTopK = topK;
      return [];
    }
  };

  const useCase = new MatchResumesUseCase(makeEmbeddingProvider(), vectorSearch, makeLlmProvider(0.9));
  await useCase.execute({ job: { id: "job-1", content: "engineer" }, topK: -5 });

  assert.equal(capturedTopK, 3);
});
