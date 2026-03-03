import test, { after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../apps/api/app";
import { closeIngestionQueue } from "../queues/ingestionQueue";

function createSecuredApp() {
  process.env.REQUIRE_API_KEY = "true";
  process.env.API_KEY = "test-api-key";
  process.env.RATE_LIMIT_MAX = "100";
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  return createApp();
}

after(async () => {
  await closeIngestionQueue();
});

test("GET /health is public", async () => {
  const app = createSecuredApp();
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("POST /ingest-resumes requires API key", async () => {
  const app = createSecuredApp();
  const res = await request(app)
    .post("/ingest-resumes")
    .send({ resumes: [{ id: "res-1", content: "sample resume" }] });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Unauthorized");
});

test("POST /ingest-resumes validates payload with zod", async () => {
  const app = createSecuredApp();
  const res = await request(app)
    .post("/ingest-resumes")
    .set("x-api-key", "test-api-key")
    .send({ resumes: [{ id: "", content: "" }] });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid payload");
  assert.ok(Array.isArray(res.body.details));
});

test("POST /match validates required job payload with zod", async () => {
  const app = createSecuredApp();
  const res = await request(app)
    .post("/match")
    .set("x-api-key", "test-api-key")
    .send({ topK: 3 });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid payload");
  assert.ok(Array.isArray(res.body.details));
});
