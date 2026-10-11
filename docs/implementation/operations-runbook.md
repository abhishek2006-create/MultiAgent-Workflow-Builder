# Operations runbook

## Health checks

- API liveness: `GET /api/health/live` should return 200 while Nest is running.
- API/database readiness: `GET /api/health/ready` should return 200 only when PostgreSQL accepts a query.
- AI liveness: `GET /ai/health` confirms FastAPI is responsive, not that Gemini credentials/quota are valid.
- Authentication smoke test: verify the Next `/api/auth/me` proxy returns 401 without a session, then verify login and logout in a browser with the configured origin.

## Local PostgreSQL startup

The API requires PostgreSQL at the host and port in `apps/api/.env` (`localhost:5432` in the local template). If Prisma reports that it cannot reach the database, start Docker Desktop and run `npm run db:up` from the repository root. This starts only the PostgreSQL service and preserves the `postgres_data` volume; it does not reset or delete database contents. Apply migrations with `npm --workspace apps/api run db:migrate:deploy`, then start the API with `npm --workspace apps/api run start:dev`. The API dev-start lifecycle performs both steps automatically when Docker is available. To stop PostgreSQL without removing its data, run `npm run db:stop`.

## Execution troubleshooting

1. Check the execution status and persisted step errors through the authenticated execution detail route and editor console.
2. `QUEUED` means the in-process API worker has not claimed the row; check API process health and database status.
3. `FAILED` at an agent step: check AI service availability, internal secret parity, Gemini key/model access, request timeout, and provider quota. The API deliberately does not expose upstream stack traces to the browser.
4. `WAITING_APPROVAL` means the run is paused; an authorized workspace member must resolve the pending approval in the workflow editor.
5. Workers renew a database lease every 10 seconds with a 60-second expiry. A queued run without a lease or a running run with a missing/expired lease can be claimed safely under a row lock. Before manually changing a run, inspect its lease and the step history; never clear an active, unexpired lease. Recovery is at-least-once: a provider request may be repeated if a worker crashes after the provider responds but before the step result is committed.
6. A failed run can be retried from the execution console. Retry creates a new execution pinned to the original version and input; it does not edit the failed execution's history.

## Secrets and logs

Rotate `JWT_SECRET` by planning for all active sessions to become invalid. Rotate `AI_SERVICE_SECRET` in the API and AI service together. Rotate OAuth/Gemini keys in their provider consoles and redeploy through the secret store. Structured API request logs record method, path, status, and duration; they must not contain request bodies, cookies, authorization values, prompts, or provider keys. Restrict access to container logs and database data.

## Current monitoring gaps

There is no metrics exporter, alerting integration, queue depth endpoint, provider token/cost capture, or automated restart monitoring. Leases permit scoped stale-run recovery, but do not provide exactly-once external calls. Add operational monitoring before operating business-critical or high-volume workflows. The API readiness endpoint only checks PostgreSQL and does not claim AI readiness.
