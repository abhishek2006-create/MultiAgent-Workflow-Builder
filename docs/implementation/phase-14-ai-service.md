# Phase 14 — Python AI service foundation

## Purpose and data flow

The FastAPI process is an internal service behind the Nest API. Nest sends a bounded JSON request to `AI_SERVICE_URL` with `X-AI-Service-Secret`; FastAPI checks the shared secret in constant time, validates the request with Pydantic, invokes its LangGraph, and returns a validated response. The Nest client applies an explicit timeout and maps upstream failures to gateway/service errors.

## File manifest

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/ai/app/main.py` | Existing | FastAPI health/chat routes and internal service authentication. |
| `apps/ai/app/schemas.py` | Existing | Bounded request and structured support response contracts. |
| `apps/ai/app/graph.py` | Existing | LangGraph boundary and provider error handling. |
| `apps/ai/pyproject.toml` | Existing | Declares Python service dependencies. |
| `apps/ai/.env.example` | New | Safe AI runtime configuration template. |
| `apps/api/src/ai/ai-client.service.ts` | New | Authenticated, timeout-bounded HTTP client with response validation. |
| `apps/api/src/ai/ai.module.ts` | New | Exports the internal AI client to API modules. |
| `apps/api/src/app.module.ts` | Existing | Registers the AI client and validates timeout/production secret configuration. |
| `apps/api/.env.example` | Existing | Documents API-side AI URL, secret, and timeout settings. |
| `docker-compose.yml` | Existing | Connects API and AI with a required shared secret and OpenAI/Gemini configuration. |
| `docs/implementation/phase-14-ai-service.md` | New | Service contract, file responsibilities, and verification. |

## Verification

- `apps/ai/.venv/Scripts/python.exe -m compileall -q apps/ai/app` passed after provider and agent updates.
- `npm --workspace apps/api run build` passed after the AI client/worker wiring.
- FastAPI validates the internal service secret and request data, and reports missing configuration for the provider selected by model ID. `/ai/health` remains a non-sensitive liveness endpoint.
- A complete `pip install -e apps/ai` was blocked because the only local interpreter is Python 3.14.7 while the project specifies 3.12–3.13; individual declared packages were installed only to run the local checks.

## Operational notes

Use the same high-entropy `AI_SERVICE_SECRET` for API and AI. The template contains placeholders only. Docker Compose requires explicit AI and JWT secrets instead of silently starting with hardcoded defaults. The AI service does not expose provider keys through its API.
