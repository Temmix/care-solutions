import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ShiftStatus, AvailabilityType, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftPatternDto } from './dto/create-shift-pattern.dto';
import { UpdateShiftPatternDto } from './dto/update-shift-pattern.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { RespondSwapDto } from './dto/respond-swap.dto';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

// ── Time helpers ──────────────────────────────────────

/** Parse "HH:mm" → minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Get shift absolute start/end in minutes-since-midnight, handling overnight shifts */
function shiftTimeRange(
  startTime: string,
  endTime: string,
): { startMin: number; endMin: number; overnight: boolean } {
  const startMin = timeToMinutes(startTime);
  let endMin = timeToMinutes(endTime);
  const overnight = endMin <= startMin;
  if (overnight) endMin += 24 * 60; // e.g. 21:00–07:00 → 1260–1860
  return { startMin, endMin, overnight };
}

/** Check if two time ranges on the same date overlap */
function timesOverlap(
  a: { startMin: number; endMin: number },
  b: { startMin: number; endMin: number },
): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Calculate shift duration in hours */
function shiftDurationHours(startTime: string, endTime: string, breakMinutes: number): number {
  const { startMin, endMin } = shiftTimeRange(startTime, endTime);
  return (endMin - startMin - breakMinutes) / 60;
}

/** Minimum rest between shifts in hours */
const MIN_REST_HOURS = 11;
const MAX_WEEKLY_HOURS = 48;
const MAX_CONSECUTIVE_DAYS = 6;

// Types for leave blocking
const BLOCKING_AVAILABILITY: AvailabilityType[] = [
  AvailabilityType.UNAVAILABLE,
  AvailabilityType.ANNUAL_LEAVE,
  AvailabilityType.SICK_LEAVE,
];

