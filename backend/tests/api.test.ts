import test, { after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../apps/api/app";
import { closeIngestionQueue, ingestionQueue } from "../queues/ingestionQueue";

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

test("GET /openapi.json returns OpenAPI spec", async () => {
  const app = createSecuredApp();
  const res = await request(app).get("/openapi.json");
  assert.equal(res.status, 200);
  assert.equal(res.body.openapi, "3.0.3");
  assert.equal(res.body.info.title, "Resume Matcher API");
});

test("GET /docs is publicly accessible", async () => {
  const app = createSecuredApp();
  const res = await request(app).get("/docs");
  assert.equal(res.status, 301);
});

test("OPTIONS preflight returns CORS headers for allowed origin", async () => {
  const app = createSecuredApp();
  const res = await request(app)
    .options("/ingest-resumes")
    .set("Origin", "http://localhost:3001")
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "content-type,x-api-key");

  assert.equal(res.status, 204);
  assert.equal(res.headers["access-control-allow-origin"], "http://localhost:3001");
});

test("POST /ingest-resumes requires API key", async () => {
  const app = createSecuredApp();
  const res = await request(app)
    .post("/ingest-resumes")
    .send({ resumes: [{ id: "res-1", content: "sample resume" }] });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Unauthorized");
});

test("GET /ingest-resumes/:jobId/status returns 404 for unknown job", async () => {
  const app = createSecuredApp();
  const res = await request(app)
    .get("/ingest-resumes/non-existent-job/status")
    .set("x-api-key", "test-api-key");

  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Ingestion job not found");
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
  const res = await request(app).post("/match").set("x-api-key", "test-api-key").send({ topK: 3 });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid payload");
  assert.ok(Array.isArray(res.body.details));
});

test("POST /ingest-resumes returns 500 when queue enqueue fails", async () => {
  const app = createSecuredApp();
  const originalAdd = ingestionQueue.add.bind(ingestionQueue);
  const mutableQueue = ingestionQueue as unknown as {
    add: typeof ingestionQueue.add;
  };

  const failingAdd: typeof ingestionQueue.add = async (_name, _data, _opts) => {
    throw new Error("queue unavailable");
  };
  mutableQueue.add = failingAdd;

  try {
    const res = await request(app)
      .post("/ingest-resumes")
      .set("x-api-key", "test-api-key")
      .send({ resumes: [{ id: "res-99", content: "sample resume" }] });

    assert.equal(res.status, 500);
    assert.equal(res.body.code, "INTERNAL_ERROR");
    assert.equal(res.body.error, "queue unavailable");
  } finally {
    mutableQueue.add = originalAdd;
  }
});

test("rate limiter returns 429 after limit is exceeded", async () => {
  process.env.REQUIRE_API_KEY = "true";
  process.env.API_KEY = "test-api-key";
  process.env.RATE_LIMIT_MAX = "1";
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  const app = createApp();

  const first = await request(app).post("/match").set("x-api-key", "test-api-key").send({
    topK: 3
  });
  assert.equal(first.status, 400);

  const second = await request(app).post("/match").set("x-api-key", "test-api-key").send({
    topK: 3
  });
  assert.equal(second.status, 429);
});
