import { inputSchemaDefinitionError } from "../executions/input-schema";

export interface GraphValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationIssue[];
  warnings: GraphValidationIssue[];
}

const SUPPORTED_NODE_TYPES = new Set([
  "input",
  "output",
  "agent",
  "llm",
  "reviewer",
  "approval",
  "condition",
  "tool",
]);

const TOOL_KINDS = new Set([
  "calculator",
  "text",
  "json",
  "date",
  "web-search",
]);
const AGENT_TYPES = new Set(["support", "planner", "research", "coding", "reviewer"]);
const AGENT_MODELS = new Set([
  "Gemini",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gpt-5.5",
  "gpt-6-astra",
]);

export function validateWorkflowGraph(
  nodes: unknown[],
  edges: unknown[],
): GraphValidationResult {
  const errors: GraphValidationIssue[] = [];
  const warnings: GraphValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const adjacency = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  if (nodes.length === 0) {
    errors.push({ code: "EMPTY_WORKFLOW", message: "Workflow must contain at least one node." });
  }

  for (const item of nodes) {
    if (!isRecord(item)) {
      errors.push({ code: "INVALID_NODE", message: "Each node must be an object." });
      continue;
    }
    const nodeId = item.id;
    const nodeType = item.type;
    if (typeof nodeId !== "string" || nodeId.trim().length === 0) {
      errors.push({ code: "INVALID_NODE_ID", message: "Each node must have a non-empty string id." });
      continue;
    }
    if (nodeIds.has(nodeId)) {
      errors.push({ code: "DUPLICATE_NODE_ID", message: `Node id "${nodeId}" appears more than once.`, nodeId });
      continue;
    }
    nodeIds.add(nodeId);
    adjacency.set(nodeId, []);
    incoming.set(nodeId, 0);
    outgoing.set(nodeId, 0);

    if (typeof nodeType !== "string" || !SUPPORTED_NODE_TYPES.has(nodeType)) {
      errors.push({
        code: "UNSUPPORTED_NODE_TYPE",
        message: `Node "${nodeId}" has an unsupported type.`,
        nodeId,
      });
    }
    if (!isPosition(item.position)) {
      errors.push({
        code: "INVALID_NODE_POSITION",
        message: `Node "${nodeId}" position must contain finite numeric x and y values.`,
        nodeId,
      });
    }
    if (!isRecord(item.data)) {
      errors.push({ code: "INVALID_NODE_DATA", message: `Node "${nodeId}" data must be an object.`, nodeId });
    }
    if (nodeType === "input" && isRecord(item.data) && item.data.inputSchema !== undefined) {
      const schemaError = inputSchemaDefinitionError(item.data.inputSchema);
      if (schemaError) errors.push({ code: "INVALID_INPUT_SCHEMA", message: `Input node "${nodeId}": ${schemaError}`, nodeId });
    }
    if (isRecord(item.data) && item.data.outputSchema !== undefined) {
      const schemaError = inputSchemaDefinitionError(item.data.outputSchema);
      if (schemaError) errors.push({ code: "INVALID_OUTPUT_SCHEMA", message: `Node "${nodeId}" output: ${schemaError.replace(/Input node schema/g, "Output schema").replace(/Input schema/g, "Output schema")}`, nodeId });
    }
    if (
      nodeType === "tool" &&
      isRecord(item.data) &&
      item.data.toolKind !== undefined &&
      (typeof item.data.toolKind !== "string" || !TOOL_KINDS.has(item.data.toolKind))
    ) {
      errors.push({ code: "UNSUPPORTED_TOOL_KIND", message: `Tool node "${nodeId}" has an unsupported tool kind.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === undefined) {
      errors.push({ code: "MISSING_TOOL_KIND", message: `Tool node "${nodeId}" must select a tool kind.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "calculator" &&
      (typeof item.data.expression !== "string" || !item.data.expression.trim() || item.data.expression.length > 500)) {
      errors.push({ code: "INVALID_CALCULATOR_EXPRESSION", message: `Calculator node "${nodeId}" requires an expression up to 500 characters.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "web-search") {
      if ((item.data.searchQuery !== undefined && (typeof item.data.searchQuery !== "string" || item.data.searchQuery.length > 2000)) ||
          (!item.data.searchQuery && !item.data.inputPath)) {
        errors.push({ code: "INVALID_SEARCH_QUERY", message: `Web search node "${nodeId}" needs a query up to 2000 characters or an input field path.`, nodeId });
      }
      if (item.data.maxResults !== undefined && (!Number.isInteger(item.data.maxResults) || Number(item.data.maxResults) < 1 || Number(item.data.maxResults) > 10)) {
        errors.push({ code: "INVALID_SEARCH_LIMIT", message: `Web search node "${nodeId}" must request 1–10 sources.`, nodeId });
      }
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "text" &&
      !new Set(["trim", "uppercase", "lowercase", "replace"]).has(String(item.data.toolOperation))) {
      errors.push({ code: "INVALID_TEXT_OPERATION", message: `Text node "${nodeId}" has an unsupported operation.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "json" &&
      !new Set(["parse", "stringify", "get"]).has(String(item.data.toolOperation))) {
      errors.push({ code: "INVALID_JSON_OPERATION", message: `JSON node "${nodeId}" has an unsupported operation.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "date" &&
      !new Set(["now", "addDays", "differenceDays"]).has(String(item.data.toolOperation))) {
      errors.push({ code: "INVALID_DATE_OPERATION", message: `Date node "${nodeId}" has an unsupported operation.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "json" && item.data.toolOperation === "get" &&
      (typeof item.data.fieldPath !== "string" || !item.data.fieldPath.trim() || item.data.fieldPath.length > 200)) {
      errors.push({ code: "INVALID_JSON_PATH", message: `JSON node "${nodeId}" requires a field path up to 200 characters.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind !== "calculator" &&
      item.data.inputPath !== undefined &&
      (typeof item.data.inputPath !== "string" || item.data.inputPath.length > 200)) {
      errors.push({ code: "INVALID_TOOL_INPUT_PATH", message: `Tool node "${nodeId}" input path must be a string up to 200 characters.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "date" && item.data.toolOperation !== "now" &&
      (typeof item.data.inputPath !== "string" || !item.data.inputPath.trim())) {
      errors.push({ code: "MISSING_DATE_INPUT_PATH", message: `Date node "${nodeId}" requires a start-date input path.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "date" && item.data.toolOperation === "addDays" &&
      (!Number.isFinite(Number(item.data.days)) || Math.abs(Number(item.data.days)) > 36_500)) {
      errors.push({ code: "INVALID_DATE_OFFSET", message: `Date node "${nodeId}" requires a finite offset within 100 years.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "date" && item.data.toolOperation === "differenceDays" &&
      (typeof item.data.endDatePath !== "string" || !item.data.endDatePath.trim() || item.data.endDatePath.length > 200)) {
      errors.push({ code: "INVALID_END_DATE_PATH", message: `Date node "${nodeId}" requires an end-date path up to 200 characters.`, nodeId });
    }
    if (nodeType === "tool" && isRecord(item.data) && item.data.toolKind === "text" && item.data.toolOperation === "replace" &&
      (typeof item.data.searchText !== "string" || !item.data.searchText || item.data.searchText.length > 1000 ||
        (item.data.replaceText !== undefined && (typeof item.data.replaceText !== "string" || item.data.replaceText.length > 1000)))) {
      errors.push({ code: "INVALID_TEXT_REPLACEMENT", message: `Text replace node "${nodeId}" requires bounded search and replacement text.`, nodeId });
    }
    if (nodeType === "condition" && isRecord(item.data)) {
      const operators = new Set(["exists", "truthy", "equals", "notEquals", "contains", "greaterThan", "lessThan"]);
      if (typeof item.data.conditionPath !== "string" || !item.data.conditionPath.trim() || item.data.conditionPath.length > 200) {
        errors.push({ code: "INVALID_CONDITION_PATH", message: `Condition node "${nodeId}" requires a field path up to 200 characters.`, nodeId });
      }
      if (typeof item.data.conditionOperator !== "string" || !operators.has(item.data.conditionOperator)) {
        errors.push({ code: "INVALID_CONDITION_OPERATOR", message: `Condition node "${nodeId}" has an unsupported operator.`, nodeId });
      }
    }
    if (
      ["agent", "llm", "reviewer"].includes(String(nodeType)) &&
      isRecord(item.data) && item.data.agentType !== undefined &&
      (typeof item.data.agentType !== "string" || !AGENT_TYPES.has(item.data.agentType))
    ) {
      errors.push({ code: "UNSUPPORTED_AGENT_TYPE", message: `Node "${nodeId}" has an unsupported agent type.`, nodeId });
    }
    if (["agent", "llm", "reviewer"].includes(String(nodeType)) && isRecord(item.data)) {
      if (item.data.inputPath !== undefined &&
        (typeof item.data.inputPath !== "string" || item.data.inputPath.length > 200)) {
        errors.push({ code: "INVALID_AGENT_INPUT_PATH", message: `Node "${nodeId}" input mapping must be a path up to 200 characters.`, nodeId });
      }
      if (item.data.model !== undefined && (typeof item.data.model !== "string" ||
        (!AGENT_MODELS.has(item.data.model) && !/^(?:gemini|gpt)-[a-zA-Z0-9._:-]{1,90}$/.test(item.data.model)))) {
        errors.push({ code: "UNSUPPORTED_AGENT_MODEL", message: `Node "${nodeId}" must use a supported OpenAI or Gemini model.`, nodeId });
      }
      if (item.data.temperature !== undefined &&
        (typeof item.data.temperature !== "number" || !Number.isFinite(item.data.temperature) || item.data.temperature < 0 || item.data.temperature > 1)) {
        errors.push({ code: "INVALID_AGENT_TEMPERATURE", message: `Node "${nodeId}" temperature must be between 0 and 1.`, nodeId });
      }
      if (item.data.thinkingLevel !== undefined && !new Set(["low", "medium", "high"]).has(String(item.data.thinkingLevel))) {
        errors.push({ code: "INVALID_AGENT_THINKING_LEVEL", message: `Node "${nodeId}" thinking level must be low, medium, or high.`, nodeId });
      }
      if (item.data.maxTokens !== undefined &&
        (!Number.isInteger(item.data.maxTokens) || Number(item.data.maxTokens) < 64 || Number(item.data.maxTokens) > 4096)) {
        errors.push({ code: "INVALID_AGENT_MAX_TOKENS", message: `Node "${nodeId}" output tokens must be between 64 and 4096.`, nodeId });
      }
      if (item.data.timeoutMs !== undefined &&
        (!Number.isInteger(item.data.timeoutMs) || Number(item.data.timeoutMs) < 1_000 || Number(item.data.timeoutMs) > 60_000)) {
        errors.push({ code: "INVALID_AGENT_TIMEOUT", message: `Node "${nodeId}" timeout must be between 1000 and 60000 milliseconds.`, nodeId });
      }
      if (item.data.maxRetries !== undefined &&
        (!Number.isInteger(item.data.maxRetries) || Number(item.data.maxRetries) < 0 || Number(item.data.maxRetries) > 3)) {
        errors.push({ code: "INVALID_AGENT_RETRIES", message: `Node "${nodeId}" retries must be an integer from 0 to 3.`, nodeId });
      }
    }
    if (
      isRecord(item.data) && item.data.instructions !== undefined &&
      (typeof item.data.instructions !== "string" || item.data.instructions.length > 4000)
    ) {
      errors.push({ code: "INVALID_INSTRUCTIONS", message: `Node "${nodeId}" instructions must be a string up to 4000 characters.`, nodeId });
    }
  }

  const inputNodes = nodes.filter((node) => isRecord(node) && node.type === "input" && typeof node.id === "string");
  const outputNodes = nodes.filter((node) => isRecord(node) && node.type === "output" && typeof node.id === "string");
  if (inputNodes.length === 0) {
    errors.push({ code: "MISSING_INPUT", message: "Workflow must contain an input node." });
  }
  if (outputNodes.length === 0) {
    errors.push({ code: "MISSING_OUTPUT", message: "Workflow must contain an output node." });
  }

  const edgeIds = new Set<string>();
  for (const item of edges) {
    if (!isRecord(item)) {
      errors.push({ code: "INVALID_EDGE", message: "Each edge must be an object." });
      continue;
    }
    const edgeId = typeof item.id === "string" ? item.id : undefined;
    if (item.id !== undefined && edgeId === undefined) {
      errors.push({ code: "INVALID_EDGE_ID", message: "Edge id must be a string.", edgeId: undefined });
    } else if (edgeId && edgeIds.has(edgeId)) {
      errors.push({ code: "DUPLICATE_EDGE_ID", message: `Edge id "${edgeId}" appears more than once.`, edgeId });
    } else if (edgeId) {
      edgeIds.add(edgeId);
    }

    if (typeof item.source !== "string" || typeof item.target !== "string") {
      errors.push({ code: "INVALID_EDGE_ENDPOINT", message: "Edge source and target must be node ids.", edgeId });
      continue;
    }
    if (!nodeIds.has(item.source)) {
      errors.push({ code: "INVALID_EDGE_SOURCE", message: `Edge references missing source node "${item.source}".`, edgeId });
      continue;
    }
    if (!nodeIds.has(item.target)) {
      errors.push({ code: "INVALID_EDGE_TARGET", message: `Edge references missing target node "${item.target}".`, edgeId });
      continue;
    }
    if (item.source === item.target) {
      errors.push({ code: "SELF_LOOP", message: `Edge connects node "${item.source}" to itself.`, nodeId: item.source, edgeId });
      continue;
    }
    const source = nodes.find((candidate) => isRecord(candidate) && candidate.id === item.source) as Record<string, unknown>;
    if (source.type === "condition" && item.sourceHandle !== "true" && item.sourceHandle !== "false") {
      errors.push({ code: "INVALID_CONDITION_BRANCH", message: `Edges from condition node "${item.source}" must use a true or false output.`, nodeId: item.source, edgeId });
    }

    adjacency.get(item.source)?.push(item.target);
    incoming.set(item.target, (incoming.get(item.target) ?? 0) + 1);
    outgoing.set(item.source, (outgoing.get(item.source) ?? 0) + 1);
  }

  if (hasCycle(nodeIds, adjacency)) {
    errors.push({ code: "CYCLE_DETECTED", message: "Workflow graph must not contain a directed cycle." });
  }

  const reachable = new Set<string>();
  const queue = inputNodes.map((node) => (node as Record<string, unknown>).id as string);
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) queue.push(target);
  }
  if (!outputNodes.some((node) => reachable.has((node as Record<string, unknown>).id as string))) {
    errors.push({ code: "NO_INPUT_TO_OUTPUT_PATH", message: "At least one output must be reachable from an input." });
  }

  for (const nodeId of nodeIds) {
    const node = nodes.find((candidate) => isRecord(candidate) && candidate.id === nodeId) as Record<string, unknown>;
    if (node.type !== "input" && (incoming.get(nodeId) ?? 0) === 0) {
      warnings.push({ code: "ORPHAN_NODE", message: `Node "${nodeId}" has no incoming connection.`, nodeId });
    }
    if (node.type !== "output" && (outgoing.get(nodeId) ?? 0) === 0) {
      warnings.push({ code: "DEAD_END_NODE", message: `Node "${nodeId}" has no outgoing connection.`, nodeId });
    }
    if (!reachable.has(nodeId)) {
      warnings.push({ code: "UNREACHABLE_NODE", message: `Node "${nodeId}" is not reachable from an input.`, nodeId });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.x === "number" && Number.isFinite(value.x) &&
    typeof value.y === "number" && Number.isFinite(value.y);
}

function hasCycle(nodeIds: Set<string>, adjacency: Map<string, string[]>): boolean {
  const indegree = new Map([...nodeIds].map((id) => [id, 0]));
  for (const targets of adjacency.values()) {
    for (const target of targets) indegree.set(target, (indegree.get(target) ?? 0) + 1);
  }
  const queue = [...indegree].filter(([, count]) => count === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    visited += 1;
    for (const target of adjacency.get(nodeId) ?? []) {
      const count = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, count);
      if (count === 0) queue.push(target);
    }
  }
  return visited !== nodeIds.size;
}
