# Phase 17 — Graph execution engine

## Execution flow

The API worker polls the database for the oldest claimable execution, locks it with `FOR UPDATE SKIP LOCKED`, and writes a lease before setting `RUNNING`. Each API process has a distinct worker ID and renews its 60-second lease every 10 seconds. A lease owner persists node steps and terminal state only while the lease remains current. Queued jobs with no lease and running jobs with a missing or expired lease are eligible for scoped recovery; active leases are left alone. The worker loads the immutable workflow-version snapshot, topologically orders the validated DAG, and upserts one step per node using the unique `(executionId, nodeId)` key. Completed step outputs are loaded when an approved execution is requeued, so the approval node is not repeated. Successful runs persist output and completion time; errors persist a failed step and failed execution. Approval nodes persist a pending `Approval`, release the worker lease, and pause the run; an authorized workspace member can approve (requeue) or reject (fail) it.

## File manifest

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/api/src/executions/execution-worker.service.ts` | New | Polls/claims queued runs, topologically evaluates supported nodes, and persists step/execution outcomes. |
| `apps/api/src/executions/node-runtime.ts` | New | Evaluates bounded field conditions and arithmetic expressions without dynamic code execution. |
| `apps/api/prisma/schema.prisma` | Existing | Stores the one-to-one execution worker lease with owner and expiry. |
| `apps/api/prisma/migrations/20261010040000_execution_worker_leases/migration.sql` | New | Adds lease persistence and expiry indexes. |
| `apps/api/src/executions/approvals.controller.ts` | New | Resolves pending approvals with workspace and role scoping and an atomic state transition. |
| `apps/api/src/executions/resolve-approval.dto.ts` | New | Validates approval decision and bounded comment. |
| `apps/api/src/executions/executions.module.ts` | Existing | Registers the worker, AI client dependency, and approval controller. |
| `apps/api/src/ai/ai-client.service.ts` | New | Provides authenticated and timeout-bounded model calls. |
| `apps/api/src/workflows/graph-validation.ts` | Existing | Validates acyclic graphs and agent configuration before enqueue. |
| `docs/implementation/phase-17-execution-engine.md` | New | Explains execution lifecycle and unsupported recovery guarantees. |

## Supported nodes and verification

Input, output, agent, LLM, reviewer, human approval, condition, and calculator nodes execute. Conditions support `exists`, `truthy`, `equals`, `notEquals`, `contains`, `greaterThan`, and `lessThan`; branch edges must use the condition's `true` or `false` source handle, and off-branch nodes persist as `SKIPPED`. Calculator supports numeric literals, named numeric input fields, parentheses, and `+`, `-`, `*`, `/`, `%` operators using a bounded parser. HTTP, search, database, and arbitrary code tools remain unsupported and fail explicitly. API graph/runtime/retry unit tests pass. A temporary input-to-output workflow reached `COMPLETED`; an approval workflow paused at `WAITING_APPROVAL`, accepted an authorized approval, resumed under a new lease, and reached `COMPLETED` with all three steps complete. A separate live check seeded a `RUNNING` execution with an expired lease; the worker reclaimed it and completed it. Temporary test identities and workspaces were removed. A live Gemini-backed agent run still requires a valid configured API key.

## Reliability boundary

The worker is an in-process polling loop, not a separately supervised durable queue. It claims one run at a time per API process. Lease-based stale recovery is scoped to rows with missing or expired leases and uses PostgreSQL row locks, so a live worker's unexpired lease is not reset. Recovery is at-least-once: if a process crashes after an external provider call but before committing its result, a replacement worker can repeat that call. Retry/backoff, running cancellation, parallel branches, streaming progress, and exactly-once provider calls remain incomplete.
