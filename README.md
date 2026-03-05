# Resume Matcher Monorepo

This repository is split into:

- `backend/`: TypeScript API + worker + queue + vector search stack
- `frontend/`: Next.js application (App Router)

## Quick Start

1. Backend
   - `cd backend`
   - `npm install`
   - `npm run dev:worker`
   - in another terminal: `npm run dev:api`
   - API docs: `http://127.0.0.1:3000/docs`

2. Frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`
   - App: `http://127.0.0.1:3001` (or next available port)

For backend setup details, see `backend/README.md`.

## Phase 1 Deployment

Use:

- `frontend/` on Vercel
- `backend/` API on Render
- `backend/` worker on Render or Railway
- MongoDB Atlas
- Redis (Upstash or Render Redis)

### 1. Backend deploy (Render)

This repo includes [`render.yaml`](./render.yaml) with:

1. `resume-matcher-api` web service
2. `resume-matcher-worker` background worker

Set required env values in Render:

- `MONGO_URI`
- `REDIS_URL` (recommended for hosted Redis)
- `EMBEDDING_PROVIDER` (`ollama` or `gemini`)
- `LLM_PROVIDER` (`ollama` or `gemini`)
- `GEMINI_API_KEY` (when using Gemini)
- `OLLAMA_BASE_URL` (when using Ollama)
- `API_KEY`
- `CORS_ALLOWED_ORIGINS` (include your Vercel frontend URL)

Deploy command is managed by blueprint:

- Build: `NODE_ENV=development npm ci --include=dev && npm run build`
- API start: `npm run start`
- Worker start: `npm run start:worker`

### 2. Frontend deploy (Vercel)

Deploy `frontend/` as a separate project and set:

- `NEXT_PUBLIC_API_BASE_URL=https://<your-render-api-domain>`
- `NEXT_PUBLIC_API_KEY=<same backend API_KEY>`

### 3. Post-deploy smoke test

1. Open frontend URL
2. Upload resumes
3. Verify ingestion status reaches completed
4. Run match and confirm results render

## Current Status

Phase 1 is complete and deployed:

- Frontend live on Vercel
- Backend API deployed on Render
- Background worker deployed (queue processing enabled)
- Redis-backed BullMQ ingestion pipeline active
- Resume upload -> ingestion -> match flow working end-to-end
- Provider-swappable AI architecture in place (`ollama` / `gemini` via env)

## Planned Improvements (Phase 2)

1. Observability and monitoring
- Structured logging (request/job correlation)
- Queue dashboard and job-level metrics
- Better production error monitoring

2. Caching and performance
- Redis-based shared cache for expensive embedding/LLM calls
- Result caching for repeated resume-JD match requests

3. Reliability hardening
- BullMQ retry + exponential backoff policies
- Dead-letter flow for persistent failures
- Better failure diagnostics and recovery paths

4. Security and product maturity
- Move from API-key-in-client to JWT-based auth
- Better secret management and key rotation workflow
- Recruiter workflow polish and run history UX
