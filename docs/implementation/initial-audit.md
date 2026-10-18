# Initial repository audit

Audit date: 2026-10-10 (Asia/Calcutta)

This is a historical baseline snapshot. For current implementation status and verification, use [completion-inventory.md](completion-inventory.md) and [testing-report.md](testing-report.md).

## Working tree and baseline

The working tree was already heavily modified before this implementation turn. It contains edits across the API, web application, Prisma schema, migrations, lockfile, and teammate documentation, plus newly added files and an untracked file literally named `et --hard CRITICAL_HASH_HERE`. Those changes are treated as existing user work and have not been reset, staged, or removed. The exact initial state is available in the session's git status. The API baseline build (`npm --workspace apps/api run build`, from the repository root) completed successfully before the Phase 7 edits.

## Architecture found

- npm workspaces contain `apps/web`, `apps/api`, and `packages/contracts`; the root package has API and Prisma scripts but no unified test or build scripts.
- `apps/web` uses Next.js 15, React 19, TypeScript, Tailwind CSS 4, Zustand, and `@xyflow/react`. App Router pages and a visual workflow builder already exist. The web package exposes `build` and `lint`, but no typecheck or test script.
- `apps/api` uses NestJS 11, Prisma 6, PostgreSQL, JWT, bcryptjs, cookie parsing, Passport OAuth, DTO validation, and workflow/auth modules.
- `apps/ai` is a FastAPI/LangGraph service. Its current provider is Ollama (`langchain-ollama`), not Gemini.
- `docker-compose.yml` defines PostgreSQL, API, and AI services. The API image runs migration deploy during container startup.
- Shared contracts currently include a JSON workflow schema and package documentation.

## Existing functionality and gaps

| Area | Observed state |
| --- | --- |
| API foundation | Nest bootstrap, validation, CORS, cookie parser, health route, Prisma lifecycle service. Global prefix, configuration validation, size limits, structured request logging, liveness/readiness separation were absent before Phase 7. |
| Persistence | Organization, User, OAuth identity, Workflow, and WorkflowExecution models exist in the active schema. Workflow nodes/edges are JSON. Memberships, historical workflow snapshots, execution steps, approval records, and durable job records are not present in that schema. |
| Schema consistency | A second schema exists at `apps/api/src/prisma/schema.prisma`, as well as the intended `apps/api/prisma/schema.prisma`. The duplicate requires review to determine whether it is stale or in use. Migration files are present, including uncommitted additions. No migration was generated or applied during this audit. |
| Authentication | Registration/login, JWT guard, HTTP-only cookie, Google and GitHub OAuth exist. Tokens are issued for seven days in code; logout clears the cookie but does not revoke a token server-side. Workspace isolation is based on a JWT organization ID and single optional `User.organizationId`. |
| Workflows | Authenticated create/list/get/update routes scope queries by organization. Updates increment an integer version but do not preserve immutable snapshots. No dedicated graph validation route or delete route was found in inspected controller. |
| Execution | A basic execution database model exists, but no Nest execution module or graph worker was found in the API source inventory. |
| AI | `/ai/health` and `/ai/chat` exist; chat calls an Ollama LangGraph. The request schema is retail-support-specific. There is no Nest-to-AI authenticated client or demonstrated end-to-end workflow execution connection. |
| Frontend | Signup/login, dashboard, workflow listing/editor, and API helpers exist. Current changes include `useWorkflowApi.ts`; the prior `useWorkflow.ts` is deleted in the working tree. Full API/session and execution integration still needs verification. |
| Security | DTO whitelist/rejection is enabled. CORS was previously a single frontend URL with localhost fallback. Request size bounds, centralized config checks, workspace membership roles, refresh/session revocation, rate limits, and AI service authentication were not observed. |
| Deployment/docs | Dockerfiles and Compose exist. Implementation phase docs, deployment guide, environment reference, operations runbook, and testing report were not present in the initial inventory. |

## Next.js guidance availability

The repository's `AGENTS.md` says to read the installed guide in `node_modules/next/dist/docs/` before changing Next.js code. The installed Next package is present, but that `dist/docs` directory and guide files are absent in the inspected dependency tree. This batch does not modify frontend or Next.js code. If a later phase requires Next.js changes, first re-check for the guide or use another repository-provided authoritative version-specific guide if available; record the missing installed guide rather than guessing at changed APIs.

## Plan for Phases 7–20

