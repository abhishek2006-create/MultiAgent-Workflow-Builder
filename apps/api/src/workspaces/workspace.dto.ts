import { IsEmail, IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

export class CreateWorkspaceInvitationDto {
  @IsEmail()
  email!: string;

  @IsIn(["ADMIN", "MEMBER", "VIEWER"])
  role!: "ADMIN" | "MEMBER" | "VIEWER";
}

export class AcceptWorkspaceInvitationDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;
}
