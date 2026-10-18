# Phase 18 — Frontend, API, and AI integration

## Integrated user flow

The login and signup screens call the same-origin `/api` proxy and receive an HttpOnly session cookie. Protected pages verify that cookie through `/api/auth/me`. The React Flow editor saves and validates workflows through the authenticated API, starts a version-pinned execution, polls its status and persisted node steps every 250 ms, displays output/errors, and offers approve/reject actions when the run pauses at a human approval node. A workspace-scoped approvals inbox lists pending requests with cursor pagination. While an execution is active, its current node is highlighted and its incoming connected edge animates; completed nodes and paths turn green. After completion, the UI replays completed nodes in sequence so the workflow remains visible node by node. The API worker calls FastAPI, which calls Gemini using the server-only API key.

## Files changed

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/web/lib/api-url.ts` | New | Keeps `/api` prefix consistent. |
| `apps/web/lib/api.ts` | Existing | Adds execution approval calls and continues workflow request handling. |
| `apps/web/middleware.ts` | New | Verifies cookie sessions before protected pages. |
| `apps/web/hooks/useWorkflowApi.ts` | Existing | Runs, polls, and resolves approvals. |
| `apps/web/stores/workflowStore.ts` | Existing | Tracks execution details and status. |
| `apps/web/types/workflow.ts` | Existing | Defines status, step, and approval response shapes. |
| `apps/web/components/workflow/WorkflowBuilder.tsx` | Existing | Displays the execution console and pending human approvals. |
| `apps/web/components/workflow/WorkflowToolbar.tsx` | Existing | Shows current run status. |
| `apps/web/components/workflow/ApprovalInbox.tsx` | New | Lists and resolves pending requests from the authenticated workspace. |
| `apps/web/components/workflow/ExecutionHistory.tsx` | Existing | Shows cursor-paginated run history and persisted step records. |
| `apps/web/components/workflow/WorkflowList.tsx` | Existing | Offers a copy action that creates a separate workflow from the current definition. |
| `apps/api/src/executions/approvals.controller.ts` | New | Adds role- and workspace-scoped approval resolution. |
| `apps/api/src/executions/pending-approvals.controller.ts` | New | Adds a workspace-scoped, cursor-paginated approval inbox API. |
| `docs/implementation/phase-18-integration.md` | New | Documents the integrated request flow and verification. |

## Verification

- From `apps/web`, `$env:NEXT_DIST_DIR='.next-verify'; npm run build` passed, including lint/type checks and static page generation. The default `.next` output path hits Windows `EPERM` in this host. The CSS import-order warning was fixed.
- The running Next proxy returned API readiness 200 and unauthenticated `/api/auth/me` returned 401, confirming the proxy and expected auth boundary.
- API build passed with approval endpoint and worker code.
- Live approval/resume verification passed with leases enabled; the run paused, was approved, resumed, and completed all steps.
- Live condition routing completed the selected true branch and persisted the unselected false branch as `SKIPPED`.
- The editor provides an explicit retry action for failed executions while preserving the original execution record.

## Remaining frontend scope

The dashboard loads workspace counts, recent executions, status rates, and provider-reported token counts. Workflow list, three starter templates, validated import/export, workflow duplication, run input, cursor-paginated history, model settings, input/output schema settings, AI timeouts and retry settings, validation results, cancellation, and retry are connected. The dashboard reports only the latest 10 runs' usage. Database verification of parallel branches, configured AI retries/timeouts, approvals inbox authorization, and automated browser E2E coverage remain incomplete.
