const test = require("node:test");
const assert = require("node:assert/strict");
const { validateWorkflowGraph } = require("../dist/src/workflows/graph-validation.js");

function node(id, type, x) {
  return { id, type, position: { x, y: 0 }, data: {} };
}

test("accepts a connected input, approval, and output graph", () => {
  const result = validateWorkflowGraph(
    [node("input", "input", 0), node("approval", "approval", 200), node("output", "output", 400)],
    [
      { id: "edge-1", source: "input", target: "approval" },
      { id: "edge-2", source: "approval", target: "output" },
    ],
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects a directed cycle", () => {
  const result = validateWorkflowGraph(
    [node("input", "input", 0), node("middle", "agent", 200), node("output", "output", 400)],
    [
      { id: "edge-1", source: "input", target: "middle" },
      { id: "edge-2", source: "middle", target: "output" },
      { id: "edge-3", source: "output", target: "middle" },
    ],
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === "CYCLE_DETECTED"));
});

test("rejects graphs without a path from input to output", () => {
  const result = validateWorkflowGraph(
    [node("input", "input", 0), node("output", "output", 400)],
    [],
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === "NO_INPUT_TO_OUTPUT_PATH"));
});

test("requires condition edges to select a true or false branch", () => {
  const result = validateWorkflowGraph(
    [
      { ...node("input", "input", 0) },
      { ...node("condition", "condition", 200), data: { conditionPath: "input.flag", conditionOperator: "truthy" } },
      { ...node("output", "output", 400) },
    ],
    [
      { id: "edge-1", source: "input", target: "condition" },
      { id: "edge-2", source: "condition", target: "output", sourceHandle: "true" },
    ],
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});
