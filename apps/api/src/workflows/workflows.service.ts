import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Ajv from 'ajv';
import * as workflowSchema from '@retail-support/contracts/workflow.schema.json';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './workflow.dto';

const validateWorkflow = new Ajv({ allErrors: true }).compile(workflowSchema);

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, input: CreateWorkflowDto) {
    this.assertValidDefinition(input.definition);
    return this.prisma.workflow.create({
      data: {
        name: input.name.trim(),
        definition: input.definition as Prisma.InputJsonValue,
        organizationId,
      },
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

  async update(organizationId: string, id: string, input: UpdateWorkflowDto) {
    const existing = await this.get(organizationId, id);
    if (input.definition) this.assertValidDefinition(input.definition);
    return this.prisma.workflow.update({
      where: { id: existing.id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.definition === undefined
          ? {}
          : { definition: input.definition as Prisma.InputJsonValue }),
        version: { increment: 1 },
      },
    });
  }

  private assertValidDefinition(definition: unknown): void {
    if (!validateWorkflow(definition)) {
      const details = (validateWorkflow.errors ?? [])
        .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
        .join('; ');
      throw new BadRequestException(`Invalid workflow definition: ${details}`);
    }
  }
}
