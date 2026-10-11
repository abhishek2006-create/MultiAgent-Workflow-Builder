# Phase 9 — Authentication and authorization

## Purpose and flow

Browser auth was failing because the UI called `/api/auth/...`, the Next rewrite stripped `/api`, and Nest now serves routes under `/api`. Session middleware made the failure look like an account problem by redirecting users to signup. The frontend now keeps `/api` end to end, and Next proxies to the matching Nest path. Registration and login set an HttpOnly cookie; the browser never receives the JWT in its JSON response. Protected API requests verify the JWT, its persisted session, and the user's active membership in the token's workspace. Logout revokes the server-side session before clearing the cookie.

## Security and authorization behavior

- Email addresses are trimmed and lowercased. Passwords are hashed with bcrypt cost 12. Invalid email/password combinations share the same 401 response.
- Registration creates organization, user, owner membership, and then a persisted session. The account and membership creation is transactional. Login only creates a session after credential verification.
- Access tokens expire after seven days. Each contains a session ID (`sid`) and is stored only in the `HttpOnly` cookie. `Secure` is enabled in production; cookie clearing uses matching path/security/SameSite attributes.
- Each protected request checks token signature/expiry, session ownership/workspace/expiry/revocation, and an `ACTIVE` workspace membership. Membership role is attached to the authenticated request for later role-aware authorization.
- Logout revokes the session in PostgreSQL; replaying a copied token then fails. Expired/malformed logout cookies are handled idempotently.
- OAuth start routes use `/api/auth/google` and `/api/auth/github`. The two callback controllers support current `/api/...` callbacks and a narrow root-path compatibility alias because the existing local callback URLs are unprefixed. OAuth cancellation/errors redirect to `/login?error=oauth_failed`.
- The login UI retains its same-origin `next` target only when it resolves to the current frontend origin.

## Files changed

| File | Status | Responsibility / connections |
| --- | --- | --- |
| `apps/web/lib/api-url.ts` | New | Ensures configured absolute API URLs get one `/api` prefix; default is same-origin `/api`. Used by auth pages and shared API helper. |
| `apps/web/next.config.ts` | Existing | Proxies `/api/:path*` to `${API_INTERNAL_URL}/api/:path*`; localhost fallback is development-only and production falls back to the Compose service name. |
| `apps/web/middleware.ts` | Existing | Calls `/api/auth/me` to check protected routes and directs anonymous sessions to login while preserving a safe return path. |
| `apps/web/app/login/page.tsx` | Existing | Uses normalized API base for password login. |
| `apps/web/app/signup/page.tsx` | Existing | Uses normalized API base for registration. |
| `apps/api/src/main.ts` | Existing | Preserves the `/api` route prefix and aliases only legacy unprefixed provider callback paths. |
| `apps/api/src/auth/auth.controller.ts` | Existing | Sets/clears the session cookie, returns only the user object, and redirects OAuth callback failures to the frontend origin. |
| `apps/api/src/auth/auth.service.ts` | Existing | Password verification, registration, OAuth identity linking, session issuance, and revocation. |
| `apps/api/src/auth/jwt-auth.guard.ts` | Existing | Validates signed token, persisted session, and active workspace membership; provides membership role to request handlers. |
| `apps/api/src/auth/guards/google-callback-auth.guard.ts` | New | Allows callback controller to handle provider denial and redirect to login. |
| `apps/api/src/auth/guards/github-callback-auth.guard.ts` | New | Same callback failure handling for GitHub. |
| `apps/api/src/auth/strategies/google.strategy.ts` | Existing | Google OAuth strategy callback default includes the Nest API prefix. |
| `apps/api/src/auth/strategies/github.strategy.ts` | Existing | GitHub OAuth strategy callback default includes the Nest API prefix. |
| `apps/api/prisma/schema.prisma` | Existing | Adds persisted `AuthSession` records. |
| `apps/api/prisma/migrations/20261010020000_persist_auth_sessions/migration.sql` | New | Adds the session table/indexes without deleting existing accounts. |
| `apps/api/.env.example` | Existing | Documents API origin and OAuth callback configuration with placeholders. |
| `apps/web/.env.example` | New | Documents browser API base and server-side API proxy URL. |

The real `.env` and `.env.local` files were not changed. Existing OAuth callback values were inspected only for whether they include the API path; the actual values were not printed.

## Configuration

- API: `WEB_ORIGIN` is the comma-separated browser origin allowlist; legacy `FRONTEND_URL` remains accepted. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, and their GitHub equivalents configure providers. Callback URLs must exactly match the URLs registered with each OAuth provider. Existing unprefixed callbacks remain supported through the compatibility alias.
- Web: `NEXT_PUBLIC_API_URL=/api` sends requests through the same-origin proxy. `API_INTERNAL_URL` is the server-side API origin; set it to the reachable Nest API in production. The default production service name `http://api:3001` assumes the Next server shares the Docker network. For other hosting, set `API_INTERNAL_URL` explicitly.
- Cookie auth uses credentialed same-origin proxy requests. Direct cross-origin use requires the configured `WEB_ORIGIN` and secure cookie transport.

## Verification

Observed checks against the configured local PostgreSQL database:

- Prisma `migrate deploy` applied `20261010020000_persist_auth_sessions`; migration status reports all six migrations applied.
- Prisma client generation completed with the Prisma 6.19 binary engine because the existing API process held the default Windows DLL open. No schema/package setting was changed for this local generation workaround.
- `npm --workspace apps/api run build` passed.
- `npm --workspace apps/web run build` passed. Existing warnings remain for the CSS `@import` order and unused `setNodes` in `WorkflowBuilder.tsx`.
- An isolated Next dev server proxied to a fresh API build. A temporary account was registered, session restored, membership suspended and rejected (401), membership restored, session logged out, and a copied bearer token replay was rejected (401). A subsequent login restored the profile (200), and an invalid password returned 401. The JSON response did not contain an access token; the browser received an HttpOnly cookie. The temporary user and workspace were deleted after the check.
- The actual running local web server on port 3000 and the restarted API on port 3001 also passed register (201), profile (200), logout (201), and revoked-token replay (401). The temporary account/workspace were removed after the check. The API is left running in watch mode so code changes remain active during local development.
- Google OAuth initiation returned a redirect to the configured provider. Both prefixed and configured legacy callback paths redirected a denied provider response to the frontend login page. No external OAuth account sign-in was completed.

## Remaining auth limits

Access/refresh token rotation and account-wide session management are not implemented. Password/email account state is not modeled yet. Workspace switching is a later Phase 10 change: the current token selects the user's existing single `organizationId`, though membership is now the authorization gate. OAuth identity linking and full provider round trips still need tests with provider accounts configured for this deployment.
