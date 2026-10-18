import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateExecutionDto } from "./execution.dto";
import { validateExecutionInput } from "./input-schema";

@Injectable()
export class ExecutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowsService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    workflowId: string,
    input: CreateExecutionDto,
  ) {
    const workflow = await this.workflows.get(organizationId, workflowId);
    const nodes = Array.isArray(workflow.nodes)
      ? workflow.nodes as unknown as Record<string, unknown>[]
      : [];
    const edges = Array.isArray(workflow.edges)
      ? workflow.edges as unknown as Record<string, unknown>[]
      : [];
    const validation = this.workflows.validateDefinition({ nodes, edges });
    if (!validation.valid) {
      throw new BadRequestException({
        message: "Workflow graph is invalid and cannot be run.",
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }
    const runtimeInput = input.input ?? {};
    validateExecutionInput(runtimeInput, nodes);

    const version = await this.prisma.workflowVersion.findUnique({
      where: { workflowId_version: { workflowId: workflow.id, version: workflow.version } },
      select: { id: true },
    });
    if (!version) {
      throw new ConflictException("Workflow version snapshot is unavailable; save the workflow before running it.");
    }

    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        workflowVersionId: version.id,
        triggeredById: userId,
        traceId: randomUUID(),
        status: "QUEUED",
        input: runtimeInput as Prisma.InputJsonValue,
      },
      select: { id: true, status: true, traceId: true, createdAt: true },
    });
    return {
      executionId: execution.id,
      status: execution.status,
      traceId: execution.traceId,
      createdAt: execution.createdAt,
    };
  }

  async history(organizationId: string, workflowId: string, cursor?: string, limitText?: string) {
    await this.workflows.get(organizationId, workflowId);
    const limit = limitText === undefined ? 25 : Number(limitText);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException("Execution history page limit must be an integer from 1 to 100.");
    }
    const after = decodeHistoryCursor(cursor);
    const rows = await this.prisma.workflowExecution.findMany({
      where: {
        workflowId,
        workflow: { organizationId },
        ...(after ? {
          OR: [
            { createdAt: { lt: after.createdAt } },
            { createdAt: after.createdAt, id: { lt: after.id } },
          ],
        } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        status: true,
        input: true,
        output: true,
        error: true,
        traceId: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        workflowVersion: { select: { version: true } },
        _count: { select: { steps: true } },
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? encodeHistoryCursor(items.at(-1)!) : null };
  }

  async get(organizationId: string, workflowId: string, executionId: string) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflowId,
        workflow: { organizationId },
      },
      select: {
        id: true,
        workflowId: true,
        workflowVersionId: true,
        status: true,
        input: true,
        output: true,
        error: true,
        traceId: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        workflowVersion: { select: { version: true, snapshot: true } },
        steps: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            nodeId: true,
            nodeType: true,
            status: true,
            input: true,
            output: true,
            error: true,
            retryCount: true,
            durationMs: true,
            usage: true,
            startedAt: true,
            completedAt: true,
          },
        },
        approvals: {
          orderBy: { requestedAt: "asc" },
          select: {
            id: true,
            stepId: true,
            status: true,
            requestedAt: true,
            resolvedAt: true,
            approverId: true,
            comment: true,
            decision: true,
          },
        },
      },
    });
    if (!execution) throw new NotFoundException("Execution not found");
    return execution;
  }

  async cancel(organizationId: string, executionId: string) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, workflow: { organizationId } },
      select: { id: true, status: true },
    });
    if (!execution) throw new NotFoundException("Execution not found");
    if (!["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(execution.status)) {
      throw new ConflictException("Only queued, running, or approval-paused executions can be cancelled.");
    }
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.workflowExecution.updateMany({
        where: { id: execution.id, status: { in: ["QUEUED", "RUNNING", "WAITING_APPROVAL"] } },
        data: { status: "CANCELLED", completedAt: new Date() },
      });
      if (changed.count !== 1) throw new ConflictException("Execution state changed; refresh and try again.");
      const cancelledAt = new Date();
      await tx.workflowExecutionStep.updateMany({
        where: { executionId: execution.id, status: { in: ["RUNNING", "WAITING_APPROVAL"] } },
        data: { status: "CANCELLED", error: "Execution cancelled by a workspace member.", completedAt: cancelledAt },
      });
      await tx.approval.updateMany({
        where: { executionId: execution.id, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: cancelledAt },
      });
      await tx.executionWorkerLease.deleteMany({ where: { executionId: execution.id } });
    });
    return { id: execution.id, status: "CANCELLED" };
  }

  async retry(organizationId: string, userId: string, executionId: string) {
    const failed = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, status: "FAILED", workflow: { organizationId } },
      select: { id: true, workflowId: true, workflowVersionId: true, input: true },
    });
    if (!failed) {
      const existing = await this.prisma.workflowExecution.findFirst({
        where: { id: executionId, workflow: { organizationId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException("Execution not found");
      throw new ConflictException("Only failed executions can be retried.");
    }
    if (!failed.workflowVersionId) {
      throw new ConflictException("This execution has no pinned workflow version and cannot be retried safely.");
    }

    const retry = await this.prisma.workflowExecution.create({
      data: {
        workflowId: failed.workflowId,
        workflowVersionId: failed.workflowVersionId,
        triggeredById: userId,
        traceId: randomUUID(),
        status: "QUEUED",
        input: JSON.parse(JSON.stringify(failed.input ?? {})) as Prisma.InputJsonValue,
      },
      select: { id: true, status: true, traceId: true, createdAt: true },
    });
    return {
      executionId: retry.id,
      status: retry.status,
      traceId: retry.traceId,
      createdAt: retry.createdAt,
      retriedFromExecutionId: failed.id,
    };
  }
}

function decodeHistoryCursor(cursor?: string): { createdAt: Date; id: string } | undefined {
  if (cursor === undefined) return undefined;
  if (!cursor || cursor.length > 512) throw new BadRequestException("Execution history cursor is invalid.");
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!value || typeof value !== "object") throw new Error("invalid cursor");
    const candidate = value as Record<string, unknown>;
    const createdAt = typeof candidate.createdAt === "string" ? new Date(candidate.createdAt) : null;
    if (!createdAt || !Number.isFinite(createdAt.getTime()) || typeof candidate.id !== "string" || !candidate.id.trim() || candidate.id.length > 200) {
      throw new Error("invalid cursor");
    }
    return { createdAt, id: candidate.id };
  } catch {
    throw new BadRequestException("Execution history cursor is invalid.");
  }
}

function encodeHistoryCursor(value: { createdAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ createdAt: value.createdAt.toISOString(), id: value.id }), "utf8").toString("base64url");
}
