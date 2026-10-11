import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  AcceptWorkspaceInvitationDto,
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
} from "./workspace.dto";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.workspaceMembership.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        role: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async create(userId: string, input: CreateWorkspaceDto) {
    const name = input.name.trim();
    const slug = this.createSlug(name);

    return this.prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: { name, slug },
        select: { id: true, name: true, slug: true },
      });
      const membership = await transaction.workspaceMembership.create({
        data: {
          organizationId: organization.id,
          userId,
          role: "OWNER",
          status: "ACTIVE",
        },
        select: { role: true },
      });
      return { ...organization, role: membership.role };
    });
  }

  async invite(
    userId: string,
    organizationId: string,
    input: CreateWorkspaceInvitationDto,
  ) {
    const email = input.email.trim().toLowerCase();
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { role: true, status: true },
    });
    if (
      !membership ||
      membership.status !== "ACTIVE" ||
      !["OWNER", "ADMIN"].includes(membership.role)
    ) {
      throw new ForbiddenException("Workspace admin access required");
    }

    const invitee = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (invitee) {
      const existing = await this.prisma.workspaceMembership.findUnique({
        where: { organizationId_userId: { organizationId, userId: invitee.id } },
        select: { id: true },
      });
      if (existing) throw new ConflictException("User already belongs to this workspace");
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        organizationId,
        email,
        role: input.role,
        tokenHash,
        invitedById: userId,
        expiresAt,
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    });
    return { ...invitation, token: rawToken };
  }

  async acceptInvitation(userId: string, input: AcceptWorkspaceInvitationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new UnauthorizedException("User session is no longer valid");

    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
    if (
      !invitation ||
      invitation.email !== user.email.toLowerCase() ||
      invitation.expiresAt <= new Date() ||
      invitation.acceptedAt ||
      invitation.revokedAt
    ) {
      throw new UnauthorizedException("Invitation is invalid or expired");
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.workspaceMembership.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
          status: "ACTIVE",
        },
      });
      await transaction.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return { ...invitation.organization, role: invitation.role };
    });
  }

  private createSlug(name: string): string {
    const base = name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace";
    return `${base}-${randomBytes(4).toString("hex")}`;
  }
}
