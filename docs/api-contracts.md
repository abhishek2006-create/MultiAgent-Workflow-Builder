# Initial API contracts

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
