# FlowForge AI — MultiAgent Workflow Builder

A visual workflow application built with Next.js, NestJS, PostgreSQL/Prisma and a Python/FastAPI AI service. Build and save graphs, configure Gemini/GPT nodes, execute parallel branches, inspect persisted runs, approve human decisions, and use bounded data tools or Google-grounded web search.

## Services

- `apps/api`: NestJS API with PostgreSQL/Prisma-backed registration, login, and workflow CRUD
- `apps/ai`: FastAPI service with LangGraph routing selected `gpt-*` models to OpenAI and `gemini-*` models to Gemini for structured output
- `apps/web`: animated workflow editor, templates, history, approval inbox, dashboard and AI/workspace settings
- `packages/contracts`: provisional workflow JSON Schema
- `eval/tau3`: separate location for future τ³-bench evaluation setup

The Nest worker owns graph execution; Python owns provider calls. The `eval/tau3` environment remains separate from product services. See the [current completion review](docs/implementation/completion-2026-10-28.md) for verified functionality and remaining account/configuration limitations.

## Run locally

Use Node.js 24, Python 3.12–3.14, and Docker Desktop for local PostgreSQL. Install JavaScript dependencies with `npm ci`. Create `apps/ai/.venv` with `python -m venv apps/ai/.venv`, then install the AI package with `apps/ai/.venv/Scripts/python.exe -m pip install -e apps/ai` on Windows (`apps/ai/.venv/bin/python` on Linux/macOS).

Create local environment files from the examples only when they do not already exist. Set `DATABASE_URL`, `JWT_SECRET`, and matching `AI_SERVICE_SECRET` values in the root `.env` and `apps/ai/.env`; configure provider keys only on the server. Set `WEB_SEARCH_ENABLED=true` in the AI service environment to permit Google-grounded searches.

Start Docker Desktop, then from the repository root:

```powershell
npm run dev:all
```

Open **http://localhost:3002**. The API listens on 3001 and AI on 8000. The API startup applies pending migrations without resetting data. For separate terminals, use `npm run dev:api` (which also manages AI) and `npm run dev` (web). Use `npm run dev:ai` separately only when restoring a missing AI service or deliberately managing it yourself; the API launcher reuses it.

The API **development** command checks AI readiness and starts the local Python service if port 8000 has no AI service. It reuses an already-running AI service and checks the shared secret before starting Nest. `npm run dev:all` uses the same managed startup. Set `START_LOCAL_AI=false` only for deliberately running an API without AI; production startup never launches Python automatically.

Canvas arrows show source-to-target direction. Running branches display moving packets; paused approvals stop flow. Short completed runs replay their verified path with a `COMPLETED · PATH REPLAY` label, while node labels keep their actual completed state.

Health: `http://localhost:3001/api/health/ready` and `http://localhost:8000/ai/health`. Model/key status: sign in and open **Settings**. To run web search, use **Templates → Web search with sources** with `{"query":"your question"}`.

```powershell
npm test
npm run test:integration
```

Integration tests use a unique migrated PostgreSQL schema and a fake AI HTTP service, then clean up only that schema. `npm run test:integration:live` explicitly uses the configured live AI service and can consume provider quota.

Real Gemini generation is verified. The latest OpenAI generation and Gemini search checks returned HTTP 429; those features need account quota/credits before live calls can succeed. Optional paired desktop automation is not implemented. Deployment is excluded from the current work.

See [local setup](docs/implementation/local-development.md), [API contracts](docs/api-contracts.md), and [current verification](docs/implementation/completion-2026-10-28.md).
