# API contracts

## October 28 additions

- `GET /api/ai/configuration`: authenticated application route. Returns connectivity, default model, provider names, configured-key booleans, allowed model IDs and generation limits. It never returns credentials.
- `GET /api/auth/me`: includes the validated session's `organizationId` and role so Settings can identify the current workspace.
- `GET /ai/configuration`: internal AI route; requires `X-AI-Service-Secret`. Returns safe provider configuration.
- `POST /ai/search`: internal AI route; requires the shared secret, `WEB_SEARCH_ENABLED=true`, and a Gemini key. Body: `{"query":"question","max_results":5,"timeout_ms":60000}`. Query length: 1–2000, sources: 1–10, timeout: 1000–60000 ms. Returns structured agent fields plus `searchSources`, `searchQueries`, `searchSuggestionsHtml`, and provider usage. No grounded sources: 502; provider quota: 429; timeout: 504.
- Web Search nodes use `type:"tool"` and `data:{toolKind:"web-search",inputPath:"input.query",maxResults:5}` or a fixed `searchQuery`. Workspace edit/run permissions and the AI service's server enable switch are enforced. The tool does not fetch arbitrary user URLs.
- Unexpected AI failures return safe reference IDs; logs record exception type and code locations without prompts or raw provider strings. Complete graph state is filtered to response fields before HTTP validation.

The existing workspace APIs are available through Settings: create, switch workspace, generate an invitation code, and accept an invitation. Membership/roles are checked on the server; codes are bound to their invited email and expire after seven days.

## Earlier contracts

These are the current implementation contracts for manual use and future UI integration. The workflow definition schema is an initial team proposal and should be reviewed before the frontend relies on it.

## NestJS API (`http://localhost:3001`)

### `POST /auth/register`

Request:

```json
{
  "email": "agent@example.com",
  "password": "replace-with-a-long-password",
  "organizationName": "Demo Store"
}
```

Returns `access_token`, `token_type`, `expires_in`, and a public `user` object. Passwords are hashed before storage. Registration creates a new organization and its first user.

### `POST /auth/login`

Request:

```json
{
  "email": "agent@example.com",
  "password": "replace-with-a-long-password"
}
```

Returns the same token shape. Send it on protected calls as `Authorization: Bearer <access_token>`.

### `POST /workflows`

Requires a bearer token. Request:

```json
{
  "name": "Retail order help",
  "definition": {
    "name": "Retail order help",
    "version": 1,
    "nodes": [
      { "id": "intake", "type": "input", "config": {} },
      { "id": "reply", "type": "output", "config": {} }
    ],
    "edges": [{ "source": "intake", "target": "reply" }]
  }
}
```

### `GET /workflows`

Requires a bearer token. Lists workflows owned by the token's organization.

### `GET /workflows/:id`

Requires a bearer token. Returns a workflow only when it belongs to the token's organization; otherwise returns 404.

### `PATCH /workflows/:id`

Requires a bearer token. Accepts either `name`, `definition`, or both. A successful update increments the workflow's integer `version`.

Errors use NestJS HTTP status codes and JSON `{ "statusCode": ..., "message": ... }` responses. Invalid workflow definitions return 400. Missing/expired tokens return 401.

## FastAPI AI service (`http://localhost:8000`)

### `GET /ai/health`

Returns `{"status":"ok","service":"ai"}`.

### `POST /ai/chat`

Request:

```json
{
  "customer_message": "Where is my order?",
  "conversation_id": "optional-client-id"
}
```

Response:

```json
{
  "message": "Could you share your order number so I can help?",
  "intent": "order_status",
  "needs_human": false
}
```

The AI service uses local Ollama; the Docker Compose defaults are `OLLAMA_MODEL=qwen3:4b` and `OLLAMA_BASE_URL=http://host.docker.internal:11434`. Ollama must be running on the host and the model must be pulled with `ollama pull qwen3:4b`. If Ollama is unavailable, `/ai/chat` returns 502; timeouts return 504 and invalid structured output returns 502. This endpoint has no order lookup or account tools yet, so it must not claim to have changed or checked an order.
