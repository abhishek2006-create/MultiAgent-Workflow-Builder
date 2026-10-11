import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";
import { RunWorkflowDto } from "./dto/run-workflow.dto";

interface WorkflowNode {
  id: string;
  type: string;
  position?: {
    x: number;
    y: number;
  };
  data?: Record<string, unknown>;
}

interface WorkflowEdge {
  id?: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    return this.prisma.workflow.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: {
        id,
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return workflow;
  }

  async create(dto: CreateWorkflowDto) {
    const definition: WorkflowDefinition = {
      nodes: (dto.nodes ?? []) as WorkflowNode[],
      edges: (dto.edges ?? []) as WorkflowEdge[],
    };

    return this.prisma.workflow.create({
      data: {
        name: dto.name,
        version: 1,
        definition: definition as unknown as Prisma.InputJsonValue,

        // Temporary organization handling.
        // This must eventually come from the authenticated user.
        organization: {
          connectOrCreate: {
            where: {
              id: "default-organization",
            },
            create: {
              id: "default-organization",
              name: "Default Organization",
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateWorkflowDto,
  ) {
    const existing = await this.findOne(id);

    const currentDefinition =
      this.getDefinition(existing.definition);

    const definition: WorkflowDefinition = {
      nodes:
        dto.nodes !== undefined
          ? (Array.isArray(dto.nodes)
              ? (dto.nodes as WorkflowNode[])
              : currentDefinition.nodes)
          : currentDefinition.nodes,

      edges:
        dto.edges !== undefined
          ? (Array.isArray(dto.edges)
              ? (dto.edges as WorkflowEdge[])
              : currentDefinition.edges)
          : currentDefinition.edges,
    };

    return this.prisma.workflow.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        definition:
          definition as unknown as Prisma.InputJsonValue,

        version: {
          increment: 1,
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.workflow.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
    };
  }

  async validate(id: string) {
    const workflow = await this.findOne(id);

    const definition =
      this.getDefinition(workflow.definition);

    const nodes = definition.nodes;
    const edges = definition.edges;

    const errors: Array<{
      code: string;
      message: string;
      nodeId?: string;
      edgeId?: string;
    }> = [];

    const warnings: Array<{
      code: string;
      message: string;
      nodeId?: string;
      edgeId?: string;
    }> = [];

    if (nodes.length === 0) {
      errors.push({
        code: "EMPTY_WORKFLOW",
        message:
          "Workflow must contain at least one node.",
      });
    }

    const inputNodes = nodes.filter(
      (node) => node.type === "input",
    );

    if (inputNodes.length === 0) {
      errors.push({
        code: "MISSING_INPUT",
        message:
          "Workflow must contain an input node.",
      });
    }

    const outputNodes = nodes.filter(
      (node) => node.type === "output",
    );

    if (outputNodes.length === 0) {
      errors.push({
        code: "MISSING_OUTPUT",
        message:
          "Workflow must contain an output node.",
      });
    }

    const nodeIds = new Set(
      nodes.map((node) => node.id),
    );

    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          code: "INVALID_EDGE_SOURCE",
          message: `Edge references missing source node "${edge.source}".`,
          edgeId: edge.id,
        });
      }

      if (!nodeIds.has(edge.target)) {
        errors.push({
          code: "INVALID_EDGE_TARGET",
          message: `Edge references missing target node "${edge.target}".`,
          edgeId: edge.id,
        });
      }
    }

    for (const node of nodes) {
      const hasIncoming = edges.some(
        (edge) => edge.target === node.id,
      );

      const hasOutgoing = edges.some(
        (edge) => edge.source === node.id,
      );

      if (
        node.type !== "input" &&
        !hasIncoming
      ) {
        warnings.push({
          code: "ORPHAN_NODE",
          message:
            `Node "${node.id}" has no incoming connection.`,
          nodeId: node.id,
        });
      }

      if (
        node.type !== "output" &&
        !hasOutgoing
      ) {
        warnings.push({
          code: "DEAD_END_NODE",
          message:
            `Node "${node.id}" has no outgoing connection.`,
          nodeId: node.id,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async run(
    id: string,
    dto: RunWorkflowDto,
  ) {
    const validation = await this.validate(id);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    const input =
      dto.input ?? {};

    const execution =
      await (
        this.prisma as unknown as {
          workflowExecution: {
            create: (args: {
              data: {
                workflowId: string;
                status: string;
                input: Prisma.InputJsonValue;
                startedAt: Date;
              };
            }) => Promise<{ id: string; status: string }>;
          };
        }
      ).workflowExecution.create({
        data: {
          workflowId: id,
          status: "QUEUED",

          input:
            input as Prisma.InputJsonValue,

          startedAt: new Date(),
        },
      });

    return {
      executionId: execution.id,
      status: execution.status,
    };
  }

  private getDefinition(
    definition: Prisma.JsonValue,
  ): WorkflowDefinition {
    if (
      !definition ||
      typeof definition !== "object" ||
      Array.isArray(definition)
    ) {
      return {
        nodes: [],
        edges: [],
      };
    }

    const value =
      definition as Record<string, unknown>;

    return {
      nodes: Array.isArray(value.nodes)
        ? (value.nodes as WorkflowNode[])
        : [],

      edges: Array.isArray(value.edges)
        ? (value.edges as WorkflowEdge[])
        : [],
    };
  }
}