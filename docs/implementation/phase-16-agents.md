# Phase 16 — Agent definitions and multi-agent orchestration

## Data flow

The workflow graph carries each node's input and output to connected downstream nodes in topological order. Agent, LLM, and reviewer nodes accept a typed agent role (`support`, `planner`, `research`, `coding`, or `reviewer`) and bounded instructions. Nest calls the internal FastAPI service with that role and context; FastAPI validates the role and sends a role-aware prompt to Gemini, then validates a structured response. Each agent handoff is recorded as a workflow execution step.

## Files

| File | Status | Responsibility |
| --- | --- | --- |
| `apps/ai/app/schemas.py` | Existing | Defines allowed agent roles and bounded instructions. |
| `apps/ai/app/graph.py` | Existing | Uses a role-aware multi-agent prompt and typed result. |
| `apps/api/src/ai/ai-client.service.ts` | New | Sends agent context to FastAPI and validates its response. |
| `apps/api/src/workflows/graph-validation.ts` | Existing | Rejects unsupported agent roles and invalid instruction sizes. |
| `apps/api/src/executions/execution-worker.service.ts` | New | Passes node outputs to connected downstream nodes and persists handoffs. |
| `docs/implementation/phase-16-agents.md` | New | Describes agent contract and boundaries. |

## Limits

These roles share the Gemini provider adapter but use role-specific structured fields for plans, success criteria, research findings, inferences, review results, issues, and code proposals. The server validates model, generation limits, and optional input mapping. Research can use only connected workflow input; sources must appear in that supplied context. Coding returns proposals and never executes code. Provider token counts are stored per step when Gemini returns complete metadata. External search, database access, per-agent external tool grants, and dynamic agent-to-agent calls remain unsupported. A workflow composes agents through connected graph nodes.
