import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkflowDto, UpdateWorkflowDto } from './workflow.dto';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateWorkflowDto) {
    return this.workflows.create(request.user.organizationId, body);
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
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateWorkflowDto,
  ) {
    return this.workflows.update(request.user.organizationId, id, body);
  }
}
