<div align="center">

# FlowForge AI

### MultiAgent Workflow Builder

**Build AI workflows visually. Connect agents and tools. Review every run.**

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com/)
[![Python](https://img.shields.io/badge/Python-3.12–3.14-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

[Features](#what-you-can-build) · [Setup](#set-up-locally) · [First workflow](#run-your-first-workflow-without-an-ai-key) · [Troubleshooting](#troubleshooting) · [Deployment](#deployment)

</div>

---

FlowForge AI is a visual application for creating workflows that combine AI agents, data tools, conditions and human approval. Arrange nodes on a canvas, connect their inputs and outputs, choose a model, and run the workflow with JSON input.

The application stores workflow versions, execution results, node errors and approval decisions in PostgreSQL. Its dashboard shows actual workspace activity and refreshes every five seconds while visible.

**You can try the editor, authentication and data-tool workflows without buying an AI API key.** Agent, LLM, Reviewer and Web Search nodes need access to their selected provider.

## A look inside

![FlowForge workflow editor with directional connections](docs/implementation/screenshots/workflow-direction.png)

*The workflow editor: connected agents, execution states and human approval.*

![Dashboard showing a completed calculator workflow](docs/implementation/screenshots/live-dashboard.png)

*Actual data from a temporary verification workspace: one completed calculator run. These figures are read from the database, not preset demo values.*

## Contents

- [What you can build](#what-you-can-build)
- [Architecture and technology](#architecture-and-technology)
- [Prerequisites](#prerequisites)
- [Set up locally](#set-up-locally)
- [Run your first workflow without an AI key](#run-your-first-workflow-without-an-ai-key)
- [Run an AI workflow](#run-an-ai-workflow)
- [Enable web search](#enable-web-search)
- [Optional Google and GitHub login](#optional-google-and-github-login)
- [Everyday commands](#everyday-commands)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Current scope](#current-scope)
- [Contributing](#contributing)

## What you can build

| Area | Available functionality |
| --- | --- |
| Visual editor | Add and configure nodes, connect branches, rename workflows, save versions, validate graphs, import/export JSON and duplicate saved workflows |
| AI agents | Planner, Research, Coding, Support and Reviewer roles; GPT/Gemini routing based on the selected model |
| Workflow execution | Parallel independent branches, dependency-aware joins, conditional routing, bounded node timeouts and retries |
| Human approval | Pause an execution, inspect its results, then approve or reject it |
| Data tools | Calculator, text transformations, JSON parsing/field access and date utilities |
| Web search | Optional Gemini-grounded search, source links and search suggestions |
| Execution history | Saved inputs, node results, errors, timing, pinned workflow versions, cancellation and retry |
| Dashboard | Workspace counts, execution states, success rate, recent activity and provider-reported token usage |
| Accounts | Email/password login, optional Google/GitHub OAuth, workspace switching, invitations and roles |
| Interface | Dark blue/purple styling, GSAP transitions, cursor effects and directional workflow animation with reduced-motion support |

For example:

```text
                         ┌── Research Agent ──┐
Input → Planner Agent ────┤                    ├→ Reviewer → Approval → Output
                         └── Coding Agent ────┘
```

A Research Agent analyzes the material passed to it. For live web evidence, add a **Web Search** node upstream.

## Architecture and technology

```mermaid
flowchart LR
    User[Browser] --> Web[Next.js frontend]
    Web -->|Same-origin /api proxy| API[NestJS API + execution worker]
    API --> DB[(PostgreSQL / Prisma)]
    API -->|Shared service secret| AI[FastAPI / LangGraph]
    AI --> Gemini[Gemini API]
    AI --> OpenAI[OpenAI API]
```

| Component | Technology | Responsibility |
| --- | --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, React Flow, Tailwind CSS, GSAP | Workflow canvas, forms, history, approvals and dashboard |
| API | NestJS 11, Prisma 6 | Authentication, workspace access, workflow versions and execution scheduling |
| AI service | Python, FastAPI, LangGraph, Pydantic | Provider requests, structured responses and grounded search |
| Database | PostgreSQL 16 | Accounts, workflows, execution steps, approvals and worker leases |
| Checks | Node test runner, Python unittest, GitHub Actions configuration | Automated checks and integration verification |

The NestJS worker executes the graph. The Python service handles AI requests. Both must stay running for AI workflows to complete.

## Prerequisites

Install the following before starting:

| Requirement | Recommended setup | Check |
| --- | --- | --- |
| Git | A current Git installation | `git --version` |
| Node.js and npm | Node.js **24**; use the included npm | `node --version` and `npm --version` |
| Python | **3.12, 3.13 or 3.14** | Windows: `py --version`; macOS/Linux: `python3 --version` |
| Docker | Docker Desktop on Windows/macOS, or Docker Engine with Compose on Linux | `docker version` and `docker compose version` |
| API key | Optional for the first data-tool test; required for provider-backed nodes | See [AI setup](#run-an-ai-workflow) |

Start Docker before running the application. On Windows, use Docker Desktop's Linux container engine.

> Run the commands below from the repository root unless a step says otherwise. Use either the Windows commands or the macOS/Linux commands for each step.

## Set up locally

### 1. Clone the repository

```bash
git clone https://github.com/abhishek2006-create/MultiAgent-Workflow-Builder.git
cd MultiAgent-Workflow-Builder
```

### 2. Install JavaScript dependencies

```bash
npm ci
```

This installs the frontend, API and shared workspace dependencies using the repository lockfile.

### 3. Create the Python virtual environment

**Windows — PowerShell:**

```powershell
py -3.14 -m venv apps/ai/.venv
.\apps\ai\.venv\Scripts\python.exe -m pip install --upgrade pip
.\apps\ai\.venv\Scripts\python.exe -m pip install -e ./apps/ai
```

If Python 3.12 or 3.13 is installed instead, replace `py -3.14` with `py -3.12` or `py -3.13` in the first command.

**macOS/Linux — Bash or Zsh:**

```bash
python3 --version
python3 -m venv apps/ai/.venv
./apps/ai/.venv/bin/python -m pip install --upgrade pip
./apps/ai/.venv/bin/python -m pip install -e ./apps/ai
```

Make sure `python3 --version` reports a supported version. If it does not, use an installed version such as `python3.12` for the `venv` command. On some Linux distributions, the matching Python `venv` package must be installed separately.

You do not need to activate the virtual environment: the project launch scripts use its Python executable directly.

### 4. Create environment files

These commands keep any existing local configuration intact.

**Windows — PowerShell:**

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
if (-not (Test-Path apps/ai/.env)) { Copy-Item apps/ai/.env.example apps/ai/.env }
if (-not (Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
```

**macOS/Linux:**

```bash
[ -f .env ] || cp .env.example .env
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
[ -f apps/ai/.env ] || cp apps/ai/.env.example apps/ai/.env
[ -f apps/web/.env.local ] || cp apps/web/.env.example apps/web/.env.local
```

### 5. Set local secrets and connection settings

Generate a random secret with this command. Run it **twice**, using a different result for each purpose:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

| Generated value | Put it here |
| --- | --- |
| First value: `JWT_SECRET` | Root `.env` and `apps/api/.env` |
| Second value: `AI_SERVICE_SECRET` | Root `.env`, `apps/api/.env` and `apps/ai/.env`; use **the same value** in all three files |

**`AI_SERVICE_SECRET` is a password you generate for communication between your services. It is not a Gemini or OpenAI API key.**

Keep these local values in the root `.env` and the API environment:

```dotenv
POSTGRES_USER=workflow
POSTGRES_PASSWORD=local_dev_only
POSTGRES_DB=workflow_builder
DATABASE_URL=postgresql://workflow:local_dev_only@localhost:5432/workflow_builder?schema=public
API_PORT=3001
WEB_ORIGIN=http://localhost:3002
AI_SERVICE_URL=http://127.0.0.1:8000
```

The sample database password is for local development. If you change it, change `DATABASE_URL` to match.

In `apps/ai/.env`, replace provider placeholders with your actual keys, or leave their values empty when testing without AI:

```dotenv
GEMINI_API_KEY=
OPENAI_API_KEY=
WEB_SEARCH_ENABLED=false
```

In `apps/web/.env.local`, keep:

```dotenv
NEXT_PUBLIC_API_URL=/api
API_INTERNAL_URL=http://127.0.0.1:3001
```

Important configuration details:

- The API reads the root `.env` before `apps/api/.env`. A value in the root file wins over the same variable in the API file.
- The local Python service reads **`apps/ai/.env`**. Adding a key only to the root `.env` will not configure the locally launched Python service.
- Existing shell environment variables take priority over values loaded from environment files.
- Keep API keys and secrets out of workflow JSON, runtime inputs and `NEXT_PUBLIC_*` variables.
- Google/GitHub OAuth credentials are optional. Email/password accounts work without them.
- Restart the affected services after editing environment files.

### 6. Prepare PostgreSQL and Prisma

With Docker running:

```bash
npm run db:up
npm run prisma:generate
npm run db:migrate:deploy
```

The database command uses `docker-compose.db.yml`. Migrations create/update the schema without resetting the existing database.

### 7. Start the application

```bash
npm run dev:all
```

Keep this terminal open. The launcher starts the frontend and API; the API launcher starts the local AI service if it is missing, or reuses an existing healthy one. The API's development startup also checks PostgreSQL and applies pending migrations.

| Service | Local address | Purpose |
| --- | --- | --- |
| Website | **http://localhost:3002** | Open this in your browser |
| API | http://localhost:3001/api | Frontend/backend requests |
| API readiness | http://localhost:3001/api/health/ready | Confirms API/database readiness |
| AI health | http://127.0.0.1:8000/ai/health | Confirms the Python service is running |

AI health is a liveness check; it does not prove that your provider key has credits or model access. Sign in and open **Settings** to see configured providers. A successful AI workflow is the end-to-end check.

To use separate terminals instead:

```bash
# Terminal 1: API, database startup and managed local AI
npm run dev:api
```

```bash
# Terminal 2: frontend
npm run dev
```

Do not run this pair alongside `npm run dev:all`; that would start duplicate services on the same ports.

Press **Ctrl+C** to stop the development launcher. PostgreSQL can remain running; `npm run db:stop` stops it while preserving its volume. An AI process that was already running before the launcher started is managed separately.

## Run your first workflow without an AI key

Use this check first to verify accounts, the editor, saved workflows, execution and the database.

1. Open **http://localhost:3002/signup** and create an email/password account.
2. Complete the consent checkbox if you agree to the displayed terms, then open your workspace.
3. Go to **Templates**.
4. Select **Parse structured JSON → Use template**.
5. Click **Validate**. The graph should be valid.
6. Click **Run Workflow** and replace the input with:

```json
{
  "json": "{\"project\":\"FlowForge AI\",\"ready\":true,\"steps\":3}"
}
```

7. Click **Start run**.
8. Confirm the execution reaches **COMPLETED** and its output contains the parsed `project`, `ready` and `steps` fields.
9. Open **History** to inspect its saved steps and results.
10. Open **Dashboard**. The run should appear in recent activity and execution counts. The dashboard refreshes every five seconds while visible; **Refresh** also updates it manually.

This workflow consumes no AI tokens. A zero token count for this run is expected.

## Run an AI workflow

### Configure a provider

Use your own provider account and API key:

- Gemini: [Google AI Studio](https://aistudio.google.com/).
- OpenAI: [OpenAI API platform](https://platform.openai.com/).

Set the matching key in **`apps/ai/.env`**, then restart the development services. Only the provider selected by a node needs a key. Configure both if you want to mix GPT and Gemini nodes in one workflow.

| Selected model prefix | Provider key |
| --- | --- |
| `gemini-*` | `GEMINI_API_KEY` |
| `gpt-*` | `OPENAI_API_KEY` |

The repository's example model identifiers include `gemini-3.5-flash-lite` and `gpt-5.5`. They are application defaults, not a guarantee of access for every provider account. If your account uses another supported model, update its provider model setting and allowlist in `apps/ai/.env`, restart Python, and select that model in the editor. Existing saved nodes keep their selected model until you change it.

Relevant settings are `GEMINI_MODEL`, `GEMINI_ALLOWED_MODELS`, `OPENAI_MODEL`, `OPENAI_ALLOWED_MODELS`, and optionally `AI_DEFAULT_MODEL`. API key presence alone does not verify billing, quota or model availability.

### Try a plan with approval

1. Go to **Templates → Plan with approval → Use template**.
2. Select the Planner node and choose a model your configured provider supports.
3. Click **Save**, then **Validate**.
4. Click **Run Workflow** and enter:

```json
{
  "request": "Plan a small student task tracker.",
  "context": "It needs a task title, due date, completion status and a simple dashboard.",
  "requirements": [
    "Give five short implementation steps",
    "Use only the supplied requirements",
    "Keep the response concise"
  ]
}
```

5. Start the run. It should pause at **WAITING_APPROVAL** after the Planner finishes.
6. Review the result and click **Approve** to continue to Output, or **Reject** to stop that approval path.
7. Inspect the saved execution in **History**.

### Import the order-total example

For a calculator, AI reviewer and approval example:

1. Go to **Templates → Import JSON**, or use **Import** in the builder.
2. Select [`examples/workflows/order-total-review.json`](examples/workflows/order-total-review.json).
3. Select **AI Review** and confirm its model matches a configured provider.
4. Save and validate the workflow.
5. Run it with [`examples/inputs/order-total-input.json`](examples/inputs/order-total-input.json), or paste:

```json
{
  "request": "Calculate and review my order total, then wait for my approval.",
  "price": 499,
  "quantity": 2,
  "delivery": 50
}
```

The Calculator should return **1048**: `499 × 2 + 50`. The AI reviewer then checks it, and the workflow waits for your decision before returning the final result.

### Reading the editor

- **Draft / Unsaved changes / Saving / Saved** reports persistence state. Save creates a persisted workflow version.
- **Validate** checks the current canvas, including unsaved changes.
- **Run Workflow** saves pending changes before starting an execution.
- Arrows show connection direction. Moving packets follow active branches; approval pauses stop their flow.
- Brief completed executions can replay their completed path. The replay label is visual feedback; node statuses keep their actual completed state.
- **History** shows persisted execution records. Retry creates a new execution using the failed run's pinned workflow snapshot.
- **Export** downloads workflow JSON. **Import** validates a workflow definition before saving it; it does not run the workflow automatically.

## Enable web search

Web search is optional and uses Gemini grounding even if other workflow nodes use GPT.

1. Add a valid `GEMINI_API_KEY` to `apps/ai/.env`.
2. Set `WEB_SEARCH_ENABLED=true` in that file.
3. Make sure `WEB_SEARCH_MODEL` is available to your account and included in `GEMINI_ALLOWED_MODELS`.
4. Restart the AI service/development launcher.
5. Choose **Templates → Web search with sources**.
6. Run with:

```json
{
  "query": "What is PostgreSQL used for? Prefer official documentation."
}
```

The execution returns a summary and source links. Search suggestions and source metadata are visible in the execution console/history when returned by the provider. Grounded search can have different quota or billing limits from ordinary text generation.

## Optional Google and GitHub login

Email/password login is sufficient for local testing. To enable OAuth, create an OAuth application with the provider and put its credentials in the API environment.

| Provider | Variables | Local callback URL |
| --- | --- | --- |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | `http://localhost:3001/api/auth/google/callback` |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | `http://localhost:3001/api/auth/github/callback` |

Register the exact callback with the provider, then restart the API. Use production HTTPS callbacks when deployed. If OAuth is unconfigured, the application reports that and email/password remains available.

## Everyday commands

Run from the repository root:

| Command | What it does |
| --- | --- |
| `npm ci` | Install locked JavaScript dependencies |
| `npm run dev:all` | Start frontend and managed API/AI development services |
| `npm run dev` | Start only the Next.js frontend on port 3002 |
| `npm run dev:api` | Start PostgreSQL/migrations, check or start local AI, then run Nest watch mode |
| `npm run dev:ai` | Start only the local Python AI service |
| `npm run db:up` | Start PostgreSQL and wait for its health check |
| `npm run db:stop` | Stop PostgreSQL without deleting its data volume |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run db:migrate:deploy` | Apply existing database migrations |
| `npm run prisma:migrate` | Create/apply migrations when developing schema changes |
| `npm test` | Run API, frontend and Python tests |
| `npm run test:integration` | Run isolated PostgreSQL/API integration checks with mocked AI |
| `npm run test:integration:live` | Run the integration flow with the live AI service; consumes provider quota |
| `npm --workspace apps/web run lint` | Check frontend lint |
| `npm run build:api` | Build the API |
| `npm --workspace apps/web run build` | Build the frontend for production |

Use `npm run dev:ai` only when deliberately managing Python separately or restoring a stopped AI service. Starting a second copy while port 8000 is occupied will fail.

## Testing

After completing setup:

```bash
npm test
npm --workspace apps/web run lint
npm run test:integration
```

- API and frontend tests cover validation, tool behavior, provider error handling, workspace-scoped metrics, save behavior and directional edges.
- Python tests cover the AI graph, structured output, error mapping and search handling using mocked providers.
- The integration test starts its own API and a fake AI HTTP service against a **unique migrated PostgreSQL schema**. It checks accounts, workflow versions, parallel execution, approval, retries, cancellation, stale-worker recovery and workspace isolation, then removes its own schema.
- Integration checks need PostgreSQL and a database account allowed to create/drop the isolated test schema. The local Compose account supports this; do not use an unnecessarily privileged production application account for tests.
- `npm run test:integration:live` explicitly calls the configured AI service. It requires working provider access and can consume tokens/quota.

The latest local verification recorded **57 API tests, 13 frontend tests and 27 Python tests**. Frontend lint, TypeScript checking, a production build and the isolated HTTP/database integration checks also passed. A browser check verified saving version 2, graph validation, a calculator result of 1048, approval and automatic dashboard updates. These are local verification results, not a claim that a hosted deployment or GitHub Actions run has already passed.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Can't reach database server at localhost:5432` | Start Docker, run `npm run db:up`, then check `docker compose -f docker-compose.db.yml ps`. Confirm `DATABASE_URL` matches the database credentials. |
| `AI service ... is unavailable` | Keep the dev terminal open. Check `/ai/health`, the virtual environment and `AI_SERVICE_URL`. If Python stopped while API stayed running, run `npm run dev:ai` separately and retry. |
| `AI service authentication failed` | Make `AI_SERVICE_SECRET` identical in root `.env`, `apps/api/.env` and `apps/ai/.env`. Restart API and AI. Remember root values and shell variables can override API file values. |
| `EADDRINUSE` on 3001/3002, or Windows `10048` on 8000 | A service already owns the port. Stop the duplicate terminal/process you started; run one copy of each service. Do not launch `dev:all` alongside the separate dev commands. |
| `AI service request timed out` | Read the AI terminal and full step error. Verify provider connectivity/quota, shorten instructions/output, and keep node timeouts within the supported 1–60 second range. The API HTTP timeout is a separate setting. |
| HTTP `429` | Check provider rate limits, credits, billing and model-specific quota. Ordinary Gemini generation and grounded search may have different limits. Retrying endlessly will not fix exhausted quota. |
| Provider key/model rejected | Configure the key for the selected `gpt-*` or `gemini-*` model. Check model access and its allowlist, restart Python, then update saved nodes if necessary. |
| Invalid structured output / AI HTTP `500` | Inspect the failed step and Python terminal. Use supported models, concise instructions and enough output tokens. Keep any safe error reference when reporting a bug; do not post keys or raw private prompts. |
| `Workflow not found` | Sign in to the workspace that owns the workflow. Use **Workflows** to open a saved item. `/workflows/demo` creates a new draft; it is not a stored workflow ID. |
| A change appears unsaved | Look for **Unsaved changes**, click **Save**, and wait for confirmation. If the canvas changed while saving, save the newer changes too. Read any API validation error shown in the editor. |
| Google/GitHub login is unavailable | Configure that provider's OAuth credentials/callback, or use email/password. |
| Dashboard is empty | Create/run a workflow in the current workspace. Empty workspaces have no execution activity. Failed refreshes are marked stale rather than replaced with invented data. |
| Key is present but an AI run still fails | Settings reports configured keys; it does not validate credits or every model. Run an AI workflow and read its provider-specific error. |

### Inspect ports on Windows

Use this to identify the owner before stopping a process:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3001,3002,8000 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Prefer **Ctrl+C** in the terminal that started the service. Avoid stopping unrelated processes.

### Windows frontend build reports `EPERM`

Stop a conflicting build and try a separate production output directory. From `apps/web`:

```powershell
$env:API_INTERNAL_URL='http://127.0.0.1:3001'
$env:NEXT_DIST_DIR='.next-verify'
npm run build
npm run start -- --port 3002
```

Keep the same `NEXT_DIST_DIR` for build and start. Development uses `.next-dev`. If port 3002 already has the dev frontend, stop it before starting the production frontend.

### Database password changed but login still fails

PostgreSQL initializes its credentials when the data volume is first created. Changing `.env` does not automatically change an existing database user's password. Use the existing credentials or deliberately update the database user; do not delete the data volume as a routine fix.

## Deployment

The project needs **three application services and PostgreSQL**. Railway is a practical first deployment option; Render or a Docker-capable server can also host the components. Keep the API worker on a persistent process so it can continue executing queued work.

| Component | Build/start guidance | Required configuration |
| --- | --- | --- |
| Frontend | From repo root: `npm ci`, then `npm --workspace apps/web run build`; start with `npm --workspace apps/web run start -- --hostname 0.0.0.0 --port 3002` | Set `API_INTERNAL_URL` to the reachable API origin **before building** and at runtime; keep `NEXT_PUBLIC_API_URL=/api`; expose port 3002 |
| API + worker | Use `apps/api/Dockerfile` with repository-root build context; it generates Prisma, builds, applies migrations and starts production Nest | `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `AI_SERVICE_URL`, matching `AI_SERVICE_SECRET`; configure `API_PORT` and the platform's target port consistently |
| AI | Use `apps/ai/Dockerfile` with `apps/ai` as build context | Provider keys, allowed models, shared secret and optional web-search settings; configure `AI_PORT`/target port consistently |
| Database | Provision persistent PostgreSQL | Supply its connection URL to the API; follow the host's TLS and backup requirements |

Production preparation:

1. Use separate, strong production secrets and platform-managed environment variables. Do not upload local `.env` files.
2. Use reachable service addresses: `localhost` inside a deployed container refers to that container, not another service.
3. Set `WEB_ORIGIN` to the exact public HTTPS frontend origin. The API supports a comma-separated list when needed.
4. Keep the AI service and database on private networking where available. The frontend talks to the API through its same-origin proxy.
5. Update OAuth callbacks to the deployed API HTTPS URL if OAuth is enabled.
6. Configure health checks and run a first data-tool workflow, then an AI workflow and an approval flow.
7. Confirm saved data survives service restarts and plan database backups.

`npm run dev:all` is for local development, not a production start command. Production API startup does **not** launch Python automatically. Hosting charges and AI provider charges are separate. The deployment configuration above is guidance; a hosted release has not been verified in this repository's local test record.

## Project structure

```text
MultiAgent-Workflow-Builder/
├── apps/
│   ├── web/                 # Next.js frontend and workflow editor
│   ├── api/                 # NestJS API, Prisma schema and execution worker
│   └── ai/                  # FastAPI/LangGraph provider service and tests
├── packages/contracts/      # Shared/provisional workflow JSON schema
├── examples/
│   ├── workflows/           # Importable workflow definitions
│   └── inputs/              # Runtime input examples
├── scripts/                 # Development launchers and integration checks
├── docs/                    # API, environment and implementation notes
├── eval/tau3/               # Separate location for future evaluation work
├── .github/workflows/       # CI configuration
├── docker-compose.db.yml    # PostgreSQL for local development
├── docker-compose.yml       # Containerized database, API and AI backend
└── README.md
```

## Current scope

The core visual builder, saved workflow versions, authentication, data tools, AI provider routing, approvals, execution history and database-backed dashboard are implemented and covered by local checks.

Keep these boundaries in mind:

- Provider access depends on the operator's key, credits and quota. A complete Gemini workflow has been verified locally; the most recent OpenAI generation and Gemini-grounded search checks returned quota errors. Those results describe the test account, not every account.
- Dashboard usage covers the **latest ten executions**. Success rate is `completed / (completed + failed)`; pending and cancelled runs are excluded. Provider costs are not estimated.
- Worker recovery is at-least-once: a provider request can be repeated if a process crashes after the provider responds but before its result is committed.
- Cancellation is recorded immediately, but an already-running provider request may continue until it returns or reaches its deadline.
- Coding agents generate code proposals; they do not provide an unrestricted code-execution sandbox.
- Arbitrary HTTP/database/file tools, a general MCP tool runtime and paired local-computer automation are not implemented.
- The `eval/tau3` directory is separate from the application; no benchmark score is claimed.

More detail: [current completion review](docs/implementation/completion-2026-10-28.md), [buttons and live metrics](docs/implementation/buttons-and-live-data.md), [environment reference](docs/implementation/environment-reference.md), and [API contracts](docs/api-contracts.md). Some older implementation notes are historical; use this README's commands for onboarding.

## Contributing

1. Fork the repository and create a branch for your change.
2. Complete local setup and reproduce the behavior you want to change.
3. Add relevant checks for behavior changes, run tests/lint, and keep secrets out of commits.
4. Open a pull request explaining the problem, the change and how you verified it.

For a bug report, include your operating system, Node/Python versions, reproduction steps and a sanitized error message. Never attach real API keys, session cookies or `.env` files.

---

Built by [Abhishek](https://github.com/abhishek2006-create) and [Adi Jain](https://github.com/AdiJainS). Source: [MultiAgent-Workflow-Builder](https://github.com/abhishek2006-create/MultiAgent-Workflow-Builder).
