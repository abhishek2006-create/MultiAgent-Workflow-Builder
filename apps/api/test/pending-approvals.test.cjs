const test = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException } = require("@nestjs/common");
const { PendingApprovalsController } = require("../dist/src/executions/pending-approvals.controller.js");

test("lists approvals within the authenticated workspace and returns a stable cursor", async () => {
  const rows = [
    { id: "a1", requestedAt: new Date("2026-01-01T00:00:00.000Z") },
    { id: "a2", requestedAt: new Date("2026-01-01T00:00:00.000Z") },
  ];
  const calls = [];
  const controller = new PendingApprovalsController({
    approval: { findMany: async (query) => { calls.push(query); return rows; } },
  });
  const page = await controller.list({ user: { organizationId: "org-1" } }, undefined, "1");
  assert.deepEqual(page.items, [rows[0]]);
  assert.ok(page.nextCursor);
  assert.equal(calls[0].where.execution.workflow.organizationId, "org-1");
  assert.equal(calls[0].take, 2);

  await controller.list({ user: { organizationId: "org-1" } }, page.nextCursor, "1");
  assert.deepEqual(calls[1].where.OR, [
    { requestedAt: { gt: rows[0].requestedAt } },
    { requestedAt: rows[0].requestedAt, id: { gt: rows[0].id } },
  ]);
});

test("rejects invalid approval pagination parameters", async () => {
  const controller = new PendingApprovalsController({ approval: { findMany: async () => [] } });
  await assert.rejects(controller.list({ user: { organizationId: "org-1" } }, undefined, "101"), BadRequestException);
  await assert.rejects(controller.list({ user: { organizationId: "org-1" } }, "not-base64!"), BadRequestException);
});
