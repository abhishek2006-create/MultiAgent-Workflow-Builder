# Local development setup

## Prerequisites

- Node.js and npm compatible with the repository lockfile.
- Docker Desktop with its Linux container engine running.
- Python 3.12 or 3.13 for a clean install of the AI service.
- An OpenAI or Gemini API key for the provider selected in an agent, LLM, or reviewer node.

## Configure local environment files

From the repository root, copy templates only where a local file does not already exist. Keep existing `.env` files and credentials intact.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
if (-not (Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
```

Set a random development `JWT_SECRET` in `apps/api/.env`. The API loads the root `.env` before `apps/api/.env`, and inherited process environment variables take precedence over both. Keep `AI_SERVICE_SECRET` identical in the root `.env`, `apps/api/.env`, and `apps/ai/.env`. For local API runs, set `AI_SERVICE_URL=http://127.0.0.1:8000` in the root `.env`; Compose sets its internal URL automatically. Set `OPENAI_API_KEY` for GPT nodes and `GEMINI_API_KEY` for Gemini nodes in the AI service environment. For Compose runs, set provider keys in the root `.env`; for local AI service runs, set them in `apps/ai/.env`. Keep the root `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values aligned with the credentials and database in `apps/api/.env`. Password login and deterministic workflows do not need a provider key.

## Start the application

Install JavaScript dependencies once:

```powershell
npm install
```

The API dev-start hook starts PostgreSQL using `docker-compose.db.yml`, waits for its health check, and applies pending Prisma migrations before Nest starts. In one terminal at the repository root:

```powershell
npm run dev:api
```

In a second terminal, run the Next.js app:

```powershell
npm --workspace apps/web run dev
```

If you want to run agent nodes, configure `GEMINI_API_KEY` and the matching `AI_SERVICE_SECRET` in the root `.env`, then start the AI container from the repository root:

```powershell
docker compose up --build -d ai
docker compose logs -f ai
```

For a local AI process instead of Docker, open another terminal and run:

```powershell
cd apps/ai
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Keep this process running while executing workflows. The API uses the local URL `http://127.0.0.1:8000` from the root `.env`.

The browser uses `http://localhost:3000`; Nest listens on `http://localhost:3001`; FastAPI listens on `http://localhost:8000`. Check `GET /api/health/ready` through the Next proxy and `GET /ai/health` on FastAPI. If only the database needs to be started, run `npm run db:up`; stopping it with `npm run db:stop` preserves the named database volume.

## Verify authentication and workflow execution

1. Open `http://localhost:3000/signup`, create an account, and confirm the protected dashboard loads.
2. Sign out and sign back in to verify the persisted session flow.
3. Create a workflow containing Input → Approval → Output, then run it.
4. Confirm the active node and incoming edge animate, the execution pauses for approval, and approving resumes the run.
5. For a provider-backed workflow, configure the API key for the selected model and use an Agent, LLM, or Reviewer node.

For the API graph and retry unit checks, run `npm --workspace apps/api test`. For the full local verification record and known limits, see [the testing report](implementation/testing-report.md) and [the operations runbook](implementation/operations-runbook.md).

## Current functional boundaries

- Input, Output, Agent, LLM, Reviewer, Human Approval, Condition, and calculator, text, JSON, and date tool nodes are executable. Input and output nodes can use bounded JSON Schemas; AI nodes can set a 1–60 second timeout. Condition routing uses the green true and red false handles. Up to four independent ready nodes run concurrently, and joins wait for their parents. HTTP, search, database, file, MCP, code-execution, and local-device tools are not enabled.
- Failed runs can be retried manually from the editor. A retry is a new record pinned to the original workflow snapshot; it does not overwrite the failed run.
- Active runs can be cancelled. A running provider call may continue until its request returns; the worker stops at its next lease checkpoint. Worker lease recovery is at-least-once, so an AI provider call can repeat after a process crash between provider response and database commit.
- Live Gemini output requires an operator-provided key and matching API/AI service secret. The dashboard shows provider-reported token counts for the latest 10 runs and does not estimate cost.
- Workflow JSON import is validated by the API. Export filters credential-like fields. The app does not accept imported workflows for automatic execution.
- This document covers local setup only. Production deployment is documented separately and is outside the current implementation scope.
