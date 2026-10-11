# Phase 7 — Backend foundation

## Purpose and data flow

This phase makes the NestJS API a predictable boundary for later auth, workspace, workflow, and execution work. Startup configuration is loaded and checked by `ConfigModule`; `main.ts` reads that validated configuration to bind the API, set the `/api` prefix, limit request bodies, and allow only configured browser origins. Request logs record method, path, status, and duration without query strings or request bodies. The health controller separates process liveness from PostgreSQL readiness using the shared Prisma service.

## Implementation sequence

1. Inspect the existing Nest, Prisma, auth, and health modules before adding infrastructure.
2. Validate required database/JWT configuration and the API port/frontend origin at startup.
3. Configure the global route prefix, strict DTO validation, CORS, body limits, request metadata logging, and graceful shutdown.
4. Expose liveness and database readiness endpoints without leaking connection details.
5. Build the API and then verify runtime configuration and health behavior when the local database is available.

## Files changed

| File | Status | Responsibility and dependencies | Verification |
| --- | --- | --- | --- |
| `apps/api/src/app.module.ts` | Existing | Validates required environment values and wires global config plus Prisma/auth/workflow modules. | API build; startup failure with missing required values. |
| `apps/api/src/main.ts` | Existing | Configures `/api`, exact configured CORS origins, 1 MiB body limits, validation, safe request metadata logs, and shutdown hooks. | API build and runtime checks. |
| `apps/api/src/health/health.controller.ts` | Existing | Provides liveness and database readiness through the singleton `PrismaService`. | API build; live and ready HTTP requests. |
| `docs/implementation/initial-audit.md` | New | Records repository baseline, findings, and phased implementation plan. | Compare statements with inspected tree and baseline build. |
| `docs/implementation/phase-07-backend-foundation.md` | New | Documents Phase 7 purpose, flow, files, and verification. | Review alongside code and actual command results. |

## Configuration contract

Required at API startup: `DATABASE_URL`, `JWT_SECRET`. Optional `API_PORT` must be an integer from 1 to 65535. `WEB_ORIGIN` (or legacy `FRONTEND_URL`) accepts a comma-separated list of HTTP(S) origins and defaults to `http://localhost:3000` for compatibility. The JWT service already reads `JWT_SECRET` through `ConfigService`. Production secret strength and complete environment reference remain part of the security/deployment phases.

## Routes

- `GET /api/health` — existing API health response.
- `GET /api/health/live` — process liveness; does not depend on PostgreSQL.
- `GET /api/health/ready` — runs `SELECT 1` through the shared Prisma client; returns 503 if the database is unavailable, without exposing details.

## Verification and checkpoint

- Baseline: `npm --workspace apps/api run build` from the repository root succeeded before edits.
- After edits: the same API build succeeded.
- Runtime: `npm --workspace apps/api run start` loaded the existing `apps/api/.env`, started successfully, and mapped the expected `/api/health`, `/api/health/live`, and `/api/health/ready` routes.
- HTTP checks: `GET /api/health/live` returned `{ "status": "ok" }` (200). `GET /api/health/ready` returned `{ "status": "ok", "database": "ok" }` (200), confirming the configured database was reachable at verification time.
- Request logs contained method, path, response status, and duration only.
- `git diff --check` reports whitespace issues in pre-existing user edits (`apps/api/src/auth/auth.controller.ts`, `apps/web/lib/api.ts`, `apps/web/types/workflow.ts`); these unrelated lines were not changed to avoid rewriting existing work.
- No database migration was required for this phase.

Phase 7 checkpoint: implemented and build/runtime verified for the current local configuration. Production cookie/domain policy and broader security controls remain assigned to later phases.
