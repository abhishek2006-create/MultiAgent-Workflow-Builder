# Phase 10 — Workspaces and memberships

## Purpose and flow

Memberships are the server-side authorization source for workspace access. Authenticated users can list active workspaces, create a workspace as owner, invite an existing or new account, accept an invitation only with the matching account email, and switch the active workspace by replacing the session cookie. Each workspace-scoped API request checks the token's active membership.

## Implemented behavior

- `GET /api/workspaces`: lists active memberships for the authenticated user with workspace ID/name/slug and role.
- `POST /api/workspaces`: validates a workspace name, generates a unique URL-safe slug, and transactionally creates the organization and owner membership.
- `POST /api/workspaces/:id/invitations`: only active workspace owners/admins may invite; `OWNER` cannot be granted. Email is normalized, the invitation expires after seven days, and only a SHA-256 token hash is stored. The raw random 256-bit invitation token is returned once for the admin to share.
- `POST /api/workspaces/invitations/accept`: requires an active account whose normalized email matches the invitation. Expired, revoked, reused, wrong-email, or unknown tokens fail. Membership creation and invitation acceptance are transactional.
- `POST /api/auth/workspaces/:id/switch`: confirms active membership, issues a session for that workspace, revokes the prior session, and replaces the HttpOnly cookie.

No email is sent by this API; the UI/admin must share the returned invitation token through an authorized channel. The invitation token is sensitive and must not be logged or persisted by the frontend beyond its deliberate sharing flow.

## Files changed

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/api/prisma/schema.prisma` | Existing | Defines memberships, workspace roles, and invitation records. |
| `apps/api/prisma/migrations/20261010030000_workspace_invitations/migration.sql` | New | Additive invitation table migration with unique hashed-token index and lookup indexes. |
| `apps/api/src/workspaces/workspace.dto.ts` | New | Validates workspace creation, invitation roles/emails, and acceptance tokens. |
| `apps/api/src/workspaces/workspaces.service.ts` | New | Lists/creates workspaces, generates slugs, enforces invite roles, hashes token, and accepts invitations transactionally. |
| `apps/api/src/workspaces/workspaces.controller.ts` | New | Exposes authenticated workspace and invitation endpoints. |
| `apps/api/src/workspaces/workspaces.module.ts` | New | Imports AuthModule so the session/membership guard can resolve its JWT service. |
| `apps/api/src/auth/auth.service.ts` | Existing | Issues a new workspace-bound session and revokes the old one during switching. |
| `apps/api/src/auth/auth.controller.ts` | Existing | Exposes the workspace-switch route and sets the replacement cookie. |
| `apps/api/src/app.module.ts` | Existing | Registers WorkspacesModule. |
| `docs/implementation/phase-10-workspaces.md` | New | Documents this phase and its verification. |

## Verification

- Prisma schema validation succeeded; the seventh migration applied to local PostgreSQL.
- Prisma generation encountered a Windows engine-file lock while the API was running in watch mode; generated model typings were written, and the API build succeeded. No live process was stopped for this generation attempt.
- The live API watch process compiled with zero TypeScript errors and registered the workspace routes.
- A temporary three-account live proxy scenario passed: owner registration (201), invitation creation (201), outsider invite denied (403), wrong-email acceptance denied (401), correct acceptance (201), invited user's workspace list contained both workspaces, switch succeeded (201), selected workspace matched the target, previous session was revoked (401), and invite reuse was denied (401). Temporary accounts/workspaces were removed.

## Checkpoint and limits

Workspace create/list/invite/accept/switch behavior is implemented and manually verified. Membership management (role changes, suspension/reactivation, leaving/deleting a workspace), invitation listing/revocation, and a UI workspace selector remain for later security/frontend phases. The active workspace continues to be carried in the signed session token, and all workspace-scoped queries must derive their tenant from the authenticated request.
