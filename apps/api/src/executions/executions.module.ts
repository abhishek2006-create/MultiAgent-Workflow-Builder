import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowsModule } from "../workflows/workflows.module";
import { ExecutionsController } from "./executions.controller";
import { ExecutionsService } from "./executions.service";
import { AiModule } from "../ai/ai.module";
import { ExecutionWorkerService } from "./execution-worker.service";
import { ApprovalsController } from "./approvals.controller";

@Module({
  imports: [AuthModule, WorkflowsModule, AiModule],
  controllers: [ExecutionsController, ApprovalsController],
  providers: [ExecutionsService, ExecutionWorkerService],
})
export class ExecutionsModule {}
