import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
    const executionStatuses = ["QUEUED", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"];
    const [workflowCount, statusCounts, recent] = await Promise.all([
      this.prisma.workflow.count({ where: { organizationId } }),
      Promise.all(executionStatuses.map((status) =>
        this.prisma.workflowExecution.count({ where: { status, workflow: { organizationId } } }),
      )),
      this.prisma.workflowExecution.findMany({
        where: { workflow: { organizationId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          workflowId: true,
          status: true,
          traceId: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          error: true,
          workflow: { select: { name: true } },
          workflowVersion: { select: { version: true } },
          steps: { select: { usage: true } },
        },
      }),
    ]);

    const statuses = Object.fromEntries(executionStatuses.map((status, index) => [status, statusCounts[index]]));
    const successful = statuses.COMPLETED ?? 0;
    const failed = statuses.FAILED ?? 0;
    const decided = successful + failed;
    const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    for (const run of recent) {
      for (const step of run.steps) addUsage(totalUsage, step.usage);
    }

    return {
      workflowCount,
      executionCount: statusCounts.reduce((sum, count) => sum + count, 0),
      statuses,
      successRate: decided ? Math.round((successful / decided) * 10_000) / 100 : null,
      recentUsage: totalUsage,
      recentExecutions: recent.map((run) => ({
        id: run.id,
        workflowId: run.workflowId,
        workflowName: run.workflow.name,
        status: run.status,
        traceId: run.traceId,
        version: run.workflowVersion?.version ?? null,
        createdAt: run.createdAt,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        durationMs: run.startedAt && run.completedAt
          ? Math.max(0, run.completedAt.getTime() - run.startedAt.getTime())
          : null,
        error: run.error,
        stepCount: run.steps.length,
      })),
    };
  }
}

function addUsage(
  totals: { inputTokens: number; outputTokens: number; totalTokens: number },
  value: unknown,
): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const usage = value as Record<string, unknown>;
  for (const key of ["inputTokens", "outputTokens", "totalTokens"] as const) {
    const count = usage[key];
    if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0) totals[key] += count;
  }
}
