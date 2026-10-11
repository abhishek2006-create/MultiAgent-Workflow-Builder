# Testing report

## Executed checks

| Check | Result | Notes |
| --- | --- | --- |
| `npm --workspace apps/api run build` | Passed | Nest API, Prisma types, AI client, worker, and approval routes compile. |
| `npm --workspace apps/api test` | Passed | Builds the API then runs nine Node built-in tests for graph validation, condition/calculator runtime, and safe retry behavior. |
| API dev database lifecycle hook | Passed | Starts the isolated PostgreSQL-only Compose file, waits for readiness, and applies pending migrations before API dev startup. |
| `npm --workspace apps/web run build` | Passed | Existing CSS import-order and unused `setNodes` warnings remain. |
| `npm --workspace apps/api run db:migrate:deploy` | Passed | PostgreSQL was started from the local Compose service; all 8 migrations were already applied. |
| PostgreSQL container readiness | Passed | `pg_isready` accepted connections and `/api/health/ready` returned 200 through the Next proxy. |
| `apps/ai/.venv/Scripts/python.exe -m compileall -q apps/ai/app` | Passed | Python syntax only. |
| `PYTHONPATH=apps/ai apps/ai/.venv/Scripts/python.exe -m unittest discover -s apps/ai/tests -v` | Passed (3 tests) | Internal secret rejection, invalid request rejection, and missing Gemini key response. No real Gemini call. |
| Next proxy `GET /api/health/ready` | Passed (200) | API and local PostgreSQL reported ready. |
| Next proxy `GET /api/auth/me` without a session | Passed (401) | Expected protected endpoint behavior. |
| API login without Origin / with configured Origin | Passed (403 / 401) | Missing Origin is denied; allowed Origin reaches credential validation for a deliberately nonexistent identity. |
| End-to-end signup → profile → input/output workflow → logout | Passed | Unique temporary account through Next proxy; both persisted steps completed and all temporary records were deleted. |
| End-to-end human approval pause/resume | Passed | Temporary workflow paused as `WAITING_APPROVAL`, owner approved it, worker resumed to `COMPLETED`; test data was deleted. |
| Lease-backed approval pause/resume | Passed | Repeated after the worker lease migration; approval released the first lease, resume acquired a lease, and all three steps completed. Temporary identity/workspace cleanup was confirmed. |
| Expired worker lease recovery | Passed | A `RUNNING` execution with an expired lease owned by a fake stopped worker was reclaimed and completed by the live worker. |
| Failed execution retry through editor API | Passed | An authenticated run failed on an unsupported node; retry created a separate failed run linked to the original and preserved its workflow version and input. Temporary account/workspace data was deleted. |
| Conditional branch execution | Passed | Authenticated input selected the true edge, completed its output node, and persisted the false output as `SKIPPED`. Temporary account/workspace data was deleted. |
| Database startup recovery | Passed | Started the stopped PostgreSQL service without resetting its named volume; API and web proxy readiness returned 200. |
| Prior phase account/workspace/workflow/version/execution manual checks | Passed | See phase 9–12 implementation notes; these used temporary identities and were cleaned up. |

## Environment notes

The AI virtual environment is Python 3.14.7; `apps/ai/pyproject.toml` specifies Python 3.12–3.13. An editable install correctly refused that environment. The declared SDK and LangGraph were installed into the existing venv to run local tests, but a clean install must use Python 3.12 or 3.13. The environment has no Gemini API key configured, so provider generation, quota behavior, latency, and token accounting are not verified.

## Missing quality gates

There is no API Jest setup, frontend test runner, browser E2E suite, isolated database test target, or AI evaluation dataset in the repository. Worker completion, approval pause/resume, and expired-lease recovery were manually checked against the local database; retry and safe node-runtime semantics are covered by service-level tests, while authorization matrices, duplicate job claims, oversized body rejection, and provider failure cases still need broader coverage.

## Current phase 17–18 status

Worker heartbeat/lease persistence and scoped stale-job recovery are implemented. A running job can be recovered only when its lease is missing or expired; active leases are not reset. The workflow editor polls every 250 ms and animates the current node and incoming edge, then replays completed nodes sequentially. Condition routing and calculator evaluation are covered by unit tests, and conditional routing also passed a live database-backed branch test. These behaviors passed the live checks listed above and the API/web builds.

## Existing warnings and failed attempts

- Web build warns that a Google Fonts `@import` appears after CSS rules, and that `setNodes` is unused in `WorkflowBuilder.tsx`.
- `git diff --check` reports preexisting whitespace in `auth.controller.ts`, `web/lib/api.ts`, and `web/types/workflow.ts`.
- `pip install -e apps/ai` was not compatible with the only installed interpreter (3.14.7), due to the declared `<3.14` constraint. Installing individual declared runtime dependencies allowed the targeted tests to run.
