import { Body, Controller, Get, Param, Post, Query, Req, SetMetadata, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateExecutionDto } from "./execution.dto";
import { ExecutionsService } from "./executions.service";
import { WorkspaceRole } from "@prisma/client";
import { WORKSPACE_ROLES_KEY, WorkspaceRolesGuard } from "../auth/workspace-roles.guard";

@Controller()
@UseGuards(JwtAuthGuard)
export class ExecutionsController {
  constructor(private readonly executions: ExecutionsService) {}

  @Post("workflows/:workflowId/run")
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  create(
    @Req() request: AuthenticatedRequest,
    @Param("workflowId") workflowId: string,
    @Body() body: CreateExecutionDto,
  ) {
    return this.executions.create(request.user.organizationId, request.user.sub, workflowId, body);
  }

  @Get("workflows/:workflowId/executions")
  history(
    @Req() request: AuthenticatedRequest,
    @Param("workflowId") workflowId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.executions.history(request.user.organizationId, workflowId, cursor, limit);
  }

  @Get("workflows/:workflowId/executions/:executionId")
  get(
    @Req() request: AuthenticatedRequest,
    @Param("workflowId") workflowId: string,
    @Param("executionId") executionId: string,
  ) {
    return this.executions.get(request.user.organizationId, workflowId, executionId);
  }

  @Post("executions/:executionId/cancel")
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  cancel(@Req() request: AuthenticatedRequest, @Param("executionId") executionId: string) {
    return this.executions.cancel(request.user.organizationId, executionId);
  }

  @Post("executions/:executionId/retry")
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  retry(@Req() request: AuthenticatedRequest, @Param("executionId") executionId: string) {
    return this.executions.retry(request.user.organizationId, request.user.sub, executionId);
  }
}
