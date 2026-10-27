import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

import { GoogleStrategy } from "./strategies/google.strategy";
import { GithubStrategy } from "./strategies/github.strategy";
import { WorkspaceRolesGuard } from "./workspace-roles.guard";
import { oauthConfigured } from "./oauth-config";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "7d",
        },
      }),
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    { provide: GoogleStrategy, useFactory: () => oauthConfigured("google") ? new GoogleStrategy() : null },
    { provide: GithubStrategy, useFactory: () => oauthConfigured("github") ? new GithubStrategy() : null },
    WorkspaceRolesGuard,
  ],

  exports: [
    AuthService,
    JwtModule,
    WorkspaceRolesGuard,
  ],
})
export class AuthModule {}
