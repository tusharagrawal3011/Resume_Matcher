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
- `backend/` API + worker on Render
- MongoDB Atlas
- Redis (Upstash or Render Redis)

### 1. Backend deploy (Render)

This repo includes [`render.yaml`](./render.yaml) with:

1. `resume-matcher-api` web service
2. `resume-matcher-worker` background worker

Set required env values in Render:

- `MONGO_URI`
- `REDIS_URL` (recommended for hosted Redis)
- `API_KEY`
- `CORS_ALLOWED_ORIGINS` (include your Vercel frontend URL)

Deploy command is managed by blueprint:

- Build: `npm install && npm run build`
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
