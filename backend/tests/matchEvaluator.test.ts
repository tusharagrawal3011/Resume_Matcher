import test from "node:test";
import assert from "node:assert/strict";
import { MatchEvaluator } from "../services/matchEvaluator";

const evaluator = new MatchEvaluator();

test("STRONG_MATCH when finalScore >= 0.75", () => {
  // 0.9 * 0.6 + 0.9 * 0.4 = 0.9
  const result = evaluator.evaluate({ vectorScore: 0.9, llmScore: 0.9 });
  assert.equal(result.decision, "STRONG_MATCH");
  assert.ok(result.finalScore >= 0.75);
});

test("POSSIBLE_MATCH when finalScore is between 0.55 and 0.75", () => {
  // 0.7 * 0.6 + 0.5 * 0.4 = 0.62
  const result = evaluator.evaluate({ vectorScore: 0.7, llmScore: 0.5 });
  assert.equal(result.decision, "POSSIBLE_MATCH");
  assert.ok(result.finalScore >= 0.55 && result.finalScore < 0.75);
});

test("REJECTED when finalScore < 0.55", () => {
  // 0.3 * 0.6 + 0.2 * 0.4 = 0.26
  const result = evaluator.evaluate({ vectorScore: 0.3, llmScore: 0.2 });
  assert.equal(result.decision, "REJECTED");
  assert.ok(result.finalScore < 0.55);
});

test("finalScore is weighted 60% vector + 40% LLM", () => {
  const result = evaluator.evaluate({ vectorScore: 0.8, llmScore: 0.6 });
  const expected = 0.8 * 0.6 + 0.6 * 0.4;
  assert.ok(Math.abs(result.finalScore - expected) < 0.0001);
});

test("exact boundary 0.75 is STRONG_MATCH", () => {
  // need finalScore == 0.75: vectorScore=0.75, llmScore=0.75
  const result = evaluator.evaluate({ vectorScore: 0.75, llmScore: 0.75 });
  assert.equal(result.decision, "STRONG_MATCH");
});

test("exact boundary 0.55 is POSSIBLE_MATCH", () => {
  // 0.55 * 0.6 + 0.55 * 0.4 = 0.55
  const result = evaluator.evaluate({ vectorScore: 0.55, llmScore: 0.55 });
  assert.equal(result.decision, "POSSIBLE_MATCH");
});
