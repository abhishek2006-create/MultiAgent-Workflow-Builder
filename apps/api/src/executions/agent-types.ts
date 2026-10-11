export type WorkflowAgentType = "support" | "planner" | "research" | "coding" | "reviewer";

const agentTypes = new Set<WorkflowAgentType>(["support", "planner", "research", "coding", "reviewer"]);

export function resolveAgentType(
  nodeType: string,
  data: Record<string, unknown> = {},
): WorkflowAgentType {
  if (typeof data.agentType === "string" && agentTypes.has(data.agentType as WorkflowAgentType)) {
    return data.agentType as WorkflowAgentType;
  }
  if (nodeType === "reviewer") return "reviewer";

  const label = typeof data.label === "string" ? data.label : "";
  const identity = `${label} ${typeof data.name === "string" ? data.name : ""}`.toLowerCase();
  for (const type of ["planner", "research", "coding"] as const) {
    if (identity.includes(type)) return type;
  }
  return "support";
}
