# Local development setup

## Prerequisites

- Node.js and npm compatible with the repository lockfile.
- Docker Desktop with its Linux container engine running.
- Python 3.12 or 3.13 for a clean install of the AI service.
- A Gemini API key if you want to execute agent, LLM, or reviewer nodes.

## Configure local environment files

From the repository root, copy templates only where a local file does not already exist. Keep existing `.env` files and credentials intact.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
if (-not (Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
```

Set a random development `JWT_SECRET` in `apps/api/.env`. Keep `AI_SERVICE_SECRET` identical in `apps/api/.env` and the root `.env`; set `GEMINI_API_KEY` in the root `.env` for live agent calls. Keep the root `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values aligned with the credentials and database in `apps/api/.env`. Password login and input/approval/output workflows do not need a Gemini key.

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

The browser uses `http://localhost:3000`; Nest listens on `http://localhost:3001`; FastAPI listens on `http://localhost:8000`. Check `GET /api/health/ready` through the Next proxy and `GET /ai/health` on FastAPI. If only the database needs to be started, run `npm run db:up`; stopping it with `npm run db:stop` preserves the named database volume.

## Verify authentication and workflow execution

1. Open `http://localhost:3000/signup`, create an account, and confirm the protected dashboard loads.
2. Sign out and sign back in to verify the persisted session flow.
3. Create a workflow containing Input → Approval → Output, then run it.
4. Confirm the active node and incoming edge animate, the execution pauses for approval, and approving resumes the run.
5. For a provider-backed workflow, configure a valid Gemini key and use an Agent, LLM, or Reviewer node.

For the API graph and retry unit checks, run `npm --workspace apps/api test`. For the full local verification record and known limits, see [the testing report](implementation/testing-report.md) and [the operations runbook](implementation/operations-runbook.md).

## Current functional boundaries

- Input, Output, Agent, LLM, Reviewer, Human Approval, Condition, and Calculator nodes are executable. Condition routing uses the green true and red false handles. HTTP, search, database, and code-execution tools, parallel branches, automatic retry/backoff, and running cancellation are not implemented yet.
- Failed runs can be retried manually from the editor. A retry is a new record pinned to the original workflow snapshot; it does not overwrite the failed run.
- Worker lease recovery is at-least-once. An AI provider call can repeat after a process crash between provider response and database commit.
- Live Gemini output requires an operator-provided key; no live provider generation was used for the automated tests.
- This document covers local setup only. Production deployment is documented separately and is outside the current implementation scope.
