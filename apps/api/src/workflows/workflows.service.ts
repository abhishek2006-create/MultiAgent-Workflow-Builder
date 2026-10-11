import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './workflow.dto';
import { validateWorkflowGraph } from './graph-validation';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, input: CreateWorkflowDto) {
    const definition = {
      name: input.name.trim(),
      description: input.description ?? '',
      version: 1,
      nodes: input.nodes,
      edges: input.edges,
    };

    return this.prisma.$transaction(async (transaction) => {
      const workflow = await transaction.workflow.create({
        data: {
          name: input.name.trim(),
          description: input.description ?? '',
          nodes: input.nodes as Prisma.InputJsonArray,
          edges: input.edges as Prisma.InputJsonArray,
          definition: definition as Prisma.InputJsonValue,
          organizationId,
        },
      });
      await transaction.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          version: workflow.version,
          snapshot: definition as Prisma.InputJsonValue,
          createdById: userId,
        },
      });
      return workflow;
    });
  }

  list(organizationId: string) {
    return this.prisma.workflow.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(organizationId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async update(organizationId: string, userId: string, id: string, input: UpdateWorkflowDto) {
    const existing = await this.get(organizationId, id);
    const name = input.name?.trim() ?? existing.name;
    const nodes = input.nodes ?? existing.nodes;
    const edges = input.edges ?? existing.edges;
    const description = input.description ?? existing.description;
    const nextVersion = existing.version + 1;
    const definition = {
      name,
      description,
      version: nextVersion,
      nodes: nodes as Prisma.InputJsonArray,
      edges: edges as Prisma.InputJsonArray,
    };

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.workflow.updateMany({
        where: { id: existing.id, organizationId, version: existing.version },
        data: {
          name,
          description,
          nodes: nodes as Prisma.InputJsonArray,
          edges: edges as Prisma.InputJsonArray,
          definition: definition as Prisma.InputJsonValue,
          version: nextVersion,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Workflow changed since it was loaded. Reload before saving again.');
      }
      await transaction.workflowVersion.create({
        data: {
          workflowId: existing.id,
          version: nextVersion,
          snapshot: definition as Prisma.InputJsonValue,
          createdById: userId,
        },
      });
      return transaction.workflow.findFirstOrThrow({
        where: { id: existing.id, organizationId },
      });
    });
  }

  async validate(organizationId: string, id: string) {
    const workflow = await this.get(organizationId, id);
    return validateWorkflowGraph(
      Array.isArray(workflow.nodes) ? workflow.nodes : [],
      Array.isArray(workflow.edges) ? workflow.edges : [],
    );
  }

  async listVersions(organizationId: string, id: string) {
    const workflow = await this.get(organizationId, id);
    return this.prisma.workflowVersion.findMany({
      where: { workflowId: workflow.id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        snapshot: true,
        createdAt: true,
        createdBy: { select: { id: true, email: true, username: true } },
      },
    });
  }

  async restoreVersion(
    organizationId: string,
    userId: string,
    id: string,
    version: number,
  ) {
    const workflow = await this.get(organizationId, id);
    const target = await this.prisma.workflowVersion.findFirst({
      where: { workflowId: workflow.id, version },
      select: { snapshot: true },
    });
    if (!target || !target.snapshot || typeof target.snapshot !== 'object' || Array.isArray(target.snapshot)) {
      throw new NotFoundException('Workflow version not found');
    }
    const snapshot = target.snapshot as Record<string, unknown>;
    if (!Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges)) {
      throw new ConflictException('Stored workflow version is malformed and cannot be restored');
    }
    return this.update(organizationId, userId, id, {
      name: typeof snapshot.name === 'string' ? snapshot.name : workflow.name,
      description: typeof snapshot.description === 'string' ? snapshot.description : workflow.description ?? '',
      nodes: snapshot.nodes as Record<string, unknown>[],
      edges: snapshot.edges as Record<string, unknown>[],
    });
  }

  async remove(organizationId: string, id: string) {
    const workflow = await this.get(organizationId, id);
    const executionCount = await this.prisma.workflowExecution.count({
      where: { workflowId: workflow.id },
    });
    if (executionCount > 0) {
      throw new ConflictException('Workflow has execution history and cannot be permanently deleted.');
    }
    await this.prisma.workflow.delete({ where: { id: workflow.id } });
    return { success: true };
  }
}
