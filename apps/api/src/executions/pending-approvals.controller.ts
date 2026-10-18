import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("approvals")
@UseGuards(JwtAuthGuard)
export class PendingApprovalsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("pending")
  async list(
    @Req() request: AuthenticatedRequest,
    @Query("cursor") cursor?: string,
    @Query("limit") limitText?: string,
  ) {
    const limit = limitText === undefined ? 30 : Number(limitText);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException("Approval page limit must be an integer from 1 to 100.");
    }
    const after = decodeCursor(cursor);

    const rows = await this.prisma.approval.findMany({
      where: {
        ...(after ? {
          OR: [
            { requestedAt: { gt: after.requestedAt } },
            { requestedAt: after.requestedAt, id: { gt: after.id } },
          ],
        } : {}),
        status: "PENDING",
        execution: { workflow: { organizationId: request.user.organizationId } },
      },
      orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      select: {
        id: true,
        executionId: true,
        requestedAt: true,
        decision: true,
        step: { select: { nodeId: true, nodeType: true, input: true } },
        execution: {
          select: {
            id: true,
            status: true,
            traceId: true,
            workflow: { select: { id: true, name: true } },
            workflowVersion: { select: { version: true } },
          },
        },
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? encodeCursor(items.at(-1)!) : null,
    };
  }
}

function decodeCursor(cursor?: string): { requestedAt: Date; id: string } | undefined {
  if (cursor === undefined) return undefined;
  if (!cursor || cursor.length > 512) throw new BadRequestException("Approval cursor is invalid.");
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!value || typeof value !== "object") throw new Error("invalid cursor");
    const candidate = value as Record<string, unknown>;
    const requestedAt = typeof candidate.requestedAt === "string" ? new Date(candidate.requestedAt) : null;
    if (!requestedAt || !Number.isFinite(requestedAt.getTime()) || typeof candidate.id !== "string" || !candidate.id.trim() || candidate.id.length > 200) {
      throw new Error("invalid cursor");
    }
    return { requestedAt, id: candidate.id };
  } catch {
    throw new BadRequestException("Approval cursor is invalid.");
  }
}

function encodeCursor(value: { requestedAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ requestedAt: value.requestedAt.toISOString(), id: value.id }), "utf8").toString("base64url");
}
