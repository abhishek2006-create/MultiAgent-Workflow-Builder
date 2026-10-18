const test = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException } = require("@nestjs/common");
const { validateImportedWorkflow } = require("../dist/src/workflows/workflow-import.js");

function validWorkflow() {
  return {
    nodes: [
      { id: "input", type: "input", position: { x: 0, y: 0 }, data: {} },
      { id: "output", type: "output", position: { x: 200, y: 0 }, data: {} },
    ],
    edges: [{ id: "input-output", source: "input", target: "output" }],
  };
}

test("accepts a valid workflow definition for import", () => {
  assert.doesNotThrow(() => validateImportedWorkflow(validWorkflow()));
});

test("preserves a workflow definition through an export/import JSON round trip", () => {
  const source = validWorkflow();
  const exported = JSON.stringify(source);
  const imported = JSON.parse(exported);
  assert.deepEqual(imported, source);
  assert.doesNotThrow(() => validateImportedWorkflow(imported));
});

test("rejects credential fields anywhere in an imported workflow", () => {
  const definition = validWorkflow();
  definition.nodes[1].data = { nested: { apiKey: "must-not-be-imported" } };
  assert.throws(() => validateImportedWorkflow(definition), BadRequestException);
});

test("rejects invalid graph structure before import", () => {
  const definition = validWorkflow();
  definition.edges[0].target = "missing-node";
  assert.throws(() => validateImportedWorkflow(definition), (error) => {
    assert.ok(error instanceof BadRequestException);
    assert.match(error.message, /Imported workflow is invalid/);
    return true;
  });
});