@Injectable()
export class WorkforceService {
  private readonly logger = new Logger(WorkforceService.name);

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(EventsService) private eventsService: EventsService,
    @Inject(AuditService) private audit: AuditService,
    @Inject(NotificationsService) private notifications: NotificationsService,
  ) {}

  // ── Shift Patterns ──────────────────────────────────

  async createShiftPattern(dto: CreateShiftPatternDto, tenantId: string) {
    const pattern = await this.prisma.shiftPattern.create({
      data: { ...dto, tenantId },
    });

    this.audit
      .log({
        userId: 'system',
        action: 'CREATE',
        resource: 'ShiftPattern',
        resourceId: pattern.id,
        tenantId,
        metadata: { name: dto.name },
      })
      .catch(() => {});

    return pattern;
  }

  async listShiftPatterns(tenantId: string | null) {
    const where: Prisma.ShiftPatternWhereInput = { isActive: true };
    if (tenantId) where.tenantId = tenantId;
    return this.prisma.shiftPattern.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async updateShiftPattern(id: string, dto: UpdateShiftPatternDto, tenantId: string | null) {
    const findWhere: Prisma.ShiftPatternWhereInput = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const existing = await this.prisma.shiftPattern.findFirst({ where: findWhere });
    if (!existing)
      throw new NotFoundException(
        'Shift pattern not found. It may have been deleted or belongs to another organisation.',
      );
    return this.prisma.shiftPattern.update({ where: { id }, data: dto });
  }

  async deleteShiftPattern(id: string, tenantId: string | null) {
    const findWhere: Prisma.ShiftPatternWhereInput = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const existing = await this.prisma.shiftPattern.findFirst({ where: findWhere });
    if (!existing)
      throw new NotFoundException(
        'Shift pattern not found. It may have been deleted or belongs to another organisation.',
      );
    await this.prisma.shiftPattern.update({ where: { id }, data: { isActive: false } });
  }

  // ── Shifts ──────────────────────────────────────────

  async createShift(dto: CreateShiftDto, tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(dto.date);
    if (shiftDate < today) {
      throw new BadRequestException(
        `Cannot create a shift for ${dto.date} because it is in the past. Shifts can only be scheduled for today or future dates.`,
      );
    }

    const pattern = await this.prisma.shiftPattern.findFirst({
      where: { id: dto.shiftPatternId, tenantId },
    });
    if (!pattern)
      throw new NotFoundException(
        'The selected shift pattern no longer exists. Please refresh and select a different pattern.',
      );

    const shift = await this.prisma.shift.create({
      data: {
        date: new Date(dto.date),
        shiftPatternId: dto.shiftPatternId,
        locationId: dto.locationId,
        notes: dto.notes,
        tenantId,
      },
      include: {
        shiftPattern: true,
        location: true,
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
      },
    });

    this.audit
      .log({
        userId: 'system',
        action: 'CREATE',
        resource: 'Shift',
        resourceId: shift.id,
        tenantId,
        metadata: { date: dto.date, shiftPatternId: dto.shiftPatternId },
      })
      .catch(() => {});

    return shift;
  }

  async listShifts(
    tenantId: string | null,
    filters: { from?: string; to?: string; status?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (filters.status) where.status = filters.status as Prisma.EnumShiftStatusFilter;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) (where.date as Prisma.DateTimeFilter).gte = new Date(filters.from);
      if (filters.to) (where.date as Prisma.DateTimeFilter).lte = new Date(filters.to);
    }

    const [shifts, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        include: {
          shiftPattern: true,
          location: true,
          assignments: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { date: 'asc' },
      }),
      this.prisma.shift.count({ where }),
    ]);

    return { data: shifts, total, page, limit };
  }

  async getShift(id: string, tenantId: string | null) {
    const where: Prisma.ShiftWhereInput = { id };
    if (tenantId) where.tenantId = tenantId;
    const shift = await this.prisma.shift.findFirst({
      where,
      include: {
        shiftPattern: true,
        location: true,
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });
    if (!shift)
      throw new NotFoundException(
        'Shift not found. It may have been deleted or belongs to another organisation.',
      );
    return shift;
  }

  async updateShift(
    id: string,
    data: { status?: string; notes?: string },
    tenantId: string | null,
  ) {
    const findWhere: Prisma.ShiftWhereInput = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const existing = await this.prisma.shift.findFirst({
      where: findWhere,
      include: { shiftPattern: true, assignments: true },
    });
    if (!existing)
      throw new NotFoundException(
        'Shift not found. It may have been deleted or belongs to another organisation.',
      );

    // ── Immutability: COMPLETED shifts cannot be modified ──
    if (existing.status === 'COMPLETED') {
      throw new BadRequestException(
        'This shift has already been completed and cannot be modified. Create a new shift if changes are needed.',
      );
    }

    // ── Immutability: CANCELLED shifts cannot be modified ──
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException(
        'This shift has been cancelled and cannot be modified. Create a new shift instead.',
      );
    }

    // ── Published shifts can only be cancelled, not reverted to draft ──
    if (
      existing.status === 'PUBLISHED' &&
      data.status &&
      data.status !== 'CANCELLED' &&
      data.status !== 'IN_PROGRESS'
    ) {
      throw new BadRequestException(
        'A published shift can only be marked as in progress or cancelled. It cannot be reverted to draft.',
      );
    }

    // ── Publish validation: minimum staffing ──
    if (data.status === 'PUBLISHED') {
      if (existing.assignments.length === 0) {
        throw new BadRequestException(
          'Cannot publish this shift because no staff have been assigned yet. Assign at least one staff member before publishing.',
        );
      }
    }

    const updateData: Prisma.ShiftUpdateInput = {};
    if (data.status) updateData.status = data.status as ShiftStatus;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        shiftPattern: true,
        location: true,
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });
  }

  async deleteShift(id: string, tenantId: string | null) {
    const findWhere: Prisma.ShiftWhereInput = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const existing = await this.prisma.shift.findFirst({
      where: findWhere,
      include: { shiftPattern: true, assignments: true },
    });
    if (!existing)
      throw new NotFoundException(
        'Shift not found. It may have been deleted or belongs to another organisation.',
      );

    if (existing.status === 'PUBLISHED' || existing.status === 'IN_PROGRESS') {
      throw new BadRequestException(
        'Only draft or cancelled shifts can be deleted. Cancel the shift first if you want to remove it.',
      );
    }

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException(
        'Completed shifts cannot be deleted. They are kept for record-keeping.',
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (existing.date < today) {
      throw new BadRequestException(
        'Past shifts cannot be deleted. They are kept for historical records.',
      );
    }

    // Delete assignments first, then the shift
    await this.prisma.shiftAssignment.deleteMany({ where: { shiftId: id } });
    await this.prisma.shift.delete({ where: { id } });
  }

  // ── Assignment with full validation ───────────────────

  async assignShift(shiftId: string, dto: AssignShiftDto, tenantId: string | null) {
    const findWhere: Prisma.ShiftWhereInput = { id: shiftId };
    if (tenantId) findWhere.tenantId = tenantId;
    const shift = await this.prisma.shift.findFirst({
      where: findWhere,
      include: { shiftPattern: true },
    });
    if (!shift)
      throw new NotFoundException(
        'Shift not found. It may have been deleted or belongs to another organisation.',
      );

    // ── Cannot assign to completed/cancelled shifts ──
    if (shift.status === 'COMPLETED' || shift.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot assign staff to this shift because it is ${shift.status.toLowerCase()}. Only draft or published shifts accept new assignments.`,
      );
    }

    const shiftDate = shift.date;
    const shiftDateStr = shiftDate.toISOString().split('T')[0];
    const thisRange = shiftTimeRange(shift.shiftPattern.startTime, shift.shiftPattern.endTime);

    // ── P0: Check availability/leave conflicts (supports date ranges) ──
    const availability = await this.prisma.staffAvailability.findMany({
      where: {
        userId: dto.userId,
        type: { in: BLOCKING_AVAILABILITY },
        date: { lte: shiftDate },
        OR: [{ endDate: { gte: shiftDate } }, { endDate: null, date: shiftDate }],
      },
    });
    if (availability.length > 0) {
      const reason = availability[0].type.replace(/_/g, ' ').toLowerCase();
      throw new BadRequestException(`Staff member is marked as ${reason} on ${shiftDateStr}`);
    }

    // ── P0: Check overlapping shifts on the same day ──
    const sameDayAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId: dto.userId,
        shift: { date: shiftDate, status: { not: 'CANCELLED' } },
      },
      include: { shift: { include: { shiftPattern: true } } },
    });

    for (const existing of sameDayAssignments) {
      const existingRange = shiftTimeRange(
        existing.shift.shiftPattern.startTime,
        existing.shift.shiftPattern.endTime,
      );
      if (timesOverlap(thisRange, existingRange)) {
        throw new BadRequestException(
          `Shift overlaps with "${existing.shift.shiftPattern.name}" (${existing.shift.shiftPattern.startTime}–${existing.shift.shiftPattern.endTime}) on the same day`,
        );
      }
    }

    // ── P0: Minimum rest between shifts (check previous and next day) ──
    const prevDay = new Date(shiftDate);
    prevDay.setDate(prevDay.getDate() - 1);
    const nextDay = new Date(shiftDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const adjacentAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId: dto.userId,
        shift: {
          date: { in: [prevDay, nextDay] },
          status: { not: 'CANCELLED' },
        },
      },
      include: { shift: { include: { shiftPattern: true } } },
    });

    for (const adj of adjacentAssignments) {
      const adjRange = shiftTimeRange(
        adj.shift.shiftPattern.startTime,
        adj.shift.shiftPattern.endTime,
      );
      const adjDateStr = adj.shift.date.toISOString().split('T')[0];
      const isPrevDay = adjDateStr === prevDay.toISOString().split('T')[0];

      let restHours: number;
      if (isPrevDay) {
        // Previous day shift ends → this shift starts. Gap = (24*60 - adjEnd) + thisStart
        restHours = (24 * 60 - adjRange.endMin + thisRange.startMin) / 60;
        // Handle overnight previous shifts
        if (adjRange.overnight) {
          restHours = (thisRange.startMin - (adjRange.endMin - 24 * 60)) / 60;
        }
      } else {
        // This shift ends → next day shift starts. Gap = (24*60 - thisEnd) + adjStart
        restHours = (24 * 60 - thisRange.endMin + adjRange.startMin) / 60;
        if (thisRange.overnight) {
          restHours = (adjRange.startMin - (thisRange.endMin - 24 * 60)) / 60;
        }
      }

      if (restHours < MIN_REST_HOURS) {
        const direction = isPrevDay ? 'after' : 'before';
        throw new BadRequestException(
          `Insufficient rest period: only ${Math.round(restHours)}h ${direction} "${adj.shift.shiftPattern.name}" on ${adjDateStr}. Minimum ${MIN_REST_HOURS}h required`,
        );
      }
    }

    // ── P2: Warnings (returned alongside the assignment) ──
    const warnings: string[] = [];

    // Max hours per week check
    const weekStart = new Date(shiftDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId: dto.userId,
        shift: {
          date: { gte: weekStart, lte: weekEnd },
          status: { not: 'CANCELLED' },
        },
      },
      include: { shift: { include: { shiftPattern: true } } },
    });

    let weeklyHours = weekAssignments.reduce((sum, a) => {
      return (
        sum +
        shiftDurationHours(
          a.shift.shiftPattern.startTime,
          a.shift.shiftPattern.endTime,
          a.shift.shiftPattern.breakMinutes,
        )
      );
    }, 0);
    const thisShiftHours = shiftDurationHours(
      shift.shiftPattern.startTime,
      shift.shiftPattern.endTime,
      shift.shiftPattern.breakMinutes,
    );
    weeklyHours += thisShiftHours;

    if (weeklyHours > MAX_WEEKLY_HOURS) {
      warnings.push(
        `Weekly hours will be ${Math.round(weeklyHours)}h, exceeding the ${MAX_WEEKLY_HOURS}h recommended maximum`,
      );
    }

    // Max consecutive days check
    const assignedDates = new Set(
      weekAssignments.map((a) => a.shift.date.toISOString().split('T')[0]),
    );
    assignedDates.add(shiftDateStr);
    // Check for consecutive run in this week
    let maxConsecutive = 0;
    let currentRun = 0;
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      if (assignedDates.has(d.toISOString().split('T')[0])) {
        currentRun++;
        if (currentRun > maxConsecutive) maxConsecutive = currentRun;
      } else {
        currentRun = 0;
      }
    }
    if (maxConsecutive > MAX_CONSECUTIVE_DAYS) {
      warnings.push(
        `Staff member will work ${maxConsecutive} consecutive days, exceeding the ${MAX_CONSECUTIVE_DAYS}-day recommended maximum`,
      );
    }

    // Training day warning (soft, not blocked) — supports date ranges
    const trainingAvail = await this.prisma.staffAvailability.findFirst({
      where: {
        userId: dto.userId,
        type: AvailabilityType.TRAINING,
        date: { lte: shiftDate },
        OR: [{ endDate: { gte: shiftDate } }, { endDate: null, date: shiftDate }],
      },
    });
    if (trainingAvail) {
      warnings.push('Staff member has training scheduled on this date');
    }

    // ── Create the assignment ──
    const assignment = await this.prisma.shiftAssignment.create({
      data: {
        shiftId,
        userId: dto.userId,
        role: dto.role,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    if (tenantId)
      this.audit
        .log({
          userId: 'system',
          action: 'ASSIGN',
          resource: 'Shift',
          resourceId: shiftId,
          tenantId,
          metadata: { userId: dto.userId, role: dto.role },
        })
        .catch(() => {});

    return { ...assignment, warnings };
  }

  async removeAssignment(shiftId: string, userId: string, tenantId: string | null) {
    const findWhere: Prisma.ShiftWhereInput = { id: shiftId };
    if (tenantId) findWhere.tenantId = tenantId;
    const shift = await this.prisma.shift.findFirst({ where: findWhere });
    if (!shift)
      throw new NotFoundException(
        'Shift not found. It may have been deleted or belongs to another organisation.',
      );

    // Cannot remove from completed shifts
    if (shift.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot remove staff from a completed shift. Completed shifts are locked for record-keeping.',
      );
    }

    await this.prisma.shiftAssignment.delete({
      where: { shiftId_userId: { shiftId, userId } },
    });
  }

  // ── Availability ────────────────────────────────────

  async createAvailability(dto: CreateAvailabilityDto, userId: string, tenantId: string) {
    const startDate = new Date(dto.date);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    return this.prisma.staffAvailability.create({
      data: {
        date: startDate,
        endDate,
        type: dto.type,
        startTime: dto.startTime,
        endTime: dto.endTime,
        notes: dto.notes,
        userId,
        tenantId,
      },
    });
  }

  async listAvailability(
    tenantId: string | null,
    filters: { from?: string; to?: string; userId?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.StaffAvailabilityWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (filters.userId) where.userId = filters.userId;

    // Range overlap: record overlaps [from, to] when date <= to AND (endDate ?? date) >= from
    if (filters.from || filters.to) {
      const conditions: Prisma.StaffAvailabilityWhereInput[] = [];
      if (filters.to) {
        conditions.push({ date: { lte: new Date(filters.to) } });
      }
      if (filters.from) {
        const fromDate = new Date(filters.from);
        conditions.push({
          OR: [{ endDate: { gte: fromDate } }, { endDate: null, date: { gte: fromDate } }],
        });
      }
      where.AND = conditions;
    }

    const [items, total] = await Promise.all([
      this.prisma.staffAvailability.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        skip,
        take: limit,
        orderBy: { date: 'asc' },
      }),
      this.prisma.staffAvailability.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  async getMyAvailability(
    userId: string,
    tenantId: string | null,
    filters: { from?: string; to?: string },
  ) {
    const where: Prisma.StaffAvailabilityWhereInput = { userId };
    if (tenantId) where.tenantId = tenantId;

    if (filters.from || filters.to) {
      const conditions: Prisma.StaffAvailabilityWhereInput[] = [];
      if (filters.to) {
        conditions.push({ date: { lte: new Date(filters.to) } });
      }
      if (filters.from) {
        const fromDate = new Date(filters.from);
        conditions.push({
          OR: [{ endDate: { gte: fromDate } }, { endDate: null, date: { gte: fromDate } }],
        });
      }
      where.AND = conditions;
    }

    return this.prisma.staffAvailability.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  // ── Assignable Staff ──────────────────────────────────

  async getAssignableStaff(shiftId: string, tenantId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
      include: { shiftPattern: true, assignments: true },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const shiftDate = shift.date;
    const thisRange = shiftTimeRange(shift.shiftPattern.startTime, shift.shiftPattern.endTime);

    // Get all active tenant members
    const members = await this.prisma.userTenantMembership.findMany({
      where: { organizationId: tenantId, status: 'ACTIVE' },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    // Already-assigned user IDs
    const assignedIds = new Set(shift.assignments.map((a) => a.userId));

    // Batch-fetch availability and same-day assignments for all users
    const userIds = members.map((m) => m.userId);

    const [allAvailability, allSameDayAssignments, allAdjacentAssignments] = await Promise.all([
      this.prisma.staffAvailability.findMany({
        where: {
          userId: { in: userIds },
          date: { lte: shiftDate },
          OR: [{ endDate: { gte: shiftDate } }, { endDate: null, date: shiftDate }],
        },
      }),
      this.prisma.shiftAssignment.findMany({
        where: {
          userId: { in: userIds },
          shift: { date: shiftDate, status: { not: 'CANCELLED' } },
        },
        include: { shift: { include: { shiftPattern: true } } },
      }),
      (() => {
        const prevDay = new Date(shiftDate);
        prevDay.setDate(prevDay.getDate() - 1);
        const nextDay = new Date(shiftDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return this.prisma.shiftAssignment.findMany({
          where: {
            userId: { in: userIds },
            shift: { date: { in: [prevDay, nextDay] }, status: { not: 'CANCELLED' } },
          },
          include: { shift: { include: { shiftPattern: true } } },
        });
      })(),
    ]);

    // Index by userId
    const availByUser = new Map<string, typeof allAvailability>();
    for (const a of allAvailability) {
      const list = availByUser.get(a.userId) ?? [];
      list.push(a);
      availByUser.set(a.userId, list);
    }

    const sameDayByUser = new Map<string, typeof allSameDayAssignments>();
    for (const a of allSameDayAssignments) {
      const list = sameDayByUser.get(a.userId) ?? [];
      list.push(a);
      sameDayByUser.set(a.userId, list);
    }

    const adjacentByUser = new Map<string, typeof allAdjacentAssignments>();
    for (const a of allAdjacentAssignments) {
      const list = adjacentByUser.get(a.userId) ?? [];
      list.push(a);
      adjacentByUser.set(a.userId, list);
    }

    const prevDay = new Date(shiftDate);
    prevDay.setDate(prevDay.getDate() - 1);

    const result = members.map((m) => {
      const userId = m.userId;
      const status: 'available' | 'warning' | 'blocked' = 'available';
      const reasons: string[] = [];

      // Already assigned
      if (assignedIds.has(userId)) {
        return {
          ...m.user,
          membershipRole: m.role,
          status: 'blocked' as const,
          reasons: ['Already assigned to this shift'],
          alreadyAssigned: true,
        };
      }

      // Check blocking availability
      const userAvail = availByUser.get(userId) ?? [];
      const blockingAvail = userAvail.filter((a) => BLOCKING_AVAILABILITY.includes(a.type));
      if (blockingAvail.length > 0) {
        const a = blockingAvail[0];
        const typeLabel = a.type.replace(/_/g, ' ').toLowerCase();
        const dateRange = a.endDate
          ? `${a.date.toISOString().split('T')[0]} to ${a.endDate.toISOString().split('T')[0]}`
          : a.date.toISOString().split('T')[0];
        return {
          ...m.user,
          membershipRole: m.role,
          status: 'blocked' as const,
          reasons: [`On ${typeLabel} (${dateRange})`],
          alreadyAssigned: false,
        };
      }

      // Check overlapping shifts
      const sameDayShifts = sameDayByUser.get(userId) ?? [];
      for (const existing of sameDayShifts) {
        const existingRange = shiftTimeRange(
          existing.shift.shiftPattern.startTime,
          existing.shift.shiftPattern.endTime,
        );
        if (timesOverlap(thisRange, existingRange)) {
          return {
            ...m.user,
            membershipRole: m.role,
            status: 'blocked' as const,
            reasons: [
              `Overlaps with "${existing.shift.shiftPattern.name}" (${existing.shift.shiftPattern.startTime}–${existing.shift.shiftPattern.endTime})`,
            ],
            alreadyAssigned: false,
          };
        }
      }

      // Check rest periods
      const adjacentShifts = adjacentByUser.get(userId) ?? [];
      for (const adj of adjacentShifts) {
        const adjRange = shiftTimeRange(
          adj.shift.shiftPattern.startTime,
          adj.shift.shiftPattern.endTime,
        );
        const adjDateStr = adj.shift.date.toISOString().split('T')[0];
        const isPrevDay = adjDateStr === prevDay.toISOString().split('T')[0];

        let restHours: number;
        if (isPrevDay) {
          restHours = (24 * 60 - adjRange.endMin + thisRange.startMin) / 60;
          if (adjRange.overnight) {
            restHours = (thisRange.startMin - (adjRange.endMin - 24 * 60)) / 60;
          }
        } else {
          restHours = (24 * 60 - thisRange.endMin + adjRange.startMin) / 60;
          if (thisRange.overnight) {
            restHours = (adjRange.startMin - (thisRange.endMin - 24 * 60)) / 60;
          }
        }

        if (restHours < MIN_REST_HOURS) {
          const direction = isPrevDay ? 'after' : 'before';
          return {
            ...m.user,
            membershipRole: m.role,
            status: 'blocked' as const,
            reasons: [
              `Only ${Math.round(restHours)}h rest ${direction} "${adj.shift.shiftPattern.name}" on ${adjDateStr}`,
            ],
            alreadyAssigned: false,
          };
        }
      }

      // Check training (warning, not blocked)
      const trainingAvail = userAvail.filter((a) => a.type === AvailabilityType.TRAINING);
      if (trainingAvail.length > 0) {
        reasons.push('Has training scheduled on this date');
      }

      return {
        ...m.user,
        membershipRole: m.role,
        status: reasons.length > 0 ? ('warning' as const) : status,
        reasons,
        alreadyAssigned: false,
      };
    });

    // Sort: available first, then warnings, then blocked
    const order = { available: 0, warning: 1, blocked: 2 };
    result.sort((a, b) => order[a.status] - order[b.status]);

    return result;
  }

  async deleteAvailability(id: string, userId: string) {
    const existing = await this.prisma.staffAvailability.findFirst({ where: { id, userId } });
    if (!existing)
      throw new NotFoundException(
        'Availability record not found. It may have already been deleted.',
      );
    await this.prisma.staffAvailability.delete({ where: { id } });
  }

  // ── Helpers ──────────────────────────────────────────

  private async getAdminUserIds(tenantId: string): Promise<string[]> {
    const admins = await this.prisma.userTenantMembership.findMany({
      where: {
        organizationId: tenantId,
        status: 'ACTIVE',
        role: { in: ['ADMIN', 'TENANT_ADMIN'] },
      },
      select: { userId: true },
    });
    return admins.map((a) => a.userId);
  }

  // ── Shift Swap Marketplace ────────────────────────────

  async createSwapRequest(dto: CreateSwapRequestDto, userId: string, tenantId: string) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { id: dto.originalShiftAssignmentId, userId },
      include: { shift: { include: { shiftPattern: true } } },
    });
    if (!assignment)
      throw new NotFoundException('Shift assignment not found or does not belong to you.');

    if (assignment.shift.status === 'COMPLETED' || assignment.shift.status === 'CANCELLED') {
      throw new BadRequestException('Cannot swap a completed or cancelled shift.');
    }

    const existing = await this.prisma.shiftSwapRequest.findFirst({
      where: {
        originalShiftAssignmentId: dto.originalShiftAssignmentId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });
    if (existing) {
      throw new BadRequestException('A swap request already exists for this shift assignment.');
    }

    const swapRequest = await this.prisma.shiftSwapRequest.create({
      data: {
        requesterId: userId,
        originalShiftAssignmentId: dto.originalShiftAssignmentId,
        targetShiftAssignmentId: dto.targetShiftAssignmentId,
        reason: dto.reason,
        tenantId,
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        originalShiftAssignment: { include: { shift: { include: { shiftPattern: true } } } },
      },
    });

    this.eventsService.emitSwapCreated(tenantId, {
      swapId: swapRequest.id,
      requesterName: `${swapRequest.requester.firstName} ${swapRequest.requester.lastName}`,
      shiftDate: swapRequest.originalShiftAssignment.shift.date.toISOString().split('T')[0],
    });

    this.audit
      .log({
        userId,
        action: 'CREATE_SWAP',
        resource: 'ShiftSwapRequest',
        resourceId: swapRequest.id,
        tenantId,
        metadata: { originalShiftAssignmentId: dto.originalShiftAssignmentId },
      })
      .catch(() => {});

    if (dto.targetShiftAssignmentId) {
      const targetAssignment = await this.prisma.shiftAssignment.findFirst({
        where: { id: dto.targetShiftAssignmentId },
      });
      if (targetAssignment) {
        this.notifications
          .notify({
            userId: targetAssignment.userId,
            tenantId,
            type: NotificationType.SHIFT_SWAP_REQUEST,
            title: 'Shift Swap Request',
            message: 'You have received a new shift swap request',
            link: '/app/swap-marketplace',
          })
          .catch(() => {});
      }
    }

    return swapRequest;
  }

  async getOpenSwaps(tenantId: string) {
    return this.prisma.shiftSwapRequest.findMany({
      where: { tenantId, status: 'PENDING' },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, role: true } },
        originalShiftAssignment: {
          include: { shift: { include: { shiftPattern: true, location: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMySwapRequests(userId: string, tenantId: string) {
    return this.prisma.shiftSwapRequest.findMany({
      where: {
        tenantId,
        OR: [{ requesterId: userId }, { responderId: userId }],
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        responder: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        originalShiftAssignment: {
          include: { shift: { include: { shiftPattern: true, location: true } } },
        },
        targetShiftAssignment: {
          include: { shift: { include: { shiftPattern: true, location: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingApprovals(tenantId: string) {
    return this.prisma.shiftSwapRequest.findMany({
      where: { tenantId, status: 'ACCEPTED' },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, role: true } },
        responder: { select: { id: true, firstName: true, lastName: true, role: true } },
        originalShiftAssignment: {
          include: { shift: { include: { shiftPattern: true, location: true } } },
        },
        targetShiftAssignment: {
          include: { shift: { include: { shiftPattern: true, location: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToSwap(swapId: string, dto: RespondSwapDto, userId: string, tenantId: string) {
    const swap = await this.prisma.shiftSwapRequest.findFirst({
      where: { id: swapId, tenantId, status: 'PENDING' },
    });
    if (!swap) throw new NotFoundException('Swap request not found or no longer pending.');

    if (swap.requesterId === userId) {
      throw new BadRequestException('You cannot respond to your own swap request.');
    }

    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { id: dto.targetShiftAssignmentId, userId },
    });
    if (!assignment) throw new NotFoundException('The shift assignment does not belong to you.');

    const updatedSwap = await this.prisma.shiftSwapRequest.update({
      where: { id: swapId },
      data: {
        status: 'ACCEPTED',
        responderId: userId,
        targetShiftAssignmentId: dto.targetShiftAssignmentId,
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        responder: { select: { id: true, firstName: true, lastName: true } },
        originalShiftAssignment: {
          include: { shift: { include: { shiftPattern: true } } },
        },
        targetShiftAssignment: {
          include: { shift: { include: { shiftPattern: true } } },
        },
      },
    });

    this.audit
      .log({
        userId,
        action: 'RESPOND_SWAP',
        resource: 'ShiftSwapRequest',
        resourceId: swapId,
        tenantId,
        metadata: { targetShiftAssignmentId: dto.targetShiftAssignmentId },
      })
      .catch(() => {});

    this.notifications
      .notify({
        userId: swap.requesterId,
        tenantId,
        type: NotificationType.SHIFT_SWAP_RESPONSE,
        title: 'Shift Swap Response',
        message: 'Your shift swap request has received a response',
        link: '/app/swap-marketplace',
      })
      .catch(() => {});

    // Notify admins that swap needs approval
    this.getAdminUserIds(tenantId)
      .then((adminIds) =>
        this.notifications.notifyMany(adminIds, {
          tenantId,
          type: NotificationType.SHIFT_SWAP_NEEDS_APPROVAL,
          title: 'Shift Swap Needs Approval',
          message: `${updatedSwap.responder?.firstName} ${updatedSwap.responder?.lastName} has accepted a shift swap and it needs your approval.`,
          link: '/app/swap-marketplace',
        }),
      )
      .catch(() => {});

    return updatedSwap;
  }

  async approveSwap(swapId: string, approvedById: string, tenantId: string) {
    this.logger.log(`approveSwap called: swapId=${swapId}, approvedById=${approvedById}`);

    const swap = await this.prisma.shiftSwapRequest.findFirst({
      where: { id: swapId, tenantId, status: 'ACCEPTED' },
      include: {
        originalShiftAssignment: { include: { shift: { include: { shiftPattern: true } } } },
        targetShiftAssignment: { include: { shift: { include: { shiftPattern: true } } } },
      },
    });

    this.logger.log(`swap found: ${!!swap}, status: ${swap?.status}`);

    if (!swap) throw new NotFoundException('Swap request not found or not yet accepted.');
    if (!swap.targetShiftAssignment)
      throw new BadRequestException('No target assignment to swap with.');

    const originalUserId = swap.originalShiftAssignment.userId;
    const targetUserId = swap.targetShiftAssignment.userId;

    this.logger.log(`Swapping users: ${originalUserId} <-> ${targetUserId}`);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.shiftAssignment.update({
          where: { id: swap.originalShiftAssignmentId },
          data: { userId: targetUserId },
        });
        await tx.shiftAssignment.update({
          where: { id: swap.targetShiftAssignmentId! },
          data: { userId: originalUserId },
        });

        return tx.shiftSwapRequest.update({
          where: { id: swapId },
          data: { status: 'APPROVED', approvedById },
          include: {
            requester: { select: { id: true, firstName: true, lastName: true } },
            responder: { select: { id: true, firstName: true, lastName: true } },
            approvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        });
      });

      this.logger.log(`Transaction completed successfully for swap ${swapId}`);
      this.eventsService.emitSwapUpdated(tenantId, { swapId, status: 'APPROVED' });

      this.audit
        .log({
          userId: approvedById,
          action: 'APPROVE_SWAP',
          resource: 'ShiftSwapRequest',
          resourceId: swapId,
          tenantId,
          metadata: { originalUserId, targetUserId },
        })
        .catch(() => {});

      // Notify requester and responder
      const approvedNotification = {
        tenantId,
        type: NotificationType.SHIFT_SWAP_APPROVED,
        title: 'Shift Swap Approved',
        message: 'Your shift swap has been approved by a manager.',
        link: '/app/swap-marketplace',
      };
      this.notifications
        .notifyMany([swap.requesterId, swap.responderId!].filter(Boolean), approvedNotification)
        .catch(() => {});

      return result;
    } catch (error) {
      this.logger.error(`approveSwap failed: ${error}`);
      this.logger.error(error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async rejectSwap(
    swapId: string,
    managerNote: string | undefined,
    approvedById: string,
    tenantId: string,
  ) {
    const swap = await this.prisma.shiftSwapRequest.findFirst({
      where: { id: swapId, tenantId, status: { in: ['PENDING', 'ACCEPTED'] } },
    });
    if (!swap) throw new NotFoundException('Swap request not found.');

    const rejected = await this.prisma.shiftSwapRequest.update({
      where: { id: swapId },
      data: { status: 'REJECTED', managerNote, approvedById },
    });

    this.audit
      .log({
        userId: approvedById,
        action: 'REJECT_SWAP',
        resource: 'ShiftSwapRequest',
        resourceId: swapId,
        tenantId,
        metadata: { managerNote },
      })
      .catch(() => {});

    // Notify requester (and responder if exists)
    const rejectMessage = managerNote
      ? `Your shift swap has been rejected. Note: ${managerNote}`
      : 'Your shift swap has been rejected by a manager.';
    const userIds = [swap.requesterId, swap.responderId].filter(Boolean) as string[];
    this.notifications
      .notifyMany(userIds, {
        tenantId,
        type: NotificationType.SHIFT_SWAP_REJECTED,
        title: 'Shift Swap Rejected',
        message: rejectMessage,
        link: '/app/swap-marketplace',
      })
      .catch(() => {});

    return rejected;
  }

  async cancelSwapRequest(swapId: string, userId: string, tenantId: string) {
    const swap = await this.prisma.shiftSwapRequest.findFirst({
      where: { id: swapId, tenantId, status: { in: ['PENDING', 'ACCEPTED'] } },
    });
    if (!swap) throw new NotFoundException('Swap request not found.');
    if (swap.requesterId !== userId)
      throw new ForbiddenException('Only the requester can cancel this swap request.');

    const cancelled = await this.prisma.shiftSwapRequest.update({
      where: { id: swapId },
      data: { status: 'CANCELLED' },
    });

    // Notify responder if swap was already accepted
    if (swap.responderId) {
      this.notifications
        .notify({
          userId: swap.responderId,
          tenantId,
          type: NotificationType.SHIFT_SWAP_CANCELLED,
          title: 'Shift Swap Cancelled',
          message: 'A shift swap you accepted has been cancelled by the requester.',
          link: '/app/swap-marketplace',
        })
        .catch(() => {});
    }

    return cancelled;
  }

  // ── Compliance Dashboard ──────────────────────────────

  async getComplianceReport(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const [shifts, members] = await Promise.all([
      this.prisma.shift.findMany({
        where: {
          tenantId,
          date: { gte: fromDate, lte: toDate },
          status: { not: 'CANCELLED' },
        },
        include: {
          shiftPattern: true,
          location: true,
          assignments: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
          },
        },
      }),
      this.prisma.userTenantMembership.findMany({
        where: { organizationId: tenantId, status: 'ACTIVE' },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      }),
    ]);

    // Build per-user assignment list
    const userAssignments = new Map<
      string,
      Array<{
        date: Date;
        startTime: string;
        endTime: string;
        breakMinutes: number;
        shiftName: string;
      }>
    >();
    const userNames = new Map<string, string>();

    for (const shift of shifts) {
      for (const assignment of shift.assignments) {
        const uid = assignment.userId;
        userNames.set(uid, `${assignment.user.firstName} ${assignment.user.lastName}`);
        const list = userAssignments.get(uid) ?? [];
        list.push({
          date: shift.date,
          startTime: shift.shiftPattern.startTime,
          endTime: shift.shiftPattern.endTime,
          breakMinutes: shift.shiftPattern.breakMinutes,
          shiftName: shift.shiftPattern.name,
        });
        userAssignments.set(uid, list);
      }
    }

    // Calculate violations
    const weeklyHoursExceeded: Array<{
      userId: string;
      name: string;
      weekStart: string;
      hours: number;
    }> = [];
    const insufficientRest: Array<{
      userId: string;
      name: string;
      date: string;
      restHours: number;
    }> = [];
    const consecutiveDaysExceeded: Array<{
      userId: string;
      name: string;
      startDate: string;
      days: number;
    }> = [];
    const overtimeHours: Array<{
      userId: string;
      name: string;
      scheduledHours: number;
      overtimeHours: number;
    }> = [];

    let totalShifts = 0;
    let totalHoursScheduled = 0;

    for (const [userId, assignments] of userAssignments) {
      const name = userNames.get(userId) ?? 'Unknown';

      // Sort by date
      assignments.sort((a, b) => a.date.getTime() - b.date.getTime());

      let userTotalHours = 0;

      // Weekly hours check
      const weeklyBuckets = new Map<string, number>();
      for (const a of assignments) {
        const hours = shiftDurationHours(a.startTime, a.endTime, a.breakMinutes);
        userTotalHours += hours;
        totalShifts++;
        totalHoursScheduled += hours;

        const weekStart = new Date(a.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyBuckets.set(weekKey, (weeklyBuckets.get(weekKey) ?? 0) + hours);
      }

      for (const [weekStart, hours] of weeklyBuckets) {
        if (hours > MAX_WEEKLY_HOURS) {
          weeklyHoursExceeded.push({ userId, name, weekStart, hours: Math.round(hours) });
        }
      }

      // Standard working hours (assume 37.5h/week * weeks in period)
      const weeksInPeriod = Math.max(
        1,
        (toDate.getTime() - fromDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      const standardHours = weeksInPeriod * 37.5;
      const overtime = userTotalHours - standardHours;
      if (overtime > 0) {
        overtimeHours.push({
          userId,
          name,
          scheduledHours: Math.round(userTotalHours),
          overtimeHours: Math.round(overtime),
        });
      }

      // Rest period check
      for (let i = 1; i < assignments.length; i++) {
        const prev = assignments[i - 1];
        const curr = assignments[i];
        const dayDiff = (curr.date.getTime() - prev.date.getTime()) / (24 * 60 * 60 * 1000);
        if (dayDiff <= 1) {
          const prevRange = shiftTimeRange(prev.startTime, prev.endTime);
          const currRange = shiftTimeRange(curr.startTime, curr.endTime);
          let restH: number;
          if (dayDiff === 0) {
            restH = (currRange.startMin - prevRange.endMin) / 60;
          } else {
            restH = (24 * 60 - prevRange.endMin + currRange.startMin) / 60;
            if (prevRange.overnight) {
              restH = (currRange.startMin - (prevRange.endMin - 24 * 60)) / 60;
            }
          }
          if (restH < MIN_REST_HOURS) {
            insufficientRest.push({
              userId,
              name,
              date: curr.date.toISOString().split('T')[0],
              restHours: Math.round(restH),
            });
          }
        }
      }

      // Consecutive days check
      const dates = [...new Set(assignments.map((a) => a.date.toISOString().split('T')[0]))].sort();
      let maxRun = 1;
      let runStart = dates[0];
      let currentRun = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
        if (diff === 1) {
          currentRun++;
          if (currentRun > maxRun) {
            maxRun = currentRun;
            runStart = dates[i - currentRun + 1];
          }
        } else {
          currentRun = 1;
        }
      }
      if (maxRun > MAX_CONSECUTIVE_DAYS) {
        consecutiveDaysExceeded.push({ userId, name, startDate: runStart, days: maxRun });
      }
    }

    const violationCount =
      weeklyHoursExceeded.length + insufficientRest.length + consecutiveDaysExceeded.length;
    const totalStaff = members.length;
    const maxViolations = totalStaff * 3;
    const complianceScore =
      maxViolations > 0
        ? Math.round(((maxViolations - violationCount) / maxViolations) * 100)
        : 100;

    // Staffing by location
    const locationMap = new Map<
      string,
      {
        locationId: string;
        locationName: string;
        totalBeds: number;
        shiftCount: number;
        staffCount: number;
      }
    >();
    for (const shift of shifts) {
      if (!shift.locationId || !shift.location) continue;
      const loc = locationMap.get(shift.locationId) ?? {
        locationId: shift.locationId,
        locationName: shift.location.name,
        totalBeds: shift.location.capacity,
        shiftCount: 0,
        staffCount: 0,
      };
      loc.shiftCount++;
      loc.staffCount += shift.assignments.length;
      locationMap.set(shift.locationId, loc);
    }

    const staffingByLocation = [...locationMap.values()].map((loc) => ({
      locationId: loc.locationId,
      locationName: loc.locationName,
      totalBeds: loc.totalBeds,
      avgStaffPerShift:
        loc.shiftCount > 0 ? Math.round((loc.staffCount / loc.shiftCount) * 10) / 10 : 0,
      staffToPatientRatio:
        loc.totalBeds > 0
          ? Math.round((loc.staffCount / loc.shiftCount / loc.totalBeds) * 100) / 100
          : 0,
    }));

    return {
      period: { from, to },
      summary: {
        totalStaff,
        totalShifts,
        totalHoursScheduled: Math.round(totalHoursScheduled),
        violationCount,
        complianceScore,
      },
      workingTimeViolations: {
        weeklyHoursExceeded,
        insufficientRest,
        consecutiveDaysExceeded,
      },
      staffingByLocation,
      overtimeHours,
    };
  }
}
