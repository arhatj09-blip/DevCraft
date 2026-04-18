# DevCraft

DevCraft is a full-stack project with:

- A Vite + React frontend in frontend/
- A Node + Express backend in backend/server/

## Prerequisites

- Node.js 18+
- npm

## Install

Install dependencies from the repository root:

```bash
npm install
```

## Run In Development

Start backend:

```bash
npm --prefix backend run dev
```

Start frontend:

```bash
npm --prefix frontend run dev
```

Notes:

- Backend entry point is backend/server/index.ts
- Frontend may auto-switch to a nearby port if the requested one is busy

## Build

Build the project from the root:

```bash
npm run build
```

## Environment

- Backend reads backend/.env first
- Root .env is used as a fallback

Copy backend/.env.example to backend/.env and fill required values.
