import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CreateCarePlanDto } from './dto/create-care-plan.dto';
import type { UpdateCarePlanDto } from './dto/update-care-plan.dto';
import type { CreateGoalDto } from './dto/create-goal.dto';
import type { UpdateGoalDto } from './dto/update-goal.dto';
import type { CreateActivityDto } from './dto/create-activity.dto';
import type { UpdateActivityDto } from './dto/update-activity.dto';
import type { CreateNoteDto } from './dto/create-note.dto';
import type { SearchCarePlansDto } from './dto/search-care-plans.dto';
import {
  toFhirCarePlan,
  toFhirCarePlanBundle,
  type CarePlanWithRelations,
} from './mappers/care-plan-fhir.mapper';

const CARE_PLAN_INCLUDES = {
  patient: { select: { id: true, givenName: true, familyName: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
  goals: { orderBy: { createdAt: 'asc' as const } },
  activities: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      assignee: { select: { id: true, givenName: true, familyName: true } },
    },
  },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  },
};

@Injectable()
export class CarePlansService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── Create ──────────────────────────────────────────────

  async create(dto: CreateCarePlanDto, userId: string, tenantId: string) {
    const { goals, activities, patientId, startDate, endDate, nextReviewDate, ...rest } = dto;

    const carePlan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.carePlan.create({
        data: {
          ...rest,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
          nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
          patientId,
          authorId: userId,
          tenantId,
          goals: goals?.length
            ? {
                create: goals.map((g) => ({
                  description: g.description,
                  targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
                  measure: g.measure,
                  notes: g.notes,
                })),
              }
            : undefined,
          activities: activities?.length
            ? {
                create: activities.map((a) => ({
                  type: a.type,
                  description: a.description,
                  scheduledAt: a.scheduledAt ? new Date(a.scheduledAt) : undefined,
                  notes: a.notes,
                  assigneeId: a.assigneeId,
                })),
              }
            : undefined,
        },
        include: CARE_PLAN_INCLUDES,
      });

      await tx.patientEvent.create({
        data: {
          patientId,
          eventType: 'CARE_PLAN_CREATED',
          summary: `Care plan created: ${rest.title}`,
          detail: { carePlanId: created.id } as unknown as Prisma.InputJsonValue,
          recordedById: userId,
          tenantId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          resource: 'CarePlan',
          resourceId: created.id,
          tenantId,
        },
      });

      return created;
    });

    return toFhirCarePlan(carePlan as CarePlanWithRelations);
  }

  // ── Search ──────────────────────────────────────────────

  async findAll(dto: SearchCarePlansDto, tenantId: string) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CarePlanWhereInput = { tenantId };
    if (dto.patientId) where.patientId = dto.patientId;
    if (dto.status) where.status = dto.status;
    if (dto.category) where.category = dto.category;

    const [carePlans, total] = await Promise.all([
      this.prisma.carePlan.findMany({
        where,
        include: CARE_PLAN_INCLUDES,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.carePlan.count({ where }),
    ]);

    return toFhirCarePlanBundle(carePlans as CarePlanWithRelations[], total);
  }

  // ── Find One ────────────────────────────────────────────

  async findOne(id: string, tenantId: string) {
    const carePlan = await this.prisma.carePlan.findFirst({
      where: { id, tenantId },
      include: CARE_PLAN_INCLUDES,
    });

    if (!carePlan) throw new NotFoundException('Care plan not found');

    return toFhirCarePlan(carePlan as CarePlanWithRelations);
  }

  // ── Update ──────────────────────────────────────────────

  async update(id: string, dto: UpdateCarePlanDto, userId: string, tenantId: string) {
    const existing = await this.prisma.carePlan.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Care plan not found');

    const { startDate, endDate, nextReviewDate, ...rest } = dto;

    const carePlan = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.carePlan.update({
        where: { id },
        data: {
          ...rest,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
        },
        include: CARE_PLAN_INCLUDES,
      });

      await tx.patientEvent.create({
        data: {
          patientId: existing.patientId,
          eventType: 'CARE_PLAN_UPDATED',
          summary: `Care plan updated: ${updated.title}`,
          detail: dto as unknown as Prisma.InputJsonValue,
          recordedById: userId,
          tenantId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          resource: 'CarePlan',
          resourceId: id,
          tenantId,
        },
      });

      return updated;
    });

    return toFhirCarePlan(carePlan as CarePlanWithRelations);
  }

  // ── Goals ───────────────────────────────────────────────

  async addGoal(carePlanId: string, dto: CreateGoalDto, userId: string, tenantId: string) {
    await this.verifyCarePlan(carePlanId, tenantId);

    const goal = await this.prisma.carePlanGoal.create({
      data: {
        carePlanId,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        measure: dto.measure,
        notes: dto.notes,
      },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'CREATE', resource: 'CarePlanGoal', resourceId: goal.id, tenantId },
    });

    return goal;
  }

  async updateGoal(
    carePlanId: string,
    goalId: string,
    dto: UpdateGoalDto,
    userId: string,
    tenantId: string,
  ) {
    await this.verifyCarePlan(carePlanId, tenantId);

    const existing = await this.prisma.carePlanGoal.findFirst({
      where: { id: goalId, carePlanId },
    });
    if (!existing) throw new NotFoundException('Goal not found');

    const { targetDate, ...rest } = dto;
    const goal = await this.prisma.carePlanGoal.update({
      where: { id: goalId },
      data: {
        ...rest,
        targetDate: targetDate ? new Date(targetDate) : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'UPDATE', resource: 'CarePlanGoal', resourceId: goalId, tenantId },
    });

    return goal;
  }

  async removeGoal(carePlanId: string, goalId: string, userId: string, tenantId: string) {
    await this.verifyCarePlan(carePlanId, tenantId);

    const existing = await this.prisma.carePlanGoal.findFirst({
      where: { id: goalId, carePlanId },
    });
    if (!existing) throw new NotFoundException('Goal not found');

    await this.prisma.carePlanGoal.delete({ where: { id: goalId } });

    await this.prisma.auditLog.create({
      data: { userId, action: 'DELETE', resource: 'CarePlanGoal', resourceId: goalId, tenantId },
    });
  }

  // ── Activities ──────────────────────────────────────────

  async addActivity(carePlanId: string, dto: CreateActivityDto, userId: string, tenantId: string) {
    await this.verifyCarePlan(carePlanId, tenantId);

    const activity = await this.prisma.carePlanActivity.create({
      data: {
        carePlanId,
        type: dto.type,
        description: dto.description,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        notes: dto.notes,
        assigneeId: dto.assigneeId,
      },
      include: {
        assignee: { select: { id: true, givenName: true, familyName: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        resource: 'CarePlanActivity',
        resourceId: activity.id,
        tenantId,
      },
    });

    return activity;
  }

  async updateActivity(
    carePlanId: string,
    activityId: string,
    dto: UpdateActivityDto,
    userId: string,
    tenantId: string,
  ) {
    await this.verifyCarePlan(carePlanId, tenantId);

    const existing = await this.prisma.carePlanActivity.findFirst({
      where: { id: activityId, carePlanId },
    });
    if (!existing) throw new NotFoundException('Activity not found');

    const { scheduledAt, ...rest } = dto;
    const activity = await this.prisma.carePlanActivity.update({
      where: { id: activityId },
      data: {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
      include: {
        assignee: { select: { id: true, givenName: true, familyName: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'CarePlanActivity',
        resourceId: activityId,
        tenantId,
      },
    });

    return activity;
  }

  async removeActivity(carePlanId: string, activityId: string, userId: string, tenantId: string) {
    await this.verifyCarePlan(carePlanId, tenantId);

    const existing = await this.prisma.carePlanActivity.findFirst({
      where: { id: activityId, carePlanId },
    });
    if (!existing) throw new NotFoundException('Activity not found');

    await this.prisma.carePlanActivity.delete({ where: { id: activityId } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'CarePlanActivity',
        resourceId: activityId,
        tenantId,
      },
    });
  }

  // ── Notes ───────────────────────────────────────────────

  async addNote(carePlanId: string, dto: CreateNoteDto, userId: string, tenantId: string) {
    await this.verifyCarePlan(carePlanId, tenantId);

    const note = await this.prisma.carePlanNote.create({
      data: {
        carePlanId,
        content: dto.content,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return note;
  }

  async getNotes(
    carePlanId: string,
    tenantId: string,
    pagination?: { page?: number; limit?: number },
  ) {
    await this.verifyCarePlan(carePlanId, tenantId);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      this.prisma.carePlanNote.findMany({
        where: { carePlanId },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.carePlanNote.count({ where: { carePlanId } }),
    ]);

    return { data: notes, total, page, limit };
  }

  // ── Helpers ─────────────────────────────────────────────

  private async verifyCarePlan(carePlanId: string, tenantId: string) {
    const carePlan = await this.prisma.carePlan.findFirst({
      where: { id: carePlanId, tenantId },
    });
    if (!carePlan) throw new NotFoundException('Care plan not found');
    return carePlan;
  }
}
