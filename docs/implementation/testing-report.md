# Testing report

Current verification: see [the October 28 completion review](completion-2026-10-28.md). The new root suites and isolated PostgreSQL smoke supersede the historical environment blockers below. The actual Planner 500 is covered by a regression test using the real LangGraph response state. Live Gemini completed the default graph; live GPT and Google-grounded search returned HTTP 429.

Final pass counts: **API 55/55, web client 6/6, Python 27/27**. Frontend lint/types/production build, development startup, eight database migrations, isolated-schema worker recovery/approval/authorization/search-tool smoke, and browser login/run/history refresh checks passed. CI configuration is provided but has not been executed on GitHub in this session. [Browser proof](screenshots/workflow-completed.png).

Startup/animation follow-up: **API 55/55 and web client 10/10**; lint, TypeScript and production build passed. Verified automatic local AI start before Nest, reuse of an existing AI service, and that stopping the reusing API leaves the shared AI service running. A real browser run completed all four Gemini agents and human approval with direction arrows, active connection packets and paused approval status. The temporary account/workflow was removed. [Direction proof](screenshots/workflow-direction.png).

Updated: 2026-10-17. This report distinguishes checks run in the current workspace from older database-backed checks recorded before this environment lost access to PostgreSQL.

## Checks run in this workspace

| Command | Result | Notes |
| --- | --- | --- |
| `npm test --prefix apps/api` | Passed: 49 tests | Builds NestJS first, then covers auth/workflow helpers, execution creation/cancellation/retry/history pagination, approval inbox scoping/pagination, graph validation/scheduling/retry policy, output schema validation, AI timeout bounds, built-in tools, input schemas, workflow import/export round-trip validation, and GPT model selection/forwarding. |
| `npm run lint --prefix apps/web` | Passed | ESLint reported no errors or warnings. |
| From `apps/web`: `$env:NEXT_DIST_DIR='.next-verify'; npm run build` | Passed | Next.js 15.5.27 compiled, checked types, generated 12 static pages including `/approvals`, and completed build tracing. CSS import-order warning is fixed. |
| `npx tsc --noEmit --pretty false` from `apps/web` | Passed | TypeScript check completed with no diagnostics. |
| `npm run build --prefix apps/web` (default `.next`) | Blocked by host | Next fails with `EPERM` creating `apps/web/.next/server/app/<route>`. A contained custom `NEXT_DIST_DIR` works; default output failure is reproducible on this Windows host. |
| `npx prisma validate --schema apps/api/prisma/schema.prisma` | Passed | Prisma schema validates without a database connection. |
| `docker compose config --quiet` and `docker compose -f docker-compose.db.yml config --quiet` | Passed | Used placeholder-only values for required Compose variables. No containers were started. |
| `apps/ai/.venv/Scripts/python.exe -m compileall -q app tests` from `apps/ai` | Passed | AI source and test syntax compile. |
| Targeted synchronous Python provider/schema tests | Passed: 6 tests | Provider selection, OpenAI structured response/usage parsing, Gemini usage metadata, and bounded request settings. No provider call. |
| `python -m unittest discover -s apps/ai/tests -v` | Blocked by host async runtime | The project venv is Python 3.14.7, outside the declared 3.12–3.13 range. The bundled Python 3.12.14 runtime also hangs on a minimal `asyncio.run(asyncio.sleep(0))` probe in this host, so async service tests could not be verified. Docker is unavailable. |
| `Test-NetConnection localhost -Port 5432` | Blocked | PostgreSQL is not listening on localhost:5432. |
| `docker info --format '{{.ServerVersion}}'` | Blocked | Docker CLI is present, but the Docker daemon is unavailable. |

The app's bundled `node_modules/next/dist/docs/` directory requested by `AGENTS.md` is absent in the installed Next package. The build-directory option was checked against the official Next.js documentation. The config defaults to `.next` and accepts only a safe single-directory name for `NEXT_DIST_DIR`.

## Historical database checks

The earlier report recorded authenticated signup/workflow creation, execution persistence, approval pause/resume, lease recovery, retry, and conditional routing against a live local PostgreSQL instance. Those checks are historical results and were not repeatable in the current workspace because neither PostgreSQL nor the Docker engine is available. Do not treat them as current-environment verification.

## Gemini and AI service

The configured OpenAI key was used without printing its value. `GET /v1/models` returned HTTP 200 and listed `gpt-5.5`; one minimal stored-disabled Responses request returned HTTP 429, so generation is blocked by the account/project quota or rate limit. Check OpenAI's [error-code guidance](https://developers.openai.com/api/docs/guides/error-codes) for the corresponding billing and rate-limit actions. No live Gemini request was made. Real provider operation still depends on the selected model's server-side key and allowlist, an `AI_SERVICE_URL` reachable from the API, and the same `AI_SERVICE_SECRET` in the API and AI service.

The research role analyzes supplied context. Web search is not configured, so the agent must not claim external research or citations. `AI service is not configured` indicates missing API/AI service settings; it does not confirm that a provider key can generate output. See [local-development.md](local-development.md) for setup and diagnosis.

## Remaining verification

- Run the full async Python API/agent suite with Python 3.12 or 3.13.
- Start PostgreSQL, apply migrations without resetting data, and repeat authorization, worker, approval, cancellation, recovery, and parallel-node integration checks.
- Add a deterministic cross-service test and automated browser E2E flow; the repository has no frontend test runner or browser E2E suite.
- Run `apps/ai/tests/test_evaluations.py` and the full AI suite under Python 3.12 or 3.13; the evaluation cases are in `eval/agents/mock-cases.json` and use mocked provider responses.
- Resolve the OpenAI 429, then repeat the GPT-5.5 generation check; verify Gemini with a current operator-configured key.
- Deployment is outside this task and was not performed.
