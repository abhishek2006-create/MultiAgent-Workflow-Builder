import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
<<<<<<< HEAD
  exports: [WorkflowsService]
=======
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
})
export class WorkflowsModule {}
