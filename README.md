# AI Resume Matcher

## Project Overview
AI-powered recruiter workflow for resume ingestion, vector search, and explainable candidate ranking.

This monorepo includes:
- `backend/`: TypeScript API + async worker + queue + vector search
- `frontend/`: Next.js recruiter console

## Live Demo
- Frontend: `https://resume-matcher-five-mocha.vercel.app/`
- Backend API: `https://resume-matcher-ze4y.onrender.com`

## Quick System Walkthrough
1. Recruiter uploads one or more resumes in the frontend.
2. API accepts payload and enqueues an ingestion job in BullMQ.
3. Worker processes jobs asynchronously (parse -> embed -> persist vectors).
4. Job description is submitted for matching.
5. Vector retrieval + LLM evaluation produce ranked candidates and feedback.
6. Frontend renders scores, labels, explanations, and non-match improvements.

## Architecture Overview
```text
Frontend (Next.js - Vercel)
        |
        v
Backend API (Node.js - Render)
        |
        v
BullMQ Queue (Redis)
        |
        v
Worker Service (Railway/Render)
        |
        v
Embedding + LLM Processing (Gemini/Ollama)
        |
        v
MongoDB Atlas Vector Search
        |
        v
Ranked Candidate Results + Feedback
```

The API handles ingestion and match requests, while heavy processing is done asynchronously in workers through BullMQ. Workers parse resumes, generate embeddings, persist vectors in MongoDB Atlas, and support provider-swappable AI evaluation (`ollama` or `gemini`) via environment configuration.

## System Design Highlights
- Asynchronous processing with BullMQ workers for non-blocking ingestion.
- Vector retrieval with MongoDB Atlas Vector Search.
- Provider-swappable AI layer (`EMBEDDING_PROVIDER` / `LLM_PROVIDER`).
- Caching wrappers for repeated embedding and retrieval operations.
- Retry wrappers for embedding and LLM calls.
- Distributed deployment across Vercel, Render, Railway, MongoDB Atlas, and Upstash Redis.

## Tech Stack
- Frontend: Next.js, TypeScript
- Backend: Node.js, Express, TypeScript, Zod
- Queue: BullMQ + Redis
- Data: MongoDB Atlas Vector Search
- AI Providers: Gemini / Ollama
- Hosting: Vercel + Render + Railway

## API Endpoints
- `GET /health`
- `GET /openapi.json`
- `GET /docs`
- `POST /ingest-resumes`
- `GET /ingest-resumes/:jobId/status`
- `POST /match`

For full API schemas and examples, see `backend/README.md` and `/docs`.

## Setup Instructions
### Local Quick Start
1. Start backend:
- `cd backend`
- `npm install`
- `npm run dev:worker`
- in another terminal: `npm run dev:api`
2. Start frontend:
- `cd frontend`
- `npm install`
- `npm run dev`

Local URLs:
- Frontend: `http://127.0.0.1:3001`
- Backend docs: `http://127.0.0.1:3000/docs`

## Deployment Notes (Phase 1)
- Frontend on Vercel (`frontend/`)
- Backend API on Render (`backend/`)
- Worker on Render or Railway (`backend/`)
- Redis via Upstash/Render Redis
- MongoDB Atlas for vector storage

Required backend envs include:
- `MONGO_URI`
- `REDIS_URL`
- `EMBEDDING_PROVIDER`
- `LLM_PROVIDER`
- `GEMINI_API_KEY` (if Gemini)
- `OLLAMA_BASE_URL` (if Ollama)
- `API_KEY`
- `CORS_ALLOWED_ORIGINS`

Required frontend envs:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_KEY`

## Current Status
Phase 1 is complete and deployed:
- End-to-end flow works: upload -> queue -> process -> match.
- Cloud deployment working across API, worker, DB, and Redis.
- Provider-swappable backend is implemented and tested.

## Planned Improvements (Phase 2)
1. Observability:
- Structured logs, queue dashboard, job metrics, error monitoring.
2. Performance:
- Redis shared caching for expensive embedding/LLM calls.
3. Reliability:
- BullMQ retries, backoff, and dead-letter handling.
4. Security/Product:
- JWT auth, stronger secrets lifecycle, richer recruiter workflows.
