import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayMaxSize(500)
  nodes!: Record<string, unknown>[];

  @IsArray()
  @ArrayMaxSize(2000)
  edges!: Record<string, unknown>[];
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  nodes?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  edges?: Record<string, unknown>[];
}

export class ValidateWorkflowDefinitionDto {
  @IsArray()
  @ArrayMaxSize(500)
  nodes!: Record<string, unknown>[];

  @IsArray()
  @ArrayMaxSize(2000)
  edges!: Record<string, unknown>[];
}
