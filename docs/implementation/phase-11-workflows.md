# Phase 11 — Workflow CRUD, versioning, and validation

## Purpose and data flow

Nest owns the validated workflow graph and workspace boundary. Authenticated controller methods derive tenant/user IDs from the session, the service scopes every lookup/update/delete by the tenant, and Prisma stores the editable graph plus immutable snapshots. `POST /api/workflows/:id/validate` validates the saved React Flow graph and returns structured errors/warnings for the editor.

## Implemented behavior

- Workflow create/update persists name, description, nodes, edges, definition, and integer version.
- Create writes version 1 and its snapshot in one transaction. Every update uses an optimistic version condition, increments the version, and writes its snapshot in the same transaction. Concurrent stale saves return 409 instead of silently overwriting a newer graph.
- `GET /api/workflows/:id/versions` lists immutable snapshots in descending order, scoped by workspace.
- `POST /api/workflows/:id/versions/:version/restore` applies an older snapshot as a new current version; it does not rewrite history.
- Graph validation checks node/edge object shape, supported node/tool types, unique node/edge IDs, finite positions, object data, endpoint existence, self-loops, directed cycles, required input/output nodes, and an input-to-output path. Disconnected nodes and dead ends are warnings.
- DTO limits cap graphs at 500 nodes and 2,000 edges. The JSON request body has a 1 MiB limit from Phase 7.
- Delete is tenant-scoped and returns 409 if execution history exists, preventing the old cascade relationship from erasing execution records through this API.
- Shared `workflow.schema.json` now describes React Flow nodes/edges instead of the former unused `{id,type,config}` shape.

## Files changed

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/api/src/workflows/graph-validation.ts` | New | Server-side graph shape and topology validation. |
| `apps/api/src/workflows/workflow.dto.ts` | Existing | Node/edge arrays, metadata validation, and graph-size limits. |
| `apps/api/src/workflows/workflows.service.ts` | Existing | Tenant-scoped CRUD, immutable snapshot transactions, restore, validate, and execution-history-safe delete. |
| `apps/api/src/workflows/workflows.controller.ts` | Existing | Authenticated workflow CRUD, validation, history, restore, and delete routes. |
| `packages/contracts/workflow.schema.json` | Existing | Aligns the shared JSON contract with React Flow node and edge data. |
| `docs/implementation/phase-11-workflows.md` | New | Phase implementation and verification report. |

The separate `apps/api/workflows/` tree is not registered by `AppModule`; `apps/api/src/workflows/` is the active authenticated module. The unregistered copy still contains insecure placeholder organization behavior and should be removed or reconciled before any future module registration.

## Verification

- `npm --workspace apps/api run build` passed.
- `npm --workspace apps/web run build` passed after the preceding auth/workspace integration; existing CSS import and unused variable warnings remain.
- Prisma migration status reports all seven migrations applied; Phase 11 required no schema change because Phase 8 created `WorkflowVersion`.
- Through the live Next proxy, temporary account tests passed: create valid graph, validation returns valid, update creates version 2, restore version 1 creates version 3, history contains three snapshots, another workspace receives 404, cyclic graph is rejected by validation with `CYCLE_DETECTED`, and delete succeeds with no executions. Test workflows/accounts/workspaces were removed.

## Checkpoint and limits

Workflow persistence, validation, history, and restore behavior are implemented and manually verified. Tests for malformed positions/tool settings, stale concurrent saves, and delete-with-execution are not yet automated. Execution start/status APIs and worker integration are Phase 12 and 17.
