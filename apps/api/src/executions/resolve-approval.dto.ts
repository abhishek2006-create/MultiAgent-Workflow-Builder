import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ResolveApprovalDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;
}
