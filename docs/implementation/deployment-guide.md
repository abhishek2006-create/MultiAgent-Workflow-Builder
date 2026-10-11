# Deployment guide

## Current deployment shape

The repository has Dockerfiles for the Nest API and FastAPI AI service plus `docker-compose.yml` for PostgreSQL/API/AI local orchestration. There is no web Dockerfile, CI deployment workflow, managed database setup, or separate worker image. Compose is a local integration environment; do not treat it as a production deployment recipe.

## Local Compose startup

From the repository root in PowerShell, set these in the current shell using locally generated values and a Gemini key from the operator's secret store:

```powershell
$env:JWT_SECRET = '<at-least-32-random-characters>'
$env:AI_SERVICE_SECRET = '<same-at-least-32-random-characters-for-api-and-ai>'
$env:GEMINI_API_KEY = '<Gemini API key>'
docker compose up --build -d
docker compose logs -f api ai
```

The API container runs `prisma migrate deploy` before starting Nest. Compose waits for PostgreSQL readiness before starting the API; it does not wait for Gemini availability. Verify `http://localhost:3001/api/health/ready`, `http://localhost:8000/ai/health`, and the web application running separately at the configured `WEB_ORIGIN`.

```powershell
docker compose down
```

This stops containers but preserves the named `postgres_data` volume. Do not use `docker compose down -v` unless intentionally deleting local database data.

## Production deployment sequence

1. Provision a managed PostgreSQL database with TLS, backups, and a dedicated least-privilege application role.
2. Configure the deployment secret store with `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `AI_SERVICE_URL`, `AI_SERVICE_SECRET`, `GEMINI_API_KEY`, and OAuth credentials if enabled.
3. Build API, AI, and web images from a reviewed commit. The web image is not yet supplied in this repository and must be added before containerized production deployment.
4. Run the API migration command once as a controlled release job: `npm --workspace apps/api run db:migrate:deploy` (or the API container's current startup command).
5. Deploy API and AI privately; do not publish the AI port publicly. Deploy Next with `API_INTERNAL_URL` set to the reachable API origin and `WEB_ORIGIN` set to the deployed frontend origin.
6. Verify API readiness, Next-to-API session proxying, login/logout, and a safe no-key AI configuration response before enabling model traffic.
7. Enable Gemini only after a key and billing/quota policy are configured. The current execution worker is in-process and needs separate reliable worker deployment before production workloads.

## Database backup and restore

Use the managed provider's encrypted automated backups and point-in-time recovery. Document retention, access controls, and restore drills in that provider's console. For a PostgreSQL logical backup, use the provider-approved `pg_dump`/`pg_restore` procedure with TLS and credentials injected through a secure prompt or secret manager; never put the password in command history. Restore into a separate database first, verify row counts and application readiness, then perform an approved cutover. This repository does not automate backups or disaster-recovery cutover.

## Rollback

Rollback application images to the previous release only after reviewing migration compatibility. Migrations are additive in the current changes, but automatic rollback is not provided. Do not reset production schema or delete migration history. Restore database data only through an approved backup recovery plan.
