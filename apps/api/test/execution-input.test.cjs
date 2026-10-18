const test = require("node:test");
const assert = require("node:assert/strict");
const { inputSchemaDefinitionError, validateExecutionInput } = require("../dist/src/executions/input-schema.js");

test("accepts runtime input that matches the Input node JSON Schema", () => {
  const nodes = [{ id: "input", type: "input", data: { inputSchema: {
    type: "object",
    required: ["message"],
    properties: { message: { type: "string", minLength: 1 } },
    additionalProperties: false,
  } } }];
  assert.equal(inputSchemaDefinitionError(nodes[0].data.inputSchema), null);
  assert.doesNotThrow(() => validateExecutionInput({ message: "hello" }, nodes));
});

test("rejects runtime input that does not match its configured schema", () => {
  const nodes = [{ id: "input", type: "input", data: { inputSchema: {
    type: "object", required: ["message"], properties: { message: { type: "string" } },
  } } }];
  assert.throws(() => validateExecutionInput({}, nodes), /does not match/);
});

test("rejects invalid schemas and oversized runtime input", () => {
  assert.match(inputSchemaDefinitionError({ type: "unsupported" }), /invalid/i);
  assert.match(inputSchemaDefinitionError({ $ref: "https://example.invalid/schema.json" }), /keyword.*not supported/i);
  assert.throws(() => validateExecutionInput({ text: "x".repeat(70_000) }, []), /64 KB/);
});
