# Environment reference

Use `apps/api/.env.example`, `apps/ai/.env.example`, and `apps/web/.env.example` as placeholder-only references. Keep real values in the deployment platform's secret store or an untracked local environment file.

| Variable | Service | Required | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | API | Yes | PostgreSQL URL. Use a least-privilege application account and TLS in production. |
| `API_PORT` | API | No (3001) | Nest listener port. |
| `WEB_ORIGIN` | API | Yes for deployment | Comma-separated exact browser origins; production must use HTTPS origins and cannot use localhost. |
| `JWT_SECRET` | API | Yes | Signs application session tokens; production requires at least 32 non-placeholder characters. |
| `JWT_EXPIRES_IN` | API | No | Reserved template direction; current JWT module uses seven days. |
| `AI_SERVICE_URL` | API | Yes for AI runs | Internal FastAPI base URL, such as `http://ai:8000`. |
| `AI_SERVICE_SECRET` | API and AI | Yes for AI runs | Shared high-entropy service-to-service secret; production API validation requires at least 32 characters. |
| `AI_REQUEST_TIMEOUT_MS` | API | No (65000) | Internal AI request timeout (1000–120000 ms). |
| `AI_PORT` | AI | No (8000) | FastAPI listener port. |
| `AI_DEFAULT_MODEL` | AI | No (Gemini 3.8 Flash) | Model used when a workflow node has no selected model. The model prefix chooses its provider. |
| `GEMINI_API_KEY` | AI | Required for Gemini nodes | Server-side Google Gemini API key. Never expose this to the browser. |
| `GEMINI_MODEL` | AI | No (`gemini-3.8-flash`) | Gemini model identifier. |
| `GEMINI_ALLOWED_MODELS` | AI | No (stable models in the AI service) | Comma-separated server-side allowlist; currently defaults to `gemini-3.8-flash,gemini-3.5-flash-lite`. |
| `OPENAI_API_KEY` | AI | Required for GPT nodes | Server-side OpenAI API key. Never expose this to the browser. |
| `OPENAI_MODEL` | AI | No (`gpt-5.5`) | OpenAI model identifier. |
| `OPENAI_ALLOWED_MODELS` | AI | No (configured GPT models) | Comma-separated server-side allowlist; defaults to `gpt-5.5,gpt-6-astra`. |
| `AI_PROVIDER_TIMEOUT_MS` | AI | No (60000) | Selected provider request timeout (1000–60000 ms). |
| `NEXT_PUBLIC_API_URL` | Web | No (`/api`) | Browser-visible API path only; should normally remain same-origin `/api`. |
| `API_INTERNAL_URL` | Web runtime/build | Deployment-specific | Nest origin reachable from the Next server for rewrites and session checks. |
| `NEXT_DIST_DIR` | Web build/runtime | No (`.next`) | Optional single-directory build output name. Development uses `.next-dev`. On this Windows host, `.next-verify` avoids the default output-directory `EPERM`; keep the same value when starting that production build. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | API | Optional | Google OAuth credentials and exact registered callback. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | API | Optional | GitHub OAuth credentials and exact registered callback. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose PostgreSQL | Local Compose | Local-only database initialization. Production should use a managed database and separately managed credentials. |

The API accepts `DATABASE_URL` and `JWT_SECRET` at startup. Production additionally validates JWT strength, frontend origins, and AI shared-secret length. OAuth is unavailable unless the provider's three values are configured. Current local dev values and the local provider key must be supplied by the operator, not copied from this document.
