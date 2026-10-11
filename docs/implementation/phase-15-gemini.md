# Phase 15 — Gemini provider integration

## Purpose and data flow

The support node now calls Google's supported `google-genai` Python SDK using `GEMINI_API_KEY` and `GEMINI_MODEL`. It requests JSON constrained to the existing `ChatResponse` schema, validates the parsed result again with Pydantic, and converts missing configuration, provider timeout, provider failure, and malformed output into separate service errors. It never presents a canned answer as a model response.

## File manifest

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/ai/app/graph.py` | Existing | Uses asynchronous Gemini generation and enforces structured output. |
| `apps/ai/pyproject.toml` | Existing | Adds `google-genai` and removes the unused Ollama integration. |
| `apps/ai/.env.example` | New | Documents API key/model/provider values without credentials. |
| `docker-compose.yml` | Existing | Passes Gemini configuration into the AI container. |
| `docs/implementation/phase-15-gemini.md` | New | Provider behavior, configuration, and verification limits. |

## Configuration and limitations

Set `GEMINI_API_KEY` in the deployment environment and optionally override `GEMINI_MODEL`. The default is `gemini-3.8-flash`; Google's current model guidance recommends it for new projects, while access to Gemini 2.5 Flash is limited to users who have actively used it. [Gemini model guidance](https://ai.google.dev/gemini-api/docs/models). The model cannot look up orders, mutate accounts, or use tools; prompts explicitly prohibit claiming those actions. No provider key is present in the repository template.

## Verification status

Python syntax passed, `google-genai` 1.75.0 installed in the current local environment, and the SDK structured-output/client close configuration was checked. The three FastAPI tests pass. A live Gemini call requires a valid key, which is intentionally not read or printed from local secret files. The service returns 503 when the key is absent and 502/504 for provider or output failures. Live provider generation and worker-to-Gemini execution remain unverified.
