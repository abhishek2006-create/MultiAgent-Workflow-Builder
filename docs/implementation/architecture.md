# Current architecture

## Services

- **Next.js web app** serves the dashboard, workflow list/editor, templates, and execution history. Browser requests use the same-origin `/api` proxy and HttpOnly session cookie.
- **NestJS API** owns authentication, workspace authorization, workflow/version APIs, execution records, approvals, dashboard aggregation, and health endpoints.
- **PostgreSQL with Prisma** stores users/workspaces, workflow definitions and immutable versions, executions, per-node steps, approvals, and worker leases.
- **NestJS execution worker** polls PostgreSQL for queued or stale jobs, claims one under a row lock, renews a lease, and executes the exact saved version snapshot.
- **FastAPI AI service** accepts only the shared service secret, validates bounded requests, calls the Google GenAI SDK, validates structured agent output, and reports provider token counts when available.

## Execution lifecycle

The API validates the saved graph and runtime input before inserting a `QUEUED` execution. Input nodes may define a bounded JSON Schema, and any non-input node may validate its result against an output schema. The execution pins an immutable workflow version and stores the runtime input. The worker orders nodes topologically, propagates connected outputs, routes explicit condition branches, records step input/output/errors/timing/usage, applies configured AI-node timeouts and bounded transient-error retries, and pauses at persisted human approval nodes. The editor polls persisted execution state, animates the active node and incoming edge, and displays step results. A user can cancel active work or create a new retry from a failed run's pinned version and input.

Workers renew a 60-second lease every 10 seconds. Expired or missing leases are reclaimed under a PostgreSQL row lock. This provides at-least-once recovery; an external provider call can repeat if a worker crashes after the response and before the database commit. One API process executes one job at a time. Within that run, up to four independent ready graph nodes run concurrently; dependent nodes wait for all their upstream nodes to reach a completed or skipped state. AI-node retry counts are limited to three, use short capped backoff, and persist in `WorkflowExecutionStep.retryCount`.

## Authorization and tools

Nest guards derive organization membership and role from the authenticated session. API queries scope workflow/execution records by organization. The AI service uses a separate high-entropy shared secret and does not receive browser credentials. Provider keys remain in server-side environment variables.

Enabled tool nodes are deterministic local utilities: calculator, text, JSON, and date. They have bounded input and safe path lookup. Unsupported tool kinds fail before execution. Arbitrary code, shell, external HTTP/search/database, MCP, and local-device operations are not enabled.

## Monitoring and limits

API liveness and database readiness are separate. Persisted workflow steps and execution history are the source of progress. The dashboard reports workspace status counts and provider-reported token totals from the latest 10 runs. It does not estimate cost. Pending approvals are available in a workspace-scoped inbox. There is no external queue, metrics exporter, alerting system, or paired local agent.

## Local operation

See [local-development.md](local-development.md) for setup and verification. The app can run deterministic Input/Output/Approval/Tool workflows without a provider key. Agent nodes require a configured AI URL, matching API/AI service secret, an allowed model, and the key for the selected provider (`OPENAI_API_KEY` for GPT or `GEMINI_API_KEY` for Gemini). See [environment-reference.md](environment-reference.md) and [completion-inventory.md](completion-inventory.md) for limits and current verification state.
