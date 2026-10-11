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

These agent roles currently share one Gemini model and one structured response contract. Their role instructions differ, but external search, code execution, database access, tool permission grants, and provider usage/token reporting are not implemented. A workflow composes agents by connecting nodes, rather than having agents dynamically invoke one another outside the graph.
