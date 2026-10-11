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
| `AI_REQUEST_TIMEOUT_MS` | API | No (25000) | Internal AI request timeout (1000–120000 ms). |
| `AI_PORT` | AI | No (8000) | FastAPI listener port. |
| `AI_PROVIDER` | AI | No (`gemini`) | Provider selector; only Gemini is supported. |
| `GEMINI_API_KEY` | AI | Yes for model execution | Server-side Google Gemini API key. Never expose this to the browser. |
| `GEMINI_MODEL` | AI | No (`gemini-3.8-flash`) | Gemini model identifier. |
| `NEXT_PUBLIC_API_URL` | Web | No (`/api`) | Browser-visible API path only; should normally remain same-origin `/api`. |
| `API_INTERNAL_URL` | Web runtime/build | Deployment-specific | Nest origin reachable from the Next server for rewrites and session checks. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | API | Optional | Google OAuth credentials and exact registered callback. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | API | Optional | GitHub OAuth credentials and exact registered callback. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose PostgreSQL | Local Compose | Local-only database initialization. Production should use a managed database and separately managed credentials. |

The API accepts `DATABASE_URL` and `JWT_SECRET` at startup. Production additionally validates JWT strength, frontend origins, and AI shared-secret length. OAuth is unavailable unless the provider's three values are configured. Current local dev values and the local provider key must be supplied by the operator, not copied from this document.
