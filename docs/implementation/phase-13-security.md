# Phase 13 — Security and reliability hardening

## Purpose and request flow

This phase adds browser-origin validation for cookie-authenticated writes, limits repeated authentication attempts, and applies workspace role checks to workflow and execution mutations. Nest's global validation pipe continues to reject unknown DTO fields. Configuration validation also rejects weak production JWT secrets and malformed or local-only production frontend origins.

The browser posts through the same-origin Next `/api` rewrite. The request's `Origin` reaches Nest, where write methods without an explicit Bearer token must match a configured `WEB_ORIGIN`. This prevents a third-party page from using a user's ambient session cookie to mutate data. API clients using a Bearer token can use the API without a browser Origin header.

## File manifest

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/api/src/main.ts` | Existing | Adds origin enforcement and process-local limits for login, registration, and OAuth initiation. |
| `apps/api/src/app.module.ts` | Existing | Validates production JWT strength and exact frontend origins at startup. |
| `apps/api/src/auth/workspace-roles.guard.ts` | New | Compares route metadata with the authenticated user's active workspace role. |
| `apps/api/src/auth/auth.module.ts` | Existing | Provides and exports the workspace role guard. |
| `apps/api/src/workflows/workflows.controller.ts` | Existing | Limits workflow create/update/restore to owners, admins, and members; delete to owners and admins. |
| `apps/api/src/executions/executions.controller.ts` | Existing | Limits execution run/cancel to owners, admins, and members. |
| `docs/implementation/phase-13-security.md` | New | Documents controls and verification. |

## Verification

- `npm --workspace apps/api run build` passed after the security changes.
- Direct requests to the running API confirmed a login POST without an Origin returns 403; the same route with `Origin: http://localhost:3000` reaches authentication and returns the expected 401 for a deliberately nonexistent test identity.
- Role enforcement is compiled and applied at the controllers. Isolated live role-denial tests remain to be run alongside the integration suite in Phase 19.

## Limits

Authentication counters are in-process and reset on restart; they do not coordinate across multiple API replicas. Production deployments with multiple replicas should move counters to a shared store or trusted edge rate limiter. OAuth rate limits currently share the API-observed client IP, which can be the Next proxy address; deployment-specific proxy trust/rate-limit configuration should be verified. Origin validation requires browser writes to include a configured Origin, as normal browser fetch requests do.
