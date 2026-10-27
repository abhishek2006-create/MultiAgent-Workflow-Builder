# Completion review — 28 October 2026

Deployment remains excluded. This review supersedes the October 17 inventory. Existing uncommitted design work and user data were preserved.

## Implemented in this pass

- Fixed the actual Planner HTTP 500: LangGraph returns merged input/output state, while the strict HTTP response schema accepts only output fields. The service now selects response fields before validation. A regression test executes the real graph with a mocked provider, rather than mocking the graph itself.
- Added a deadline around the complete AI node, including provider retries and structured-output repair. Disabled hidden SDK retries; timeouts now return a provider-specific 504. Added safe reference IDs for unexpected errors without logging prompts, keys, or raw provider exception strings.
- Verified a complete real Gemini workflow: Input → Planner → Research/Coding → Reviewer → Approval → Output. New default nodes and templates use `gemini-3.5-flash-lite`, 1024 output tokens, and a 60-second node limit. Existing saved workflows retain their selected models/settings.
- Preserved the original runtime request alongside upstream results for AI nodes. Explicit input mapping still sends only the selected value. Search suggestion HTML is excluded from model context.
- Preserved the reviewed result through human approval. Inactive approval branches are skipped rather than generating spurious approval requests.
- Added server-driven model options and authenticated `/api/ai/configuration`, plus a functional Settings screen. It reports connectivity, model allowlists, and whether server-side keys are configured; key presence is explicitly distinguished from provider access/quota.
- Added workspace create/switch/invitation controls in Settings and current workspace/role in `/api/auth/me`. Optional OAuth credentials no longer prevent email/password startup; disabled OAuth routes return an actionable 503.
- Added the Web Search tool using Gemini Google Search grounding, a query input mapping, bounded source count, server enable switch, 60-second deadline, persisted sources/usage, safe source links, sandboxed Search Suggestions, and a starter template.
- Added root `dev:all`, cross-platform AI launcher/test commands, frontend API client tests, isolated-schema HTTP/worker integration tests, and a CI workflow. No new JavaScript dependency was needed.
- Removed a decorative Streaming toggle that did not control a real streaming feature. Execution status continues to use persisted polling. Consent controls remain unchanged.

## Current acceptance status

Follow-up startup/direction fix: the API development command now starts a missing localhost AI service, waits for readiness and validates service authentication. It reuses an existing service and does not terminate a reused service on shutdown. Canvas connections have persistent direction arrows; moving SVG packets follow live branches, approval waits pause flow, and short completed runs have a clearly labeled path replay. Both parallel branches are supported and inactive conditional branches remain muted. Frontend tests increased to **10**, with all 55 API tests still passing; lint, TypeScript and production build passed.

Final local checks: **55 API tests, 6 web client tests and 27 Python tests passed (88 total)**. Frontend lint and production build passed. The PostgreSQL smoke also passed expired lease recovery, completed-step reuse, original start-time preservation, workspace invitations/switching and viewer write protection. Browser verification covered login with approved temporary-account consent, Settings, template creation, validation, runtime input, completed output, history refresh and logout. The temporary account and its workflow were removed afterward.

Validation now checks current canvas edits before saving and reports success visibly. The Run dialog chooses a matching example for search/JSON templates or an Input schema example. Token usage is summed across structured-output repair attempts when the provider reports it.

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| API and graph engine | Implemented and verified | Unit suites plus real PostgreSQL HTTP/worker smoke; parallel steps, join, versions, failure, retry, cancellation, branches, approval and history covered. |
| Authentication and workspace isolation | Implemented and verified locally | Registration, session, unauthenticated rejection, cross-workspace denial and logout checked. Browser login checked with a temporary test account. Live OAuth provider redirects/account permissions are operator-specific. |
| Gemini generation | Implemented and live verified | Complete four-agent default graph and approval finished successfully using the configured key. |
| OpenAI generation | Implemented; blocked by provider quota | `gpt-6` was inaccessible to the key. The configured catalog includes GPT-5.5; a minimal GPT-5.5 generation call returned HTTP 429. No cross-provider fallback disguises this failure. |
| Web search | Implemented; deterministic integration verified; live quota blocked | Query → authenticated tool request → grounded sources → persisted step → downstream Research covered. Live grounding returned HTTP 429. Search is enabled in this local AI environment at the user's request; example configs leave it disabled until explicitly enabled. |
| AI Settings and workspace interface | Implemented; build verified | Model list comes from the AI service; no provider secrets reach the browser. Workspace actions remain authorized by the API. |
| Web application | Implemented; lint/types/build verified | Dark animated design preserved. Runtime input, run progress, errors, approval, final output, history and templates remain connected to real state. |
| Database | Verified | Eight existing migrations applied/up to date; no application schema migration or data reset was needed. Smoke tests create/migrate their own unique schema and remove only that test schema. |
| Tests and automation | Implemented and verified locally | API, Python and frontend client tests; deterministic HTTP/worker smoke; live Gemini smoke; production web build. CI is added but has not run on GitHub in this session. |
| Optional local device agent / arbitrary external integrations | Not implemented | The user selected web search as the integration priority. Paired desktop/file automation and arbitrary MCP/GitHub/Slack access are separate capabilities, not represented as completed features. |
| Deployment / production operations | Excluded | No live deployment, external monitoring setup, production backup configuration, or production readiness claim. |

## Required account actions

The user is checking both provider quotas. Enable or replenish generation quota/credits for OpenAI and Google Search grounding quota for the Gemini API project. Then repeat a GPT node and the **Web search with sources** template. A successful ordinary Gemini generation does not prove Google Search grounding quota is available.

## Start locally

Open Docker Desktop and wait for its engine, then run `npm run dev:all` from the repository root. Open `http://localhost:3002`. Individual commands remain `npm run dev:api`, `npm run dev:ai`, and `npm run dev`. Avoid launching a second copy on the same ports.

For a search workflow runtime input:

```json
{"query":"What do the official Next.js docs say about Server Components?"}
```

Use **Templates → Web search with sources**. Research-only templates still analyze supplied context; they do not silently browse.

## Verification commands

- `npm test` — deterministic API, web client and AI tests.
- `npm --workspace apps/web run lint` — frontend lint.
- From `apps/web`: `$env:NEXT_DIST_DIR='.next-completion'; npm run build` — production build using a separate output directory on Windows.
- `npm run test:integration` — isolated PostgreSQL schema, fake AI HTTP server, real Nest HTTP/API/worker flow, automatic test cleanup.
- With the AI service running: `npm run test:integration:live` — explicitly uses live Gemini and may consume provider quota. It still isolates application test data.
- `npm --workspace apps/api run db:migrate:deploy` — applies only pending existing migrations; no reset.

The code follows [Google's grounding contract](https://ai.google.dev/gemini-api/docs/generate-content/google-search) and [OpenAI's structured output contract](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). Provider billing, model access and rate limits remain controlled by the account owner.
