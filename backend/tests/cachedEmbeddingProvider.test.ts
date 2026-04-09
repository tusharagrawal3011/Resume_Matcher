import test from "node:test";
import assert from "node:assert/strict";
import { CachedEmbeddingProvider } from "../infrastructure/llm/cachedEmbeddingProvider";
import { EmbeddingProvider } from "../core/interfaces/embeddingProvider";

function makeCountingProvider(): { provider: EmbeddingProvider; callCount: () => number } {
  let calls = 0;
  const provider: EmbeddingProvider = {
    async embed(_text: string) {
      calls++;
      return [calls * 0.1];
    }
  };
  return { provider, callCount: () => calls };
}

test("calls inner provider on first embed", async () => {
  const { provider, callCount } = makeCountingProvider();
  const cached = new CachedEmbeddingProvider(provider);
  await cached.embed("hello");
  assert.equal(callCount(), 1);
});

test("returns cached result on second call with same text", async () => {
  const { provider, callCount } = makeCountingProvider();
  const cached = new CachedEmbeddingProvider(provider);
  const first = await cached.embed("hello");
  const second = await cached.embed("hello");
  assert.deepEqual(first, second);
  assert.equal(callCount(), 1); // inner called only once
});

test("calls inner provider again for different text", async () => {
  const { provider, callCount } = makeCountingProvider();
  const cached = new CachedEmbeddingProvider(provider);
  await cached.embed("hello");
  await cached.embed("world");
  assert.equal(callCount(), 2);
});

test("different texts return different embeddings", async () => {
  const { provider } = makeCountingProvider();
  const cached = new CachedEmbeddingProvider(provider);
  const a = await cached.embed("foo");
  const b = await cached.embed("bar");
  assert.notDeepEqual(a, b);
});
