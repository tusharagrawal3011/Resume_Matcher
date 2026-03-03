# Resume Matcher Frontend

Next.js UI for:

- Queueing resume ingestion (`/ingest-resumes`)
- Running match queries (`/match`)
- Reviewing ranked candidate results

## Setup

1. Install dependencies

```bash
npm install
```

2. Create local env file

```bash
cp .env.local.example .env.local
```

3. Update `.env.local` if needed

- `NEXT_PUBLIC_API_BASE_URL` defaults to `http://127.0.0.1:3000`
- `NEXT_PUBLIC_API_KEY` should match backend `API_KEY`

## Run

```bash
npm run dev
```

Open:

- `http://127.0.0.1:3001` (or Next.js chosen port)

## Required Backend Services

Before using the UI, run backend:

1. `cd ../backend`
2. `npm run dev:worker`
3. `npm run dev:api`

Backend Swagger is available at:

- `http://127.0.0.1:3000/docs`
