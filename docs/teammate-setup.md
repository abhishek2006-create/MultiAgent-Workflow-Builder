# Teammate setup and implementation order

## Start services

Copy `.env.example` to `.env` and set a long random `JWT_SECRET`. Install and start Ollama on the Windows host, then pull the model once:

```powershell
ollama pull qwen3:4b
```

The Compose AI container uses `OLLAMA_MODEL=qwen3:4b` and connects to Ollama at `http://host.docker.internal:11434`. `host.docker.internal` lets a container address the Windows host. Ollama normally listens only on localhost. If the AI container gets a connection-refused error after Ollama is running, Docker cannot reach that listener. Ollama's Windows instructions say to quit Ollama, add a user environment variable named `OLLAMA_HOST` with value `0.0.0.0:11434`, then relaunch it. This makes the Ollama API listen beyond localhost; only do this on a trusted development machine and restrict access with Windows Firewall. Restart the AI container after changing the setting.

Then run:

```powershell
npm install
docker compose up --build
```

Check `GET http://localhost:3001/health` and `GET http://localhost:8000/ai/health`. See `api-contracts.md` for the complete current request/response shapes.

## Implemented backend work

- Prisma models and a source-controlled initial migration for organizations, users, and workflows.
- NestJS Prisma provider, register/login routes, password hashing, signed bearer tokens, and a JWT guard.
- Organization-scoped workflow create/list/read/update routes with JSON Schema validation.
- FastAPI LangGraph node using LangChain's Ollama integration and the structured ChatResponse schema.
- Explicit 503 configuration, 504 timeout, and 502 provider/output errors.

## Manual PowerShell examples

```powershell
$register = Invoke-RestMethod -Method Post -Uri http://localhost:3001/auth/register -ContentType 'application/json' -Body '{"email":"agent@example.com","password":"replace-with-a-long-password","organizationName":"Demo Store"}'
$token = $register.access_token
$headers = @{ Authorization = "Bearer $token" }
$body = Get-Content .\examples\workflows\retail-order-help.json -Raw
$request = @{ name = 'Retail order help'; definition = ($body | ConvertFrom-Json -AsHashtable) } | ConvertTo-Json -Depth 30
$workflow = Invoke-RestMethod -Method Post -Uri http://localhost:3001/workflows -Headers $headers -ContentType 'application/json' -Body $request
Invoke-RestMethod -Method Get -Uri http://localhost:3001/workflows -Headers $headers
```

Replace the example email/password before reusing it. To call the AI service while Ollama is running and `qwen3:4b` is available, use:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/ai/chat -ContentType 'application/json' -Body '{"customer_message":"Where is my order?"}'
```

## Current boundaries

- The UI is not required to build or exercise the APIs; the examples above call them directly.
- The workflow routes save and retrieve graph definitions. They do not execute DAGs yet.
- The AI endpoint has no retail database or order tools. Its prompt explicitly avoids claiming an order lookup or change occurred.
- τ³-bench remains isolated under `eval/tau3`. Add its agent adapter once a workflow execution path can be evaluated end to end; do not make it a runtime dependency of the builder.
