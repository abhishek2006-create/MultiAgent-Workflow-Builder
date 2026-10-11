import {
  Body,
  Controller,
<<<<<<< HEAD
  Delete,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WORKSPACE_ROLES_KEY, WorkspaceRolesGuard } from '../auth/workspace-roles.guard';
import { WorkspaceRole } from '@prisma/client';
=======
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
import { CreateWorkflowDto, UpdateWorkflowDto } from './workflow.dto';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Post()
<<<<<<< HEAD
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateWorkflowDto) {
    return this.workflows.create(request.user.organizationId, request.user.sub, body);
=======
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateWorkflowDto) {
    return this.workflows.create(request.user.organizationId, body);
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
  }

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.workflows.list(request.user.organizationId);
  }

  @Get(':id')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.workflows.get(request.user.organizationId, id);
  }

  @Patch(':id')
<<<<<<< HEAD
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
=======
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateWorkflowDto,
  ) {
<<<<<<< HEAD
    return this.workflows.update(request.user.organizationId, request.user.sub, id, body);
  }

  @Post(':id/validate')
  validate(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.workflows.validate(request.user.organizationId, id);
  }

  @Get(':id/versions')
  versions(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.workflows.listVersions(request.user.organizationId, id);
  }

  @Post(':id/versions/:version/restore')
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  restoreVersion(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.workflows.restoreVersion(request.user.organizationId, request.user.sub, id, version);
  }

  @Delete(':id')
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN])
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.workflows.remove(request.user.organizationId, id);
=======
    return this.workflows.update(request.user.organizationId, id, body);
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
  }
}
