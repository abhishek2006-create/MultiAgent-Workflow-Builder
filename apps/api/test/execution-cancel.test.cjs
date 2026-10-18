const test = require("node:test");
const assert = require("node:assert/strict");
const { ExecutionsService } = require("../dist/src/executions/executions.service.js");

test("cancels a running execution and closes its active step, approval, and lease atomically", async () => {
  const calls = [];
  const tx = {
    workflowExecution: {
      updateMany: async (args) => { calls.push(["execution", args]); return { count: 1 }; },
    },
    workflowExecutionStep: {
      updateMany: async (args) => { calls.push(["step", args]); return { count: 1 }; },
    },
    approval: {
      updateMany: async (args) => { calls.push(["approval", args]); return { count: 1 }; },
    },
    executionWorkerLease: {
      deleteMany: async (args) => { calls.push(["lease", args]); return { count: 1 }; },
    },
  };
  const prisma = {
    workflowExecution: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where, { id: "run-1", workflow: { organizationId: "workspace-1" } });
        return { id: "run-1", status: "RUNNING" };
      },
    },
    $transaction: async (operation) => operation(tx),
  };
  const result = await new ExecutionsService(prisma, {}).cancel("workspace-1", "run-1");

  assert.deepEqual(result, { id: "run-1", status: "CANCELLED" });
  assert.deepEqual(calls.map(([name]) => name), ["execution", "step", "approval", "lease"]);
  assert.deepEqual(calls[0][1].where.status.in, ["QUEUED", "RUNNING", "WAITING_APPROVAL"]);
  assert.equal(calls[1][1].data.status, "CANCELLED");
  assert.equal(calls[2][1].data.status, "CANCELLED");
  assert.deepEqual(calls[3][1].where, { executionId: "run-1" });
});

test("does not cancel a terminal execution", async () => {
  const prisma = {
    workflowExecution: { findFirst: async () => ({ id: "run-1", status: "COMPLETED" }) },
  };
  await assert.rejects(new ExecutionsService(prisma, {}).cancel("workspace-1", "run-1"), /Only queued, running/);
});
