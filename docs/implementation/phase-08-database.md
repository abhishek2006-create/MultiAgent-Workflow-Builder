# Phase 8 — PostgreSQL and Prisma data model

## Purpose and data flow

The current schema stored a user's single optional organization ID and a workflow's latest JSON graph. That cannot represent users in multiple workspaces or retain an immutable graph for a past execution. This additive change introduces membership records, version snapshots, execution-step observability, and approval records. NestJS continues to use the single generated Prisma client; the API will write these records in later workflow/execution phases.

## Schema and relationship decisions

- `Organization.slug` is unique and required for workspace URLs. Existing organizations receive a readable normalized name plus a short stable ID suffix.
- `WorkspaceMembership` joins users and organizations (many-to-many), with a composite uniqueness constraint preventing duplicate memberships. Existing `User.organizationId` values are backfilled; the first legacy user by creation time becomes owner and remaining members become members. Account creation now creates the owner membership in the same database transaction.
- `WorkflowVersion` stores an immutable JSON snapshot and a unique `(workflowId, version)` pair. Existing workflows receive an initial snapshot of their current `definition`. Version creation on every future workflow update is wired in Phase 11.
- `WorkflowExecution` can point at a saved version and triggering user, and can hold a unique trace ID. Existing executions are linked to the current version when possible.
- `WorkflowExecutionStep` stores one node's status, input/output, error, retry count, timing, and optional usage metadata. `(executionId, nodeId)` is unique to make step upserts idempotent.
- `Approval` records pending and resolved decisions and optionally references an execution step and approver. Authorization and transition logic are implemented in the execution/approval phases.

Foreign-key behavior: membership rows cascade when their owning user or organization is deleted; workflow versions cascade with their workflow and set the creator to null if the user is removed; step rows cascade with their execution; approvals cascade with the execution, set step/approver references to null when those records are removed. Existing `WorkflowExecution.workflowId` still cascades on workflow deletion from the pre-existing schema; that legacy audit-retention behavior is explicitly left for the security/reliability phase to correct with a deliberate deletion policy.

Indexes cover membership lookup by user/status and workspace/role/status, workflow version lookup, execution history/status, step status, and pending approvals. JSON snapshots are retained because the graph is already JSON and must preserve node-specific configuration; application-side schema validation is a later workflow phase requirement.

## Files changed

| File | Status | Purpose and connections |
| --- | --- | --- |
| `apps/api/prisma/schema.prisma` | Existing | Active Prisma schema configured by `prisma.config.ts`; adds workspace, snapshot, step, and approval models. |
| `apps/api/prisma/migrations/20261010010000_workspace_versions_and_execution_steps/migration.sql` | New | Additive schema migration and legacy workspace/version backfill. It does not drop tables or reset data. |
| `apps/api/src/auth/auth.service.ts` | Existing | Supplies unique workspace slugs and transactionally creates an owner membership for password and newly created OAuth accounts. |
| `docs/implementation/initial-audit.md` | Existing from Phase 7 | Baseline schema and phase plan. |
| `docs/implementation/phase-08-database.md` | New | Documents model relationships, migration behavior, and verification. |

`apps/api/src/prisma/schema.prisma` is a second, stale schema copy not referenced by the configured Prisma CLI path. It was not modified; it should be removed or synchronized in a separate cleanup after confirming no external scripts consume it.

## Migration and verification

From the repository root, the following commands were run:

```powershell
npm --workspace apps/api exec prisma validate -- --schema prisma/schema.prisma
npm --workspace apps/api run db:migrate:deploy
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run build
npm --workspace apps/api exec prisma migrate status -- --schema prisma/schema.prisma
```

Schema validation passed. The new migration deployed successfully to the configured local PostgreSQL database, and migration status reports all five migrations applied. Prisma client generation succeeded. The first post-generation API build exposed missing slug values in existing auth creation code; those registration/OAuth paths were fixed transactionally, and the API build then passed. A read-only count check found 2 organizations, 2 membership rows, 1 workflow version, 0 executions, 0 steps, and 0 approvals after migration, confirming the existing records were retained and backfills ran. No uniqueness-violation or transaction rollback scenario was exercised yet; the repeatable database tests remain in Phase 19.

## Checkpoint and remaining integration

The additive database structure, local migration, Prisma generation, and API compilation are verified. Workspace switching/authorization, immutable version creation during workflow updates, execution snapshot selection, and approval state transitions remain unimplemented and are prerequisites for marking the broader database-backed product behavior complete.
