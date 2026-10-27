import type { WorkflowNode } from "../../types/workflow";

export const defaultRuntimeInput = {
  request: "Create a short plan and a small JavaScript example for calculating an order total.",
  context: "The total is price multiplied by quantity plus delivery. Use only the supplied facts.",
  requirements: ["Keep each agent response concise", "Include a short example", "Review the result for correctness"],
};

export function exampleRuntimeInput(nodes: WorkflowNode[]): Record<string, unknown> {
  const examples = nodes.find((node) => node.type === "input")?.data.inputSchema?.examples;
  if (Array.isArray(examples) && examples[0] && typeof examples[0] === "object" && !Array.isArray(examples[0])) return examples[0];
  if (nodes.some((node) => node.data.toolKind === "web-search" && node.data.inputPath === "input.query")) {
    return { query: "What does the official Next.js documentation say about Server Components?" };
  }
  if (nodes.some((node) => node.data.toolKind === "json" && node.data.toolOperation === "parse" && node.data.inputPath === "input.json")) {
    return { json: JSON.stringify({ message: "Hello from FlowForge", total: 42 }) };
  }
  return defaultRuntimeInput;
}
