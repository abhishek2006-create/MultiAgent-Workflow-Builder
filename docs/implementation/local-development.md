# Local development

This is a local setup guide. For the detailed teammate walkthrough, see [docs/teammate-setup.md](../teammate-setup.md).

## Requirements

- Node.js/npm compatible with the lockfile.
- Docker Desktop with its engine running for PostgreSQL.
- Python 3.12, 3.13 or 3.14 for the AI service. The current Python 3.14.7 environment passes the AI test suite.
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
npm run dev
```

The API development command manages the AI service automatically. If an older API process is already running and AI is missing, run `npm run dev:ai` from the root in a separate terminal. For explicitly managing Python yourself, this equivalent command is available (avoid starting a second copy on the same port):

```powershell
cd apps/ai
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The web app runs at `http://localhost:3002`, the API at `http://localhost:3001`, and the AI service at `http://localhost:8000`. The AI service loads `apps/ai/.env` at startup; process and container environment variables take precedence over that file.

## Verify

- `GET /api/health/live` checks Nest liveness; `GET /api/health/ready` checks PostgreSQL readiness; `GET /ai/health` checks FastAPI liveness only.
- `npm test --prefix apps/api` builds the API and runs deterministic API utility/service tests.
- In a Python 3.12, 3.13 or 3.14 environment, run `python -m unittest discover -s tests -v` from `apps/ai`.
- `npm run build --prefix apps/web` checks the production web build. If Windows reports `EPERM` while creating an `apps/web/.next/server/app` route directory, run from `apps/web`: `$env:NEXT_DIST_DIR='.next-verify'; npm run build`. Keep that environment variable set when running `npm run start` for the resulting build.
- `npx prisma validate --schema apps/api/prisma/schema.prisma` validates the schema without requiring a database connection.

Use an authenticated workspace account to create and save a workflow, validate it, run it with a JSON object, and inspect the persisted execution history. A Research Agent only analyzes supplied context; web search is not configured.

If an Agent, LLM, or Reviewer step fails, open the execution history to read the full step error. The workflow stops at that failed step because downstream nodes need its output. For local processes, set `AI_SERVICE_URL=http://127.0.0.1:8000` in the root `.env` because the API loads that file before `apps/api/.env`; keep `AI_SERVICE_SECRET` identical in the root `.env`, `apps/api/.env`, and `apps/ai/.env`. A selected `gpt-*` model needs `OPENAI_API_KEY`; a selected `gemini-*` model needs `GEMINI_API_KEY`. If an allowed-model variable is set, include the selected model in its matching list. Start the AI service and restart the API after changing environment files, then retry the failed run to create a fresh execution. For Docker Compose, the API-to-AI URL is already set to `http://ai:8000`; set `AI_SERVICE_SECRET` and the provider keys you use in the root `.env`, then recreate the API and AI containers. Never paste keys into workflow inputs or browser-visible settings.

## One-command startup and current verification

The API development command now checks AI readiness first. `npm run dev:api` (or `npm --workspace apps/api run start:dev`) automatically starts Python when the configured localhost AI service is absent, waits for health, and checks the shared secret before Nest starts. An existing AI service is reused. Only services launched by that API wrapper are stopped with it. `npm run dev:all` starts the web and this managed API/AI stack; it does not launch a competing second AI process. `START_LOCAL_AI=false` explicitly opts into API-only development. Production startup remains externally managed.

If AI is stopped while using a previously started API, run `npm run dev:ai` in a separate terminal and retry the failed execution. Keep that terminal open. Use port 3002 for the web app; avoid starting duplicate API/web instances on occupied ports.

`npm run dev:all` starts API, AI and web together after checking their ports. Docker Desktop must be running. Ctrl+C stops the development services. `npm test` runs the deterministic suites from the root with the correct Python working directory. `npm run test:integration` uses a unique migrated PostgreSQL schema and mocked AI, then cleans up only that schema.

Web Search nodes require `WEB_SEARCH_ENABLED=true`, a Gemini key, and grounding quota. Configure the node with a fixed query or an input path such as `input.query`. Use the Web search with sources template and runtime input `{"query":"your question"}`. Ordinary Research nodes still analyze supplied context; connect a search tool upstream to supply web evidence. Source links and Google Search suggestions appear in the execution console and step history.

See [current completion and live verification](completion-2026-10-28.md). Both configured providers have keys, but the latest GPT generation and Google-grounded search requests returned provider HTTP 429. Gemini generation and the full default graph completed successfully.
