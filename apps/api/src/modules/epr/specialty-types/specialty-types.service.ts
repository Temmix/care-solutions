import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CreateSpecialtyTypeDto } from './dto/create-specialty-type.dto';
import type { UpdateSpecialtyTypeDto } from './dto/update-specialty-type.dto';

export interface SpecialtyTypeResponse {
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
export class SpecialtyTypesService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── List types available to a tenant (system + tenant-specific) ───

  async findAllForTenant(tenantId: string | null): Promise<SpecialtyTypeResponse[]> {
    const conditions: { tenantId: string | null }[] = [{ tenantId: null }];
    if (tenantId) conditions.push({ tenantId });

    const types = await this.prisma.specialtyConfig.findMany({
      where: { OR: conditions, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Tenant types with the same code override system types
    const byCode = new Map<string, SpecialtyTypeResponse>();
    for (const t of types) {
      const existing = byCode.get(t.code);
      const isSystem = t.tenantId === null;
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

  async findSystemTypes(): Promise<SpecialtyTypeResponse[]> {
    const types = await this.prisma.specialtyConfig.findMany({
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

  async findTenantTypes(tenantId: string): Promise<SpecialtyTypeResponse[]> {
    const types = await this.prisma.specialtyConfig.findMany({
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
    dto: CreateSpecialtyTypeDto,
    tenantId: string | null,
  ): Promise<SpecialtyTypeResponse> {
    const existing = await this.prisma.specialtyConfig.findFirst({
      where: { code: dto.code, tenantId },
    });
    if (existing) {
      throw new ConflictException(`Specialty type code "${dto.code}" already exists`);
    }

    const created = await this.prisma.specialtyConfig.create({
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
    dto: UpdateSpecialtyTypeDto,
    tenantId: string | null,
  ): Promise<SpecialtyTypeResponse> {
    const existing = await this.prisma.specialtyConfig.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Specialty type not found');

    const updated = await this.prisma.specialtyConfig.update({
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
    const existing = await this.prisma.specialtyConfig.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Specialty type not found');

    await this.prisma.specialtyConfig.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Get display names for codes ─────────────────────────────────

  async getDisplayNames(codes: string[], tenantId: string): Promise<Map<string, string>> {
    const types = await this.prisma.specialtyConfig.findMany({
      where: {
        code: { in: codes },
        OR: [{ tenantId: null }, { tenantId }],
      },
    });

    const result = new Map<string, string>();
    for (const t of types) {
      if (!result.has(t.code) || t.tenantId !== null) {
        result.set(t.code, t.name);
      }
    }
    return result;
  }
}
