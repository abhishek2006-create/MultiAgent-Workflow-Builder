# Phase 18 — Frontend, API, and AI integration

## Integrated user flow

The login and signup screens call the same-origin `/api` proxy and receive an HttpOnly session cookie. Protected pages verify that cookie through `/api/auth/me`. The React Flow editor saves and validates workflows through the authenticated API, starts a version-pinned execution, polls its status and persisted node steps every 250 ms, displays output/errors, and offers approve/reject actions when the run pauses at a human approval node. While an execution is active, its current node is highlighted and its incoming connected edge animates; completed nodes and paths turn green. After completion, the UI replays completed nodes in sequence so the workflow remains visible node by node. The API worker calls FastAPI, which calls Gemini using the server-only API key.

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
| `apps/api/src/executions/approvals.controller.ts` | New | Adds role- and workspace-scoped approval resolution. |
| `docs/implementation/phase-18-integration.md` | New | Documents the integrated request flow and verification. |

## Verification

- `npm --workspace apps/web run build` passed with existing CSS import-order and unused `setNodes` warnings.
- The running Next proxy returned API readiness 200 and unauthenticated `/api/auth/me` returned 401, confirming the proxy and expected auth boundary.
- API build passed with approval endpoint and worker code.
- Live approval/resume verification passed with leases enabled; the run paused, was approved, resumed, and completed all steps.
- Live condition routing completed the selected true branch and persisted the unselected false branch as `SKIPPED`.
- The editor provides an explicit retry action for failed executions while preserving the original execution record.

## Remaining frontend scope

Dashboard workspace/member management, execution history navigation, model-settings persistence, branch-level parallel visualization, and richer output rendering still need implementation. Approval polling displays the active execution only; a durable inbox for pending approvals is not present.
