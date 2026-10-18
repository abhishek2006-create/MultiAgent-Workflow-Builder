const test = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException } = require("@nestjs/common");
const { ExecutionsService } = require("../dist/src/executions/executions.service.js");

test("paginates history with a stable tenant-scoped timestamp and id cursor", async () => {
  const first = { id: "run-1", createdAt: new Date("2026-01-01T00:00:00.000Z") };
  const second = { id: "run-2", createdAt: new Date("2026-01-01T00:00:00.000Z") };
  const calls = [];
  const service = new ExecutionsService(
    { workflowExecution: { findMany: async (query) => { calls.push(query); return [first, second]; } } },
    { get: async () => ({ id: "wf-1" }) },
  );
  const page = await service.history("org-1", "wf-1", undefined, "1");
  assert.deepEqual(page.items, [first]);
  assert.ok(page.nextCursor);
  assert.equal(calls[0].where.workflow.organizationId, "org-1");
  assert.equal(calls[0].take, 2);

  await service.history("org-1", "wf-1", page.nextCursor, "1");
  assert.deepEqual(calls[1].where.OR, [
    { createdAt: { lt: first.createdAt } },
    { createdAt: first.createdAt, id: { lt: first.id } },
  ]);
});

test("rejects invalid history pagination inputs", async () => {
  const service = new ExecutionsService({ workflowExecution: { findMany: async () => [] } }, { get: async () => ({ id: "wf-1" }) });
  await assert.rejects(service.history("org-1", "wf-1", undefined, "101"), BadRequestException);
  await assert.rejects(service.history("org-1", "wf-1", "invalid-cursor"), BadRequestException);
});
