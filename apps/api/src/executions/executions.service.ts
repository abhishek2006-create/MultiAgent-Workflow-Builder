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
    const validation = await this.workflows.validate(organizationId, workflowId);
    if (!validation.valid) {
      throw new BadRequestException({
        message: "Workflow graph is invalid and cannot be run.",
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

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
        input: (input.input ?? {}) as Prisma.InputJsonValue,
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

  async history(organizationId: string, workflowId: string) {
    await this.workflows.get(organizationId, workflowId);
    return this.prisma.workflowExecution.findMany({
      where: { workflowId, workflow: { organizationId } },
      orderBy: { createdAt: "desc" },
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
    if (execution.status !== "QUEUED") {
      throw new ConflictException("Only queued executions can be cancelled before a worker starts them.");
    }
    const changed = await this.prisma.workflowExecution.updateMany({
      where: { id: execution.id, status: "QUEUED" },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    if (changed.count !== 1) throw new ConflictException("Execution state changed; refresh and try again.");
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
