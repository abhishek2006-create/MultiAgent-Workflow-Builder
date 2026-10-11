import { IsObject, IsOptional } from "class-validator";

export class CreateExecutionDto {
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
