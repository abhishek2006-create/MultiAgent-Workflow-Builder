const test = require("node:test");
const assert = require("node:assert/strict");
const { jsonSchemaValueErrors } = require("../dist/src/executions/input-schema.js");
const { validateWorkflowGraph } = require("../dist/src/workflows/graph-validation.js");

function graph(agentData = {}) {
  return {
    nodes: [
      { id: "input", type: "input", position: { x: 0, y: 0 }, data: {} },
      { id: "agent", type: "agent", position: { x: 200, y: 0 }, data: agentData },
      { id: "output", type: "output", position: { x: 400, y: 0 }, data: {} },
    ],
    edges: [
      { id: "input-agent", source: "input", target: "agent" },
      { id: "agent-output", source: "agent", target: "output" },
    ],
  };
}

test("validates node results against the configured JSON Schema", () => {
  const schema = {
    type: "object",
    required: ["message"],
    properties: { message: { type: "string" } },
    additionalProperties: false,
  };
  assert.deepEqual(jsonSchemaValueErrors({ message: "ok" }, schema), []);
  assert.match(jsonSchemaValueErrors({ message: 1 }, schema)[0], /must be string/);
  assert.match(jsonSchemaValueErrors({ message: "ok", extra: true }, schema)[0], /must NOT have additional properties/);
});

test("rejects unsafe output schemas before an execution is created", () => {
  const result = validateWorkflowGraph(
    graph({ outputSchema: { $ref: "https://example.invalid/schema" } }).nodes,
    graph().edges,
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === "INVALID_OUTPUT_SCHEMA"));
});

test("enforces the server-side AI node timeout range", () => {
  const result = validateWorkflowGraph(
    graph({ timeoutMs: 60_001 }).nodes,
    graph().edges,
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === "INVALID_AGENT_TIMEOUT"));
});

test("enforces the bounded AI node retry range", () => {
  const valid = validateWorkflowGraph(
    graph({ maxRetries: 3 }).nodes,
    graph().edges,
  );
  const invalid = validateWorkflowGraph(
    graph({ maxRetries: 4 }).nodes,
    graph().edges,
  );
  assert.equal(valid.valid, true);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.code === "INVALID_AGENT_RETRIES"));
});
