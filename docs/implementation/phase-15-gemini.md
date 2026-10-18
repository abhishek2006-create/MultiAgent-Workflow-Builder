# Phase 15 — Gemini provider integration

## Purpose and data flow

Agent nodes route from their selected model ID: `gemini-*` uses Google's `google-genai` SDK and `GEMINI_API_KEY`; `gpt-*` uses OpenAI's Responses API and `OPENAI_API_KEY`. Each provider has a server-side model allowlist and bounded generation settings. Structured JSON is validated with Pydantic, provider usage is persisted per execution step when available, and configuration, timeout, provider, and malformed-output failures return distinct service errors. OpenAI responses are sent with storage disabled.

## File manifest

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/ai/app/graph.py` | Existing | Routes Gemini and OpenAI requests by selected model and validates structured output. |
| `apps/ai/pyproject.toml` | Existing | Adds `google-genai` and removes the unused Ollama integration. |
| `apps/ai/.env.example` | New | Documents API key/model/provider values without credentials. |
| `docker-compose.yml` | Existing | Passes optional provider configuration into the AI container. |
| `docs/implementation/phase-15-gemini.md` | New | Provider behavior, configuration, and verification limits. |

## Configuration and limitations

Set `OPENAI_API_KEY` for GPT nodes and `GEMINI_API_KEY` for Gemini nodes in the server-side AI environment. The editor offers GPT-5.5, GPT-6 Astra, Gemini 3.8 Flash, and Gemini 3.5 Flash-Lite. `OPENAI_ALLOWED_MODELS` and `GEMINI_ALLOWED_MODELS` restrict model IDs. The AI service loads its local `.env`; Compose passes configured secrets as environment values. The application does not configure search grounding or other model tools; research prompts prohibit claiming external searches. OpenAI uses the Responses API with strict JSON-schema output and storage disabled.

## Verification status

Python syntax and application imports pass, `google-genai` 1.75.0 is installed, and the current SDK accepts the structured-output and thinking configuration. Six synchronous provider/schema tests pass. Async tests are blocked by this host: the project venv is Python 3.14.7 (the project requires 3.12–3.13), and a basic event-loop probe also hangs under the bundled Python 3.12.14 runtime. OpenAI's configured key listed GPT-5.5 through `GET /v1/models`, while a minimal Responses generation request returned HTTP 429. No live Gemini request was made, so Gemini generation and worker-to-Gemini execution remain unverified.
