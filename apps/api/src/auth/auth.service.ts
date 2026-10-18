import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { hash, compare } from "bcryptjs";
import { randomBytes } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";

interface OAuthUser {
  provider: "google" | "github";
  subject: string;
  email: string;
  name?: string;
  avatar?: string;
}

type OAuthIdentityDelegate = {
  findUnique(args: {
    where: {
      provider_subject: {
        provider: OAuthUser["provider"];
        subject: string;
      };
    };
    include: { user: true };
  }): Promise<{
    user: {
      id: string;
      email: string;
      organizationId: string | null;
    };
  } | null>;
  create(args: {
    data: {
      provider: OAuthUser["provider"];
      subject: string;
      userId: string;
    };
  }): Promise<unknown>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private get authIdentity(): OAuthIdentityDelegate {
    return (
      this.prisma as unknown as {
        authIdentity: OAuthIdentityDelegate;
      }
    ).authIdentity;
  }


  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();

    const passwordHash = await hash(
      input.password,
      12,
    );

    try {
      const account = await this.prisma.$transaction(async (transaction) => {
        const organization = await transaction.organization.create({
          data: {
            name: input.organizationName.trim(),
            slug: this.createOrganizationSlug(input.organizationName),
            users: { create: { email, passwordHash } },
          },
          include: { users: true },
        });
        const user = organization.users[0];
        await transaction.workspaceMembership.create({
          data: { organizationId: organization.id, userId: user.id, role: "OWNER" },
        });
        return { userId: user.id, email: user.email, organizationId: organization.id };
      });
      return this.issueToken(account.userId, account.email, account.organizationId);
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "An account with this email already exists",
        );
      }

      throw error;
    }
  }

  async login(input: LoginDto) {
    const email =
      input.email.trim().toLowerCase();

    const user =
      await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (
      !user ||
      !user.organizationId ||
      !user.passwordHash ||
      !(await compare(
        input.password,
        user.passwordHash,
      ))
    ) {
      throw new UnauthorizedException(
        "Email or password is incorrect",
      );
    }

    return this.issueToken(
      user.id,
      user.email,
      user.organizationId,
    );
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        organizationId: true,
      },
    });

    if (!user || !user.organizationId) {
      throw new UnauthorizedException("User session is no longer valid");
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username ?? user.email.split("@")[0],
    };
  }

  async validateOAuthUser(
    oauthUser: OAuthUser,
  ) {
    const existingIdentity =
      await this.authIdentity.findUnique({
        where: {
          provider_subject: {
            provider:
              oauthUser.provider,
            subject:
              oauthUser.subject,
          },
        },

        include: {
          user: true,
        },
      });

    if (existingIdentity) {
      const user =
        existingIdentity.user;

      if (!user.organizationId) {
        throw new UnauthorizedException(
          "User is not associated with an organization",
        );
      }

      await this.ensureOAuthUsername(
        user.id,
        oauthUser.name,
      );

      return this.issueToken(
        user.id,
        user.email,
        user.organizationId,
      );
    }

    let user =
      await this.prisma.user.findUnique({
        where: {
          email: oauthUser.email
            .trim()
            .toLowerCase(),
        },
      });


    if (user) {
      if (!user.organizationId) {
        throw new UnauthorizedException(
          "User is not associated with an organization",
        );
      }

      await this.authIdentity.create({
        data: {
          provider:
            oauthUser.provider,

          subject:
            oauthUser.subject,

          userId: user.id,
        },
      });

      await this.ensureOAuthUsername(
        user.id,
        oauthUser.name,
      );

      return this.issueToken(
        user.id,
        user.email,
        user.organizationId,
      );
    }
    const created = await this.prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: {
          name: `${oauthUser.name || oauthUser.email.split("@")[0]}'s Organization`,
          slug: this.createOrganizationSlug(`${oauthUser.name || oauthUser.email.split("@")[0]}-workspace`),

          users: {
            create: {
              email:
                oauthUser.email
                  .trim()
                  .toLowerCase(),

              username: await this.createOAuthUsername(oauthUser.name),

              passwordHash: await hash(
                randomBytes(32).toString("hex"),
                12,
              ),
            },
          },
        },

        include: {
          users: true,
        },
      });
      const createdUser = organization.users[0];
      await transaction.workspaceMembership.create({
        data: { organizationId: organization.id, userId: createdUser.id, role: "OWNER" },
      });
      await transaction.authIdentity.create({
        data: {
          provider: oauthUser.provider,
          subject: oauthUser.subject,
          userId: createdUser.id,
        },
      });
      return { organizationId: organization.id, user: createdUser };
    });

    user = created.user;
    return this.issueToken(
      user.id,
      user.email,
      created.organizationId,
    );
  }

  async switchWorkspace(userId: string, workspaceId: string, currentSessionId: string) {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: workspaceId,
          userId,
        },
      },
      select: {
        status: true,
        role: true,
        organization: { select: { id: true } },
      },
    });
    if (!membership || membership.status !== "ACTIVE") {
      throw new UnauthorizedException("Workspace access is not active");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new UnauthorizedException("User session is no longer valid");

    const token = await this.issueToken(userId, user.email, membership.organization.id);
    await this.prisma.authSession.updateMany({
      where: { id: currentSessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return token;
  }

  async revokeToken(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sid?: string }>(token);
      if (payload.sid) {
        await this.prisma.authSession.updateMany({
          where: { id: payload.sid, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // Logout remains idempotent for expired, malformed, or legacy cookies.
    }
  }

  private createOrganizationSlug(name: string): string {
    const base = name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace";
    return `${base}-${randomBytes(4).toString("hex")}`;
  }

  private async ensureOAuthUsername(
    userId: string,
    name: string | undefined,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user?.username) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          username: await this.createOAuthUsername(name),
        },
      });
    }
  }

  private async createOAuthUsername(name: string | undefined): Promise<string> {
    const displayName = name?.trim() || "Creator";
    const namePart =
      displayName
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24) || "Creator";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const username = `${namePart} ✦ ${randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;
      const existingUser = await this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (!existingUser) {
        return username;
      }
    }

    throw new Error("Unable to generate a unique OAuth username");
  }

  private async issueToken(
    id: string,
    email: string,
    organizationId: string,
  ) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await this.prisma.authSession.create({
      data: { userId: id, organizationId, expiresAt },
      select: { id: true },
    });
    const accessToken =
      await this.jwt.signAsync({
        sub: id,
        organizationId,
        sid: session.id,
      });

    return {
      access_token: accessToken,

      token_type: "Bearer",

      expires_in: "7d",

      user: {
        id,
        email,
        organizationId,
      },
    };
  }
}
