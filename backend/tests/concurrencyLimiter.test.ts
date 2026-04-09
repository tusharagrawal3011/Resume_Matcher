import test from "node:test";
import assert from "node:assert/strict";
import { ConcurrencyLimiter } from "../shared/concurrency/concurrencyLimiter";

test("runs a single task and returns its result", async () => {
  const limiter = new ConcurrencyLimiter(2);
  const result = await limiter.run(async () => 42);
  assert.equal(result, 42);
});

test("never exceeds the concurrency limit", async () => {
  const limit = 3;
  const limiter = new ConcurrencyLimiter(limit);
  let peak = 0;
  let active = 0;

  const tasks = Array.from({ length: 10 }, () =>
    limiter.run(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
    })
  );

  await Promise.all(tasks);
  assert.ok(peak <= limit, `Peak concurrency ${peak} exceeded limit ${limit}`);
});

test("queued tasks all complete", async () => {
  const limiter = new ConcurrencyLimiter(2);
  const results: number[] = [];

  await Promise.all(
    [1, 2, 3, 4, 5].map((n) =>
      limiter.run(async () => {
        results.push(n);
      })
    )
  );

  assert.deepEqual(results.sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test("propagates task errors without blocking the queue", async () => {
  const limiter = new ConcurrencyLimiter(1);

  await assert.rejects(
    () => limiter.run(async () => { throw new Error("task failed"); }),
    /task failed/
  );

  // Queue should still be usable after error
  const result = await limiter.run(async () => "ok");
  assert.equal(result, "ok");
});
