import {
  Body,
  Controller,
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
import { CreateWorkflowDto, UpdateWorkflowDto, ValidateWorkflowDefinitionDto } from './workflow.dto';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Post('import')
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  importWorkflow(@Req() request: AuthenticatedRequest, @Body() body: CreateWorkflowDto) {
    return this.workflows.importWorkflow(request.user.organizationId, request.user.sub, body);
  }

  @Post('validate-definition')
  validateDefinition(@Body() body: ValidateWorkflowDefinitionDto) {
    return this.workflows.validateDefinition(body);
  }

  @Post()
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateWorkflowDto) {
    return this.workflows.create(request.user.organizationId, request.user.sub, body);
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
  @UseGuards(WorkspaceRolesGuard)
  @SetMetadata(WORKSPACE_ROLES_KEY, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateWorkflowDto,
  ) {
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
  }
}
