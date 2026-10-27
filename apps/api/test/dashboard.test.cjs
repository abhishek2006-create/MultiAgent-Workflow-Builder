const test = require("node:test");
const assert = require("node:assert/strict");
const { DashboardService } = require("../dist/src/dashboard/dashboard.service.js");

test("dashboard uses scoped database counts and actual usage, then reflects changed runs", async () => {
  const counts = { COMPLETED: 2, FAILED: 1, RUNNING: 1 };
  const prisma = {
    workflow: { count: async ({ where }) => { assert.equal(where.organizationId, "workspace-a"); return 3; } },
    workflowExecution: {
      count: async ({ where }) => { assert.equal(where.workflow.organizationId, "workspace-a"); return counts[where.status] ?? 0; },
      findMany: async ({ where, take }) => {
        assert.equal(where.workflow.organizationId, "workspace-a");
        assert.equal(take, 10);
        return [{ id: "run-a", workflowId: "workflow-a", status: "COMPLETED", traceId: null,
          createdAt: new Date(0), startedAt: new Date(1000), completedAt: new Date(3500), error: null,
          workflow: { name: "Saved workflow" }, workflowVersion: { version: 4 },
          steps: [{ usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20 } },
            { usage: null }, { usage: { totalTokens: -10, inputTokens: "1000" } }],
        }];
      },
    },
  };
  const service = new DashboardService(prisma);
  const first = await service.overview("workspace-a");
  assert.equal(first.workflowCount, 3);
  assert.equal(first.executionCount, 4);
  assert.equal(first.successRate, 66.67);
  assert.deepEqual(first.recentUsage, { inputTokens: 12, outputTokens: 8, totalTokens: 20 });
  assert.equal(first.recentExecutions[0].durationMs, 2500);
  assert.equal(first.recentExecutions[0].version, 4);
  assert(Number.isFinite(Date.parse(first.updatedAt)));
  counts.RUNNING = 0;
  counts.COMPLETED = 3;
  const next = await service.overview("workspace-a");
  assert.equal(next.statuses.RUNNING, 0);
  assert.equal(next.successRate, 75);
});

test("empty workspace has no invented success rate or token usage", async () => {
  const service = new DashboardService({ workflow: { count: async () => 0 },
    workflowExecution: { count: async () => 0, findMany: async () => [] } });
  const result = await service.overview("empty");
  assert.equal(result.successRate, null);
  assert.equal(result.executionCount, 0);
  assert.equal(result.recentUsage.totalTokens, 0);
  assert.deepEqual(result.recentExecutions, []);
});
