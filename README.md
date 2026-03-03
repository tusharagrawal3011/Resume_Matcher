# Resume Matcher Backend

Production-oriented TypeScript backend for:

- Resume ingestion (text or PDF base64)
- Embedding generation with Ollama
- Vector storage/search with MongoDB Atlas Vector Search
- LLM-assisted match scoring
- Queue-based ingestion worker with Redis/BullMQ

This document is a complete setup and run guide.

## 1. Prerequisites

Install these before running the project:

1. Node.js `>=20` and npm
2. Redis (local, Docker, or remote)
3. MongoDB Atlas cluster with vector search support
4. Ollama running locally on `http://127.0.0.1:11434`
5. Ollama models:
   - Embedding model: `nomic-embed-text`
   - LLM model: `llama3`

## 2. Project Setup

1. Clone repository

```bash
git clone <your-repo-url>
cd Resume_Matcher
```

2. Install dependencies

```bash
npm install
```

3. Create environment file

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Edit `.env` values

Required:

- `MONGO_URI`

Recommended:

- `PORT`
- `REQUIRE_API_KEY`
- `API_KEY`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

Example:

```env
MONGO_URI=mongodb+srv://user:password@cluster0.xxx.mongodb.net/?appName=Cluster0
PORT=3000
REQUIRE_API_KEY=true
API_KEY=your-secure-api-key
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
```

## 3. Start Infrastructure Services

### 3.1 Start Redis

Docker example:

```bash
docker run -d --name resume-redis -p 6379:6379 redis:latest
```

### 3.2 Start Ollama

Run Ollama service and pull models:

```bash
ollama pull nomic-embed-text
ollama pull llama3
```

## 4. Configure MongoDB Indexes

Run index bootstrap once (or whenever provisioning a new DB):

```bash
npm run db:ensure-indexes
```

This script creates:

1. Unique index on `resumeId`
2. Vector search index `vector_index_1` on `embedding` (dimension `768`, similarity `cosine`)

If index already exists, script exits safely.

## 5. Run the Application

### 5.1 Start ingestion worker

```bash
npm run dev:worker
```

### 5.2 Start API server

In another terminal:

```bash
npm run dev:api
```

API will run on `http://127.0.0.1:3000` by default.

## 6. Security and Rate Limiting

### API key auth

- If `API_KEY` is set, protected endpoints require header `x-api-key`.
- `/health` is always public.
- If `REQUIRE_API_KEY=true` and `API_KEY` is missing, server startup fails.

### Rate limiting

- Applied globally (including protected API routes)
- Configurable by:
  - `RATE_LIMIT_WINDOW_MS` (default `60000`)
  - `RATE_LIMIT_MAX` (default `60`)

## 7. API Endpoints

## `GET /health`

No auth required.

Response:

```json
{ "status": "ok" }
```

## `GET /openapi.json`

No auth required.

Returns the OpenAPI specification JSON used by Swagger UI.

## `GET /docs`

No auth required.

Interactive Swagger UI for API exploration and testing.

## `POST /ingest-resumes`

Auth: required when `API_KEY` is configured.

Request body:

```json
{
  "resumes": [
    {
      "id": "res-1",
      "content": "backend engineer with nodejs",
      "metadata": {
        "skills": ["Node.js", "MongoDB"],
        "yearsOfExperience": 4,
        "roleType": "backend"
      }
    },
    {
      "id": "res-2",
      "pdfBase64": "<base64-pdf-content>"
    }
  ]
}
```

Validation rules:

1. `resumes` must be a non-empty array
2. Each item must have `id`
3. Each item must have at least one of:
   - `content`
   - `pdfBase64`

Success response (`202`):

```json
{
  "status": "queued",
  "queue": "resume-ingestion",
  "jobId": "123"
}
```

## `POST /match`

Auth: required when `API_KEY` is configured.

Request body:

```json
{
  "job": {
    "id": "job-1",
    "content": "Looking for backend engineer with Node.js and Redis experience"
  },
  "topK": 3
}
```

Optional `resumes` can be provided to override/augment content lookup:

```json
{
  "job": { "id": "job-1", "content": "..." },
  "resumes": [{ "id": "res-1", "content": "..." }],
  "topK": 3
}
```

## 8. Quick Smoke Test (End-to-End)

Preconditions:

1. Redis running on `127.0.0.1:6379`
2. Mongo reachable with valid `MONGO_URI`
3. Ollama running with required models
4. Worker and API both running

### Step 1: Ingest sample resumes

```bash
curl -X POST http://127.0.0.1:3000/ingest-resumes \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secure-api-key" \
  -d '{
    "resumes": [
      {
        "id": "res-201",
        "content": "backend engineer with nodejs redis mongodb",
        "metadata": {
          "skills": ["Node.js", "Redis", "MongoDB"],
          "yearsOfExperience": 4,
          "roleType": "backend"
        }
      },
      {
        "id": "res-202",
        "content": "frontend engineer react typescript",
        "metadata": {
          "skills": ["React", "TypeScript"],
          "yearsOfExperience": 3,
          "roleType": "frontend"
        }
      }
    ]
  }'
```

### Step 2: Match against a job description

```bash
curl -X POST http://127.0.0.1:3000/match \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secure-api-key" \
  -d '{
    "job": {
      "id": "job-201",
      "content": "Looking for backend engineer with Node.js and Redis experience"
    },
    "topK": 3
  }'
```

Expected:

- HTTP `200`
- `matches` array with ranked candidates and score/decision/explanation

## 9. Run Tests

```bash
npm test
```

Current tests cover:

1. `/health` public access
2. API key protection on protected endpoint
3. Zod validation behavior for invalid ingestion payload
4. Zod validation behavior for invalid match payload

## 10. Build and Production Run

Build:

```bash
npm run build
```

Run API:

```bash
npm start
```

Run worker:

```bash
npm run start:worker
```

## 11. Troubleshooting

### `ENOTFOUND _mongodb._tcp...`

- Mongo Atlas cluster is stopped, DNS blocked, or URI host is wrong.
- Verify cluster is running and DNS resolves:
  - `nslookup <cluster-host>`

### Queue jobs stay pending

- Redis not running on `6379`
- Worker process not started

### `401 Unauthorized`

- Missing/incorrect `x-api-key`
- Or `API_KEY` differs from `.env`

### `429 Too many requests`

- Increase:
  - `RATE_LIMIT_MAX`
  - or `RATE_LIMIT_WINDOW_MS`

### Slow matching

- Ollama model warmup can be slow on first request.
- Check Ollama process and model availability.

## 12. Project Scripts

- `npm run dev:api` -> run API with ts-node-dev
- `npm run dev:worker` -> run worker with ts-node-dev
- `npm run db:ensure-indexes` -> create Mongo indexes
- `npm run build` -> compile TS to `dist/`
- `npm run lint` -> run ESLint for TypeScript sources
- `npm run lint:fix` -> run ESLint and auto-fix fixable issues
- `npm run format` -> run Prettier and rewrite files
- `npm run format:check` -> verify formatting without rewriting
- `npm start` -> run built API
- `npm run start:worker` -> run built worker
- `npm test` -> build + run Node tests on compiled outputs
