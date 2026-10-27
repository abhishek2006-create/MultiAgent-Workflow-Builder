import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";

import { Request, Response } from "express";

import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { AuthenticatedRequest, JwtAuthGuard } from "./jwt-auth.guard";

import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { GithubAuthGuard } from "./guards/github-auth.guard";
import { GoogleCallbackAuthGuard } from "./guards/google-callback-auth.guard";
import { GithubCallbackAuthGuard } from "./guards/github-callback-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
  ) {}

  @Post("register")
  register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.register(body).then((result) => {
      this.setAuthCookie(res, result.access_token);
      return { user: result.user };
    });
  }

  @Post("login")
  login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(body).then((result) => {
      this.setAuthCookie(res, result.access_token);
      return { user: result.user };
    });
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getProfile(request.user.sub).then((profile) => ({
      ...profile,
      organizationId: request.user.organizationId,
      role: request.user.role,
    }));
  }

  @Post("logout")
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.revokeToken(request.cookies?.access_token).then(() => {
      res.clearCookie("access_token", this.cookieOptions());
      return { success: true };
    });
  }

  @Post("workspaces/:id/switch")
  @UseGuards(JwtAuthGuard)
  async switchWorkspace(
    @Req() request: AuthenticatedRequest,
    @Param("id") workspaceId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.switchWorkspace(
      request.user.sub,
      workspaceId,
      request.user.sid,
    );
    this.setAuthCookie(res, result.access_token);
    return { user: result.user };
  }

  /**
   * Start Google OAuth login.
   *
   * Frontend:
   * window.location.href =
   *   "http://localhost:3001/api/auth/google";
   */
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Passport handles the redirect to Google.
  }

  /**
   * Google OAuth callback.
   *
   * Google redirects here after successful authentication.
   */
  @Get("google/callback")
  @UseGuards(GoogleCallbackAuthGuard)
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleOAuthCallback(
      req,
      res,
    );
  }

 
  /**
   * Start GitHub OAuth login.
   *
   * Frontend:
   * window.location.href =
   *   "http://localhost:3001/api/auth/github";
   */
  @Get("github")
  @UseGuards(GithubAuthGuard)
  githubLogin() {
    // Passport handles the redirect to GitHub.
  }

  /**
   * GitHub OAuth callback.
   *
   * GitHub redirects here after successful authentication.
   */
  @Get("github/callback")
  @UseGuards(GithubCallbackAuthGuard)
  async githubCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleOAuthCallback(
      req,
      res,
    );
  }

  private async handleOAuthCallback(
    req: Request,
    res: Response,
  ) {
    const oauthUser =
      req.user as {
        provider:
          | "google"
          | "github";

        subject: string;

        email: string;

        name?: string;

        avatar?: string;
      };

    if (!oauthUser) {
      return res.redirect(
        this.getFrontendUrl(
          "/login?error=oauth_failed",
        ),
      );
    }

    try {
      /**
       * AuthService:
       *
       * 1. Finds existing OAuth identity
       * 2. Finds existing email account
       * 3. Links OAuth identity if needed
       * 4. Creates new account if needed
       * 5. Creates your existing JWT
       */
      const authResult =
        await this.auth.validateOAuthUser(
          oauthUser,
        );

      this.setAuthCookie(res, authResult.access_token);

      return res.redirect(
        this.getFrontendUrl(
          "/workflows",
        ),
      );
    } catch (error) {
      console.error(
        "OAuth authentication failed:",
        error,
      );

      return res.redirect(
        this.getFrontendUrl(
          "/login?error=oauth_failed",
        ),
      );
    }
  }

  private setAuthCookie(
    res: Response,
    accessToken: string,
  ): void {
    res.cookie("access_token", accessToken, {
      ...this.cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    } as const;
  }

  private getFrontendUrl(
    path: string,
  ) {
    const frontendUrl = (
      process.env.WEB_ORIGIN?.split(",")[0]?.trim() ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");

    return `${frontendUrl}${path}`;
  }
}
