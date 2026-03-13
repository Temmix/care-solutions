import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CreateAssessmentTypeDto } from './dto/create-assessment-type.dto';
import type { UpdateAssessmentTypeDto } from './dto/update-assessment-type.dto';

export interface AssessmentTypeResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
}

@Injectable()
export class AssessmentTypesService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── List types available to a tenant (system + tenant-specific) ───

  async findAllForTenant(tenantId: string | null): Promise<AssessmentTypeResponse[]> {
    const conditions: { tenantId: string | null }[] = [{ tenantId: null }];
    if (tenantId) conditions.push({ tenantId });

    const types = await this.prisma.assessmentTypeConfig.findMany({
      where: { OR: conditions, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Tenant types with the same code override system types
    const byCode = new Map<string, AssessmentTypeResponse>();
    for (const t of types) {
      const existing = byCode.get(t.code);
      const isSystem = t.tenantId === null;
      // Tenant-specific overrides system
      if (!existing || !isSystem) {
        byCode.set(t.code, {
          id: t.id,
          code: t.code,
          name: t.name,
          description: t.description,
          category: t.category,
          isActive: t.isActive,
          isSystem,
          sortOrder: t.sortOrder,
        });
      }
    }

    return [...byCode.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }

  // ── List system-only types (super admin) ──────────────────────────

  async findSystemTypes(): Promise<AssessmentTypeResponse[]> {
    const types = await this.prisma.assessmentTypeConfig.findMany({
      where: { tenantId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return types.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      category: t.category,
      isActive: t.isActive,
      isSystem: true,
      sortOrder: t.sortOrder,
    }));
  }

  // ── List tenant-only types (admin) ────────────────────────────────

  async findTenantTypes(tenantId: string): Promise<AssessmentTypeResponse[]> {
    const types = await this.prisma.assessmentTypeConfig.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return types.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      category: t.category,
      isActive: t.isActive,
      isSystem: false,
      sortOrder: t.sortOrder,
    }));
  }

  // ── Create ────────────────────────────────────────────────────────

  async create(
    dto: CreateAssessmentTypeDto,
    tenantId: string | null,
  ): Promise<AssessmentTypeResponse> {
    // Check for duplicate code in same scope
    const existing = await this.prisma.assessmentTypeConfig.findFirst({
      where: { code: dto.code, tenantId },
    });
    if (existing) {
      throw new ConflictException(`Assessment type code "${dto.code}" already exists`);
    }

    const created = await this.prisma.assessmentTypeConfig.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        sortOrder: dto.sortOrder ?? 0,
        tenantId,
      },
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description,
      category: created.category,
      isActive: created.isActive,
      isSystem: created.tenantId === null,
      sortOrder: created.sortOrder,
    };
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateAssessmentTypeDto,
    tenantId: string | null,
  ): Promise<AssessmentTypeResponse> {
    const existing = await this.prisma.assessmentTypeConfig.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Assessment type not found');

    const updated = await this.prisma.assessmentTypeConfig.update({
      where: { id },
      data: dto,
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      isActive: updated.isActive,
      isSystem: updated.tenantId === null,
      sortOrder: updated.sortOrder,
    };
  }

  // ── Deactivate (soft delete) ──────────────────────────────────────

  async deactivate(id: string, tenantId: string | null): Promise<void> {
    const existing = await this.prisma.assessmentTypeConfig.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Assessment type not found');

    await this.prisma.assessmentTypeConfig.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Validate code for tenant ──────────────────────────────────────

  async validateCode(code: string, tenantId: string): Promise<boolean> {
    const type = await this.prisma.assessmentTypeConfig.findFirst({
      where: {
        code,
        isActive: true,
        OR: [{ tenantId: null }, { tenantId }],
      },
    });
    return !!type;
  }

  // ── Get display name for a code ───────────────────────────────────

  async getDisplayNames(codes: string[], tenantId: string): Promise<Map<string, string>> {
    const types = await this.prisma.assessmentTypeConfig.findMany({
      where: {
        code: { in: codes },
        OR: [{ tenantId: null }, { tenantId }],
      },
    });

    // Tenant types override system types
    const result = new Map<string, string>();
    for (const t of types) {
      if (!result.has(t.code) || t.tenantId !== null) {
        result.set(t.code, t.name);
      }
    }
    return result;
  }
}
