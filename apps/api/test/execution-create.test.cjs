const test = require("node:test");
const assert = require("node:assert/strict");
const { ExecutionsService } = require("../dist/src/executions/executions.service.js");

const savedWorkflow = {
  id: "workflow-1",
  version: 4,
  nodes: [
    { id: "input", type: "input", position: { x: 0, y: 0 }, data: {
      label: "Input", inputSchema: { type: "object", required: ["message"], properties: { message: { type: "string" } } },
    } },
    { id: "output", type: "output", position: { x: 0, y: 100 }, data: { label: "Output" } },
  ],
  edges: [{ id: "input-output", source: "input", target: "output" }],
};

function serviceHarness() {
  const calls = [];
  const prisma = {
    workflowVersion: {
      findUnique: async (args) => {
        calls.push(["version", args]);
        return { id: "version-4" };
      },
    },
    workflowExecution: {
      create: async (args) => {
        calls.push(["execution", args]);
        return { id: "execution-1", status: "QUEUED", traceId: "trace-1", createdAt: new Date(0) };
      },
    },
  };
  const workflows = {
    get: async () => savedWorkflow,
    validateDefinition: (definition) => {
      calls.push(["validate", definition]);
      return { valid: true, errors: [], warnings: [] };
    },
  };
  return { service: new ExecutionsService(prisma, workflows), calls };
}

test("creates a queued execution with validated input pinned to the same saved graph version", async () => {
  const { service, calls } = serviceHarness();
  const result = await service.create("workspace-1", "user-1", "workflow-1", { input: { message: "hello" } });

  assert.equal(result.status, "QUEUED");
  assert.equal(calls[0][0], "validate");
  assert.strictEqual(calls[0][1].nodes, savedWorkflow.nodes);
  assert.deepEqual(calls[1][1].where, { workflowId_version: { workflowId: "workflow-1", version: 4 } });
  assert.deepEqual(calls[2][1].data.input, { message: "hello" });
  assert.equal(calls[2][1].data.workflowVersionId, "version-4");
});

test("rejects runtime input before creating an execution row", async () => {
  const { service, calls } = serviceHarness();
  await assert.rejects(
    service.create("workspace-1", "user-1", "workflow-1", { input: { message: 12 } }),
    /does not match/,
  );
  assert.equal(calls.some(([name]) => name === "execution"), false);
});
