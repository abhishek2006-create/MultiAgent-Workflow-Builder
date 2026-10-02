# Retail Support Workflow Builder

Starter monorepo for a retail customer-support workflow builder. The NestJS API and FastAPI AI service are independent services so they can be developed and exercised before the frontend is integrated.

## Services

- `apps/api`: NestJS API with PostgreSQL/Prisma-backed registration, login, and workflow CRUD
- `apps/ai`: FastAPI service with a LangGraph node calling a local Ollama model for structured output
- `apps/web`: placeholder for the separately owned Next.js frontend
- `packages/contracts`: provisional workflow JSON Schema
- `eval/tau3`: separate location for future τ³-bench evaluation setup

The workflow schema and AI response shape are initial contracts. Review them with the frontend owner before integrating. The `eval/tau3` environment remains separate and is not imported by the product services.

## Start with Docker

1. Copy `.env.example` to `.env` and set a long random `JWT_SECRET`. Start Ollama on your PC and run `ollama pull qwen3:4b` once. The default Docker configuration connects to `http://host.docker.internal:11434` and uses `qwen3:4b`.
2. Run `docker compose up --build`.
3. Check `http://localhost:3001/health` and `http://localhost:8000/ai/health`.
4. See `docs/api-contracts.md` for routes and `docs/teammate-setup.md` for examples.