1. Phase 7: validate API startup configuration, standardize API prefix/CORS/request limits/logging/shutdown, and expose database readiness.
2. Phase 8: reconcile duplicate schemas and existing migrations before designing membership, snapshots, execution steps, and approvals; make additive migrations only after confirming the correct schema path and database environment.
3. Phase 9: audit and harden current JWT/cookie/OAuth flows without introducing a competing auth system; add revocation/session handling only with a persistence design.
4. Phase 10: add workspace membership and role checks, then replace assumptions that one user has exactly one organization only after migration and API/UI compatibility are understood.
5. Phase 11: validate workflow graph contracts on the server and add immutable snapshots with safe version semantics.
6. Phase 12: implement persisted execution lifecycle, status/history APIs, and transitions.
7. Phase 13: address authorization, request limits, rate controls, provider timeouts, secrets, and safe logging/errors.
8. Phase 14: formalize AI service settings and validated API schemas; preserve current Ollama provider pending explicit Gemini phase.
9. Phase 15: implement a Gemini provider adapter using its supported official SDK and server-only credentials, preserving a clear provider boundary.
10. Phase 16: implement validated agent handlers/contracts and deterministic behavior for non-provider tests.
11. Phase 17: implement graph scheduling, persisted node steps, failure/retry handling, and human approval pause/resume semantics.
12. Phase 18: connect existing frontend flows to verified API contracts, handling loading/error/unsaved states.
13. Phase 19: add and run tests against isolated test configuration; report only observed results.
14. Phase 20: align deployment configuration, env reference, operational runbook, health checks, and deployment instructions; do not deploy live infrastructure.

## Phase checkpoint

Phase 7 is implemented and verified locally; API liveness/readiness returned 200 and readiness confirmed PostgreSQL access. Phase 8 added workspace memberships, workflow snapshots, execution steps, approvals, and sessions through additive migrations. Phase 9 fixed the Next/Nest API prefix mismatch, added persisted session revocation, and checks active membership on protected requests; live auth checks passed. Phase 10 added workspace list/create/invite/accept/switch APIs; a live three-account test confirmed admin checks, email-bound single-use invitations, switching, and prior-session revocation. Phase 11 added tenant-scoped workflow CRUD, graph validation, immutable version snapshots, history/restore, and execution-history-safe delete. Phase 12 added queued execution creation, version pinning, history/detail, and safe queued cancellation; a live proxy test passed tenant isolation and invalid-graph rejection. The API is running in watch mode on port 3001. The duplicate `apps/api/src/prisma/schema.prisma` remains identified as unused and stale, and the separate unregistered `apps/api/workflows/` tree is identified as an unsafe duplicate. Detailed checkpoints are in the phase-specific implementation docs.
## Implementation checkpoint (2026-10-10)

This table supersedes the initial-state observations above where implementation has since changed the repository. It distinguishes compiling code from fully verified product behavior.

| Phase | Checkpoint |
| --- | --- |
| 7 — Backend foundation | Implemented; API build and health/readiness were verified. |
| 8 — Database | Implemented with additive migrations; migrations were applied and status checked in the earlier phase work. |
| 9 — Authentication | Cookie/session auth and Next `/api` proxy repaired and manually verified. Full OAuth provider round trips remain unverified. |
| 10 — Workspaces | Memberships, invitations, acceptance, and session switching implemented and manually exercised. |
| 11 — Workflows | Tenant-scoped CRUD, graph validation, immutable snapshots, and restore implemented and manually exercised. |
| 12 — Execution API | Version-pinned run/history/detail/cancel implemented; API checks were performed in the earlier phase work. |
| 13 — Security | Origin checks, auth attempt limits, config validation, and role guards implemented; multi-replica rate limiting and full role matrix tests remain. |
| 14 — AI service | Internal Nest client, FastAPI request authentication, bounds, and timeouts implemented; clean supported-Python install remains unverified. |
| 15 — Gemini | Gemini SDK/provider and structured response integration implemented; live generation is unverified because no API key is configured. |
| 16 — Agents | Role-aware contracts and graph handoffs implemented; external tools, specialized model/tool policy, and usage accounting remain. |
| 17 — Execution engine | In-process polling worker, step persistence, supported node execution, approval pause/resume, worker lease/heartbeat, scoped stale-lease recovery, manual retry of failed pinned runs, condition routing, and safe calculator execution implemented. Lease recovery, approval resume, and retry were verified against PostgreSQL. Automatic retry/backoff, network/database/code tools, and parallel branches remain incomplete. |
| 18 — Full integration | Auth proxy and editor run polling/console/approval UI integrated; current node and connected edge animate during execution and completed nodes replay sequentially; the editor can retry failed runs. Dashboard/member management, durable approvals inbox, and model settings remain. |
| 19 — QA | Three FastAPI security/config tests and nine API graph/runtime/retry unit tests pass, alongside builds and manual database-backed workflow checks. Frontend/browser E2E suites and an isolated database test target remain absent. |
| 20 — Deployment | Safe templates and operational guides added; no web image, CI deployment pipeline, production DB, or production-grade worker/monitoring is configured. This repository is not production-ready. |

See [testing-report.md](testing-report.md), [deployment-guide.md](deployment-guide.md), [environment-reference.md](environment-reference.md), and [operations-runbook.md](operations-runbook.md) for evidence and operating constraints.
