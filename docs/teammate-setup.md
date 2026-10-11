<<<<<<< HEAD
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
=======
# Teammate setup and implementation order

## Start services

Copy `.env.example` to `.env` and set a long random `JWT_SECRET`. Install and start Ollama on the Windows host, then pull the model once:

```powershell
ollama pull qwen3:4b
```

The Compose AI container uses `OLLAMA_MODEL=qwen3:4b` and connects to Ollama at `http://host.docker.internal:11434`. `host.docker.internal` lets a container address the Windows host. Ollama normally listens only on localhost. If the AI container gets a connection-refused error after Ollama is running, Docker cannot reach that listener. Ollama's Windows instructions say to quit Ollama, add a user environment variable named `OLLAMA_HOST` with value `0.0.0.0:11434`, then relaunch it. This makes the Ollama API listen beyond localhost; only do this on a trusted development machine and restrict access with Windows Firewall. Restart the AI container after changing the setting.

Then run:

```powershell
npm install
docker compose up --build
```

Check `GET http://localhost:3001/health` and `GET http://localhost:8000/ai/health`. See `api-contracts.md` for the complete current request/response shapes.

## Implemented backend work

- Prisma models and a source-controlled initial migration for organizations, users, and workflows.
- NestJS Prisma provider, register/login routes, password hashing, signed bearer tokens, and a JWT guard.
- Organization-scoped workflow create/list/read/update routes with JSON Schema validation.
- FastAPI LangGraph node using LangChain's Ollama integration and the structured ChatResponse schema.
- Explicit 503 configuration, 504 timeout, and 502 provider/output errors.

## Manual PowerShell examples

```powershell
$register = Invoke-RestMethod -Method Post -Uri http://localhost:3001/auth/register -ContentType 'application/json' -Body '{"email":"agent@example.com","password":"replace-with-a-long-password","organizationName":"Demo Store"}'
$token = $register.access_token
$headers = @{ Authorization = "Bearer $token" }
$body = Get-Content .\examples\workflows\retail-order-help.json -Raw
$request = @{ name = 'Retail order help'; definition = ($body | ConvertFrom-Json -AsHashtable) } | ConvertTo-Json -Depth 30
$workflow = Invoke-RestMethod -Method Post -Uri http://localhost:3001/workflows -Headers $headers -ContentType 'application/json' -Body $request
Invoke-RestMethod -Method Get -Uri http://localhost:3001/workflows -Headers $headers
```

Replace the example email/password before reusing it. To call the AI service while Ollama is running and `qwen3:4b` is available, use:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/ai/chat -ContentType 'application/json' -Body '{"customer_message":"Where is my order?"}'
```

## Current boundaries

- The UI is not required to build or exercise the APIs; the examples above call them directly.
- The workflow routes save and retrieve graph definitions. They do not execute DAGs yet.
- The AI endpoint has no retail database or order tools. Its prompt explicitly avoids claiming an order lookup or change occurred.
- τ³-bench remains isolated under `eval/tau3`. Add its agent adapter once a workflow execution path can be evaluated end to end; do not make it a runtime dependency of the builder.
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
