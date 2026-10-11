# Phase 12 — Execution API and history

## Purpose and data flow

The API accepts a run only after loading the workflow inside the authenticated workspace and validating its current graph. It resolves the current immutable workflow version and stores the workflow/input/user/trace ID in one `WorkflowExecution` record with status `QUEUED`. History and detail queries scope through the workflow's organization. Cancellation uses a conditional status update so a queued item cannot be cancelled after another process has advanced it.

## Routes

| Method | Route | Auth/tenant scope | Behavior |
| --- | --- | --- | --- |
| `POST` | `/api/workflows/:workflowId/run` | Session + active workspace membership; workflow must belong to current workspace. | Validates graph and creates a queued execution with stable workflow version and input. Returns execution ID/status/trace ID/time. Invalid graphs return 400 with validation issues. |
| `GET` | `/api/workflows/:workflowId/executions` | Same workspace scoping. | Lists execution summaries newest first, including status, timestamps, trace/version, and step count. |
| `GET` | `/api/workflows/:workflowId/executions/:executionId` | Same workspace scoping. | Returns exact execution, version snapshot, input/output/error, persisted steps, and approval records. |
| `POST` | `/api/executions/:executionId/cancel` | Execution's workflow must belong to current workspace. | Cancels only queued executions; returns 409 once execution has advanced beyond queued. |
| `POST` | `/api/executions/:executionId/retry` | Session + active workspace membership; OWNER, ADMIN, or MEMBER; failed run must belong to current workspace. | Creates a new queued run using the failed run's original workflow version and input. The failed record remains unchanged. |

Retry accepts an empty JSON object (or no meaningful fields). It returns `{ executionId, status, traceId, createdAt, retriedFromExecutionId }`. The endpoint returns 404 for an execution outside the active workspace, 409 when the source run is not failed, and 409 when the failed run has no pinned workflow version to replay safely.

## Files changed

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/api/src/executions/execution.dto.ts` | New | Validates optional object input. |
| `apps/api/src/executions/executions.service.ts` | New | Creates queued runs against an immutable version; scopes history/detail/cancel; conditionally transitions queued to cancelled. |
| `apps/api/src/executions/executions.controller.ts` | New | Exposes authenticated run/history/detail/cancel endpoints. |
| `apps/api/src/executions/executions.module.ts` | New | Wires auth and the active workflow service. |
| `apps/api/src/app.module.ts` | Existing | Registers ExecutionsModule. |
| `docs/implementation/phase-12-executions.md` | New | Documents execution contract and verification. |

## Verification

- `npm --workspace apps/api run build` passed.
- Through the live web proxy, a temporary account created a valid workflow and run. The API returned `QUEUED`, persisted version 1, reported it in history/detail, returned 404 for another workspace, and cancelled it to `CANCELLED`. Invalid workflow run returned 400. Temporary data was deleted.

## Checkpoint and limits

Execution persistence/status/history and queued cancellation are implemented. The API exposes a safe retry operation for failed runs that preserves their original input and pinned version while keeping the failed record for audit. The Phase 17 API worker claims queued runs with database-backed leases, writes step-level results, supports scoped expired-lease recovery, and completes or fails supported graphs. Running cancellation, automatic retry/backoff policy, cross-process durable dispatch, and push-based progress events remain pending.
