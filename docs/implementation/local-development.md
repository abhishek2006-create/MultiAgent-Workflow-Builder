# Local development

This is a local setup guide. For the detailed teammate walkthrough, see [docs/teammate-setup.md](../teammate-setup.md).

## Requirements

- Node.js/npm compatible with the lockfile.
- Docker Desktop with its engine running for PostgreSQL.
- Python 3.12 or 3.13 for the AI service. The current repository environment uses Python 3.14.7 and is outside the declared range.
- An OpenAI or Gemini API key for Agent, LLM, or Reviewer nodes, depending on the selected model.

## Environment

Copy `.env.example` to `.env` only when no local file exists. Create `apps/api/.env` and `apps/ai/.env` from their examples if needed. Keep real values out of Git. Configure a strong local `JWT_SECRET`, matching `AI_SERVICE_SECRET` values in the API and AI environments, and the provider key for the models you select: `OPENAI_API_KEY` for `gpt-*` models and `GEMINI_API_KEY` for `gemini-*` models. The API loads the root `.env` before `apps/api/.env`, and inherited process environment variables take precedence over both. For local runs, keep `AI_SERVICE_SECRET` consistent in the root `.env`, `apps/api/.env`, and `apps/ai/.env`; set `AI_SERVICE_URL=http://127.0.0.1:8000` in the root `.env` when running the API outside Compose. For Docker Compose, set the shared secret and provider keys in the root `.env`. The model selector offers `gpt-5.5`, `gpt-6-astra`, `gemini-3.8-flash`, and `gemini-3.5-flash-lite`; server-side allowlists can restrict each provider.

`AI_SERVICE_SECRET` is a shared service-to-service password you generate; it is not issued by Google. In PowerShell, generate 32 random bytes with:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Put the same generated value in the root `.env`, `apps/api/.env`, and `apps/ai/.env`. The AI service loads `apps/ai/.env` at startup; inherited environment variables override file values. Get `GEMINI_API_KEY` from [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key) and keep both provider keys only in the AI service environment. Never put credentials in `NEXT_PUBLIC_*` settings or workflow JSON.

## Start services

Install dependencies with `npm install`. Start PostgreSQL with `npm run db:up`, then apply migrations with `npm --workspace apps/api run db:migrate:deploy`.

In separate terminals, run:

```powershell
npm run dev:api
npm --workspace apps/web run dev
```

Start the AI service only if using agent nodes:

```powershell
cd apps/ai
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The web app runs at `http://localhost:3000`, the API at `http://localhost:3001`, and the AI service at `http://localhost:8000`. The AI service loads `apps/ai/.env` at startup; process and container environment variables take precedence over that file.

## Verify

- `GET /api/health/live` checks Nest liveness; `GET /api/health/ready` checks PostgreSQL readiness; `GET /ai/health` checks FastAPI liveness only.
- `npm test --prefix apps/api` builds the API and runs deterministic API utility/service tests.
- In a Python 3.12 or 3.13 environment, run `python -m unittest discover -s apps/ai/tests -v` from `apps/ai`.
- `npm run build --prefix apps/web` checks the production web build. If Windows reports `EPERM` while creating an `apps/web/.next/server/app` route directory, run from `apps/web`: `$env:NEXT_DIST_DIR='.next-verify'; npm run build`. Keep that environment variable set when running `npm run start` for the resulting build.
- `npx prisma validate --schema apps/api/prisma/schema.prisma` validates the schema without requiring a database connection.

Use an authenticated workspace account to create and save a workflow, validate it, run it with a JSON object, and inspect the persisted execution history. A Research Agent only analyzes supplied context; web search is not configured.

If an Agent, LLM, or Reviewer step fails, open the execution history to read the full step error. The workflow stops at that failed step because downstream nodes need its output. For local processes, set `AI_SERVICE_URL=http://127.0.0.1:8000` in the root `.env` because the API loads that file before `apps/api/.env`; keep `AI_SERVICE_SECRET` identical in the root `.env`, `apps/api/.env`, and `apps/ai/.env`. A selected `gpt-*` model needs `OPENAI_API_KEY`; a selected `gemini-*` model needs `GEMINI_API_KEY`. If an allowed-model variable is set, include the selected model in its matching list. Start the AI service and restart the API after changing environment files, then retry the failed run to create a fresh execution. For Docker Compose, the API-to-AI URL is already set to `http://ai:8000`; set `AI_SERVICE_SECRET` and the provider keys you use in the root `.env`, then recreate the API and AI containers. Never paste keys into workflow inputs or browser-visible settings.
