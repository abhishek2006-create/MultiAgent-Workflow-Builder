const test = require("node:test");
const assert = require("node:assert/strict");
const { ExecutionsService } = require("../dist/src/executions/executions.service.js");

test("retry creates a new queued execution pinned to the failed run snapshot", async () => {
  const failed = {
    id: "failed-run",
    workflowId: "workflow-1",
    workflowVersionId: "version-7",
    input: { orderId: "order-42" },
  };
  let createData;
  const prisma = {
    workflowExecution: {
      findFirst: async () => failed,
      create: async ({ data }) => {
        createData = data;
        return { id: "retry-run", status: "QUEUED", traceId: data.traceId, createdAt: new Date(0) };
      },
    },
  };
  const service = new ExecutionsService(prisma, {});

  const result = await service.retry("workspace-1", "user-1", failed.id);

  assert.equal(result.executionId, "retry-run");
  assert.equal(result.status, "QUEUED");
  assert.equal(result.retriedFromExecutionId, failed.id);
  assert.equal(createData.workflowVersionId, failed.workflowVersionId);
  assert.deepEqual(createData.input, failed.input);
  assert.equal(createData.triggeredById, "user-1");
  assert.notEqual(createData.traceId, failed.traceId);
});

test("retry rejects a visible execution that is not failed", async () => {
  const prisma = {
    workflowExecution: {
      findFirst: async ({ where }) => where.status === "FAILED" ? null : { id: "running-run" },
    },
  };
  const service = new ExecutionsService(prisma, {});

  await assert.rejects(service.retry("workspace-1", "user-1", "running-run"), /Only failed executions can be retried/);
});
