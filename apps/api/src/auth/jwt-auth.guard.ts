import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  organizationId: string;
  sid: string;
  role?: WorkspaceRole;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, bearerToken] = authorization?.split(' ') ?? [];
    const token =
      scheme === 'Bearer' && bearerToken
        ? bearerToken
        : request.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedException('Bearer token required');
    }

    let payload: AuthenticatedUser;
    try {
      payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.sub || !payload.organizationId || !payload.sid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const [session, membership] = await Promise.all([
      this.prisma.authSession.findUnique({
        where: { id: payload.sid },
        select: { userId: true, organizationId: true, expiresAt: true, revokedAt: true },
      }),
      this.prisma.workspaceMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: payload.organizationId,
            userId: payload.sub,
          },
        },
        select: { role: true, status: true },
      }),
    ]);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.organizationId !== payload.organizationId ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Session is no longer active');
    }
    if (!membership || membership.status !== 'ACTIVE') {
      throw new UnauthorizedException('Workspace access is no longer active');
    }

    request.user = { ...payload, role: membership.role };
    return true;
  }
}
