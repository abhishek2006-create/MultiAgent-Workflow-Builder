import { IsObject, IsOptional } from "class-validator";

export class RunWorkflowDto {
  @(IsOptional() as any)
  @(IsObject() as any)
  input?: Record<string, unknown>;
}