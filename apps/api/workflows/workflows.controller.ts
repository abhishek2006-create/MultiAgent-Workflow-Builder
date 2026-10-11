import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";

import {
  WorkflowsService,
} from "./workflows.service";

import {
  CreateWorkflowDto,
} from "./dto/create-workflow.dto";

import {
  UpdateWorkflowDto,
} from "./dto/update-workflow.dto";

import {
  RunWorkflowDto,
} from "./dto/run-workflow.dto";

@Controller("workflows")
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
  ) {}

  @Get()
  findAll() {
    return this.workflowsService.findAll();
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
  ) {
    return this.workflowsService.findOne(
      id,
    );
  }

  @Post()
  create(
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowsService.create(
      dto,
    );
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(
      id,
      dto,
    );
  }

  @Delete(":id")
  remove(
    @Param("id") id: string,
  ) {
    return this.workflowsService.remove(
      id,
    );
  }

  @Post(":id/validate")
  validate(
    @Param("id") id: string,
  ) {
    return this.workflowsService.validate(
      id,
    );
  }

  @Post(":id/run")
  run(
    @Param("id") id: string,
    @Body() dto: RunWorkflowDto,
  ) {
    return this.workflowsService.run(
      id,
      dto,
    );
  }
}