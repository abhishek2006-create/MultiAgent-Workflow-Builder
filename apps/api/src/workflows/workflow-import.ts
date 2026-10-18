import { BadRequestException } from "@nestjs/common";
import { validateWorkflowGraph } from "./graph-validation";

const SECRET_FIELD = /(?:api.?key|access.?token|refresh.?token|secret|password|credential)/i;

export function validateImportedWorkflow(definition: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}): void {
  rejectEmbeddedCredentials(definition);
  const result = validateWorkflowGraph(definition.nodes, definition.edges);
  if (!result.valid) {
    throw new BadRequestException({
      message: "Imported workflow is invalid.",
      errors: result.errors,
    });
  }
}

function rejectEmbeddedCredentials(value: unknown, depth = 0): void {
  if (depth > 24) throw new BadRequestException("Imported workflow nesting is too deep.");
  if (Array.isArray(value)) {
    if (value.length > 2_000) throw new BadRequestException("Imported workflow contains an oversized array.");
    for (const child of value) rejectEmbeddedCredentials(child, depth + 1);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_FIELD.test(key)) {
      throw new BadRequestException(`Imported workflow contains a credential field (${key}); credentials must be configured on the server.`);
    }
    rejectEmbeddedCredentials(child, depth + 1);
  }
}
