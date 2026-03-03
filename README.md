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
