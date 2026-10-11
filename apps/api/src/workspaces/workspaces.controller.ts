import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  AcceptWorkspaceInvitationDto,
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
} from "./workspace.dto";
import { WorkspacesService } from "./workspaces.service";

@Controller("workspaces")
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.workspaces.listForUser(request.user.sub);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateWorkspaceDto,
  ) {
    return this.workspaces.create(request.user.sub, body);
  }

  @Post("invitations/accept")
  acceptInvitation(
    @Req() request: AuthenticatedRequest,
    @Body() body: AcceptWorkspaceInvitationDto,
  ) {
    return this.workspaces.acceptInvitation(request.user.sub, body);
  }

  @Post(":id/invitations")
  invite(
    @Req() request: AuthenticatedRequest,
    @Param("id") organizationId: string,
    @Body() body: CreateWorkspaceInvitationDto,
  ) {
    return this.workspaces.invite(request.user.sub, organizationId, body);
  }
}
