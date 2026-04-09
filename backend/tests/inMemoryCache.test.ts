import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryCache } from "../shared/cache/inMemorycache";

test("returns null for missing key", () => {
  const cache = new InMemoryCache<string>(5000);
  assert.equal(cache.get("missing"), null);
});

test("returns stored value before TTL expires", () => {
  const cache = new InMemoryCache<number>(5000);
  cache.set("a", 42);
  assert.equal(cache.get("a"), 42);
});

test("returns null after TTL expires", async () => {
  const cache = new InMemoryCache<string>(50); // 50ms TTL
  cache.set("key", "value");
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(cache.get("key"), null);
});

test("overwrites an existing key", () => {
  const cache = new InMemoryCache<string>(5000);
  cache.set("k", "first");
  cache.set("k", "second");
  assert.equal(cache.get("k"), "second");
});

test("isolates different keys", () => {
  const cache = new InMemoryCache<number>(5000);
  cache.set("x", 1);
  cache.set("y", 2);
  assert.equal(cache.get("x"), 1);
  assert.equal(cache.get("y"), 2);
});
