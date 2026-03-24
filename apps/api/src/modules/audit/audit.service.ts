import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchAuditLogsDto } from './dto';

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── Create audit entry (fire-and-forget) ─────────────────

  async log(params: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    tenantId?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          metadata: params.metadata ? (params.metadata as Prisma.JsonObject) : undefined,
          tenantId: params.tenantId,
        },
      });
    } catch {
      // Fire-and-forget: never block business logic if audit write fails
    }
  }

  // ── Search audit logs ────────────────────────────────────

  async search(dto: SearchAuditLogsDto, tenantId: string) {
    const page = parseInt(dto.page ?? '1', 10);
    const limit = parseInt(dto.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = { tenantId };
    if (dto.userId) where.userId = dto.userId;
    if (dto.action) where.action = dto.action;
    if (dto.resource) where.resource = dto.resource;
    if (dto.resourceId) where.resourceId = dto.resourceId;
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Compliance summary ───────────────────────────────────

  async getComplianceSummary(tenantId: string, startDate?: string, endDate?: string) {
    const where: Prisma.AuditLogWhereInput = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalActions, resourceBreakdown, actionBreakdown, topUsersRaw] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: true,
        orderBy: { _count: { resource: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    // Resolve user names for top users
    const userIds = topUsersRaw.map((u) => u.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const topUsers = topUsersRaw.map((u) => {
      const user = userMap.get(u.userId);
      return {
        userId: u.userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        count: u._count,
      };
    });

    // Actions by day (last 30 days by default)
    const dayStart = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const dayEnd = endDate ? new Date(endDate) : new Date();

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dayMap = new Map<string, number>();
    for (const log of logs) {
      const day = log.createdAt.toISOString().split('T')[0];
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }
    const actionsByDay = Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      totalActions,
      actionsByDay,
      topUsers,
      resourceBreakdown: resourceBreakdown.map((r) => ({
        resource: r.resource,
        count: r._count,
      })),
      actionBreakdown: actionBreakdown.map((a) => ({
        action: a.action,
        count: a._count,
      })),
    };
  }
}
