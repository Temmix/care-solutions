import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, ShiftStatus, AvailabilityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftPatternDto } from './dto/create-shift-pattern.dto';
import { UpdateShiftPatternDto } from './dto/update-shift-pattern.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

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
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── Shift Patterns ──────────────────────────────────

  async createShiftPattern(dto: CreateShiftPatternDto, tenantId: string) {
    return this.prisma.shiftPattern.create({
      data: { ...dto, tenantId },
    });
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

    return this.prisma.shift.create({
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

    // ── P0: Check availability/leave conflicts ──
    const availability = await this.prisma.staffAvailability.findMany({
      where: {
        userId: dto.userId,
        date: shiftDate,
        type: { in: BLOCKING_AVAILABILITY },
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

    // Training day warning (soft, not blocked)
    const trainingAvail = await this.prisma.staffAvailability.findFirst({
      where: {
        userId: dto.userId,
        date: shiftDate,
        type: AvailabilityType.TRAINING,
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
    return this.prisma.staffAvailability.create({
      data: {
        date: new Date(dto.date),
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
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) (where.date as Prisma.DateTimeFilter).gte = new Date(filters.from);
      if (filters.to) (where.date as Prisma.DateTimeFilter).lte = new Date(filters.to);
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
      where.date = {};
      if (filters.from) (where.date as Prisma.DateTimeFilter).gte = new Date(filters.from);
      if (filters.to) (where.date as Prisma.DateTimeFilter).lte = new Date(filters.to);
    }

    return this.prisma.staffAvailability.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async deleteAvailability(id: string, userId: string) {
    const existing = await this.prisma.staffAvailability.findFirst({ where: { id, userId } });
    if (!existing)
      throw new NotFoundException(
        'Availability record not found. It may have already been deleted.',
      );
    await this.prisma.staffAvailability.delete({ where: { id } });
  }
}
