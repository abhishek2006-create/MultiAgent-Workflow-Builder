import { Body, ConflictException, Controller, NotFoundException, Param, Post, Req, SetMetadata, UseGuards } from "@nestjs/common";
import { Prisma, WorkspaceRole } from "@prisma/client";
import { AuthenticatedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WORKSPACE_ROLES_KEY, WorkspaceRolesGuard } from "../auth/workspace-roles.guard";
import { ResolveApprovalDto } from "./resolve-approval.dto";
import { PrismaService } from "../prisma/prisma.service";

@Controller("executions/:executionId/approvals")
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(":approvalId/resolve")
  @UseGuards(WorkspaceRolesGuard)
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  async resolve(
    @Req() request: AuthenticatedRequest,
    @Param("executionId") executionId: string,
    @Param("approvalId") approvalId: string,
    @Body() input: ResolveApprovalDto,
  ) {
    const approval = await this.prisma.approval.findFirst({
      where: {
        id: approvalId,
        executionId,
        status: "PENDING",
        execution: { workflow: { organizationId: request.user.organizationId } },
      },
      select: { id: true, stepId: true },
    });
    if (!approval) throw new NotFoundException("Pending approval not found");

    const status = input.approved ? "APPROVED" : "REJECTED";
    const decision = { approved: input.approved, comment: input.comment?.trim() ?? null };
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.approval.updateMany({
        where: { id: approval.id, status: "PENDING" },
        data: {
          status,
          approverId: request.user.sub,
          comment: input.comment?.trim() || null,
          decision: decision as Prisma.InputJsonValue,
          resolvedAt: new Date(),
        },
      });
      if (changed.count !== 1) throw new ConflictException("Approval was resolved by another member");
      if (approval.stepId) {
        await tx.workflowExecutionStep.update({
          where: { id: approval.stepId },
          data: input.approved
            ? { status: "COMPLETED", output: decision as Prisma.InputJsonValue, error: null }
            : { status: "FAILED", error: "Human approval was rejected" },
        });
      }
      const execution = await tx.workflowExecution.updateMany({
        where: { id: executionId, status: "WAITING_APPROVAL" },
        data: input.approved
          ? { status: "QUEUED", error: null }
          : { status: "FAILED", error: "Human approval was rejected", completedAt: new Date() },
      });
      if (execution.count !== 1) throw new ConflictException("Execution is no longer waiting for approval");
      return { approvalId, status, executionStatus: input.approved ? "QUEUED" : "FAILED" };
    });
  }
}
