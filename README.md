# Retail Support Workflow Builder

Starter monorepo for a retail customer-support workflow builder. The NestJS API and FastAPI AI service are independent services so they can be developed and exercised before the frontend is integrated.

## Services

- `apps/api`: NestJS API with PostgreSQL/Prisma-backed registration, login, and workflow CRUD
- `apps/ai`: FastAPI service with LangGraph routing selected `gpt-*` models to OpenAI and `gemini-*` models to Gemini for structured output
- `apps/web`: placeholder for the separately owned Next.js frontend
- `packages/contracts`: provisional workflow JSON Schema
- `eval/tau3`: separate location for future τ³-bench evaluation setup

The workflow schema and AI response shape are initial contracts. Review them with the frontend owner before integrating. The `eval/tau3` environment remains separate and is not imported by the product services.

## Start with Docker

1. Copy `.env.example` to `.env`, set a long random `JWT_SECRET`, and configure `AI_SERVICE_SECRET` plus the OpenAI or Gemini API keys for the models you want to use.
2. Run `docker compose up --build`.
3. Check `http://localhost:3001/health` and `http://localhost:8000/ai/health`.
4. See `docs/api-contracts.md` for routes and `docs/teammate-setup.md` for examples.
