<<<<<<< HEAD
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
=======
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7

export class CreateWorkflowDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

<<<<<<< HEAD
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
=======
  @IsObject()
  definition!: Record<string, unknown>;
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
<<<<<<< HEAD
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
=======
  @IsObject()
  definition?: Record<string, unknown>;
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
}
