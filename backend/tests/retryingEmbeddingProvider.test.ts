import test from "node:test";
import assert from "node:assert/strict";
import { RetryingEmbeddingProvider } from "../infrastructure/llm/retryingEmbeddingProvider";
import { EmbeddingProvider } from "../core/interfaces/embeddingProvider";

const VECTOR = [0.1, 0.2, 0.3];

function makeProvider(responses: Array<number[] | Error>): EmbeddingProvider {
  let call = 0;
  return {
    async embed() {
      const next = responses[call++];
      if (next instanceof Error) throw next;
      return next;
    }
  };
}

test("returns embedding on first success", async () => {
  const inner = makeProvider([VECTOR]);
  const provider = new RetryingEmbeddingProvider(inner, 2, 5000);
  const result = await provider.embed("hello");
  assert.deepEqual(result, VECTOR);
});

test("retries on failure and succeeds on second attempt", async () => {
  const inner = makeProvider([new Error("timeout"), VECTOR]);
  const provider = new RetryingEmbeddingProvider(inner, 2, 5000);
  const result = await provider.embed("hello");
  assert.deepEqual(result, VECTOR);
});

test("throws after exhausting all retries", async () => {
  const err = new Error("always fails");
  const inner = makeProvider([err, err, err]);
  // maxRetries=2 means 3 total attempts
  const provider = new RetryingEmbeddingProvider(inner, 2, 5000);
  await assert.rejects(() => provider.embed("hello"), /always fails/);
});

test("does not retry when maxRetries is 0", async () => {
  let calls = 0;
  const inner: EmbeddingProvider = {
    async embed() {
      calls++;
      throw new Error("fail");
    }
  };
  const provider = new RetryingEmbeddingProvider(inner, 0, 5000);
  await assert.rejects(() => provider.embed("x"), /fail/);
  assert.equal(calls, 1);
});
