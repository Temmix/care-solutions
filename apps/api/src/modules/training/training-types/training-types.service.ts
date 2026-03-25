import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CreateTrainingTypeDto } from './dto/create-training-type.dto';
import type { UpdateTrainingTypeDto } from './dto/update-training-type.dto';

export interface TrainingTypeResponse {
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
export class TrainingTypesService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findAllForTenant(tenantId: string | null): Promise<TrainingTypeResponse[]> {
    const conditions: { tenantId: string | null }[] = [{ tenantId: null }];
    if (tenantId) conditions.push({ tenantId });

    const types = await this.prisma.trainingTypeConfig.findMany({
      where: { OR: conditions, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Tenant types with the same code override system types
    const byCode = new Map<string, TrainingTypeResponse>();
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

  async findSystemTypes(): Promise<TrainingTypeResponse[]> {
    const types = await this.prisma.trainingTypeConfig.findMany({
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

  async findTenantTypes(tenantId: string): Promise<TrainingTypeResponse[]> {
    const types = await this.prisma.trainingTypeConfig.findMany({
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

  async create(dto: CreateTrainingTypeDto, tenantId: string | null): Promise<TrainingTypeResponse> {
    const existing = await this.prisma.trainingTypeConfig.findFirst({
      where: { code: dto.code, tenantId },
    });
    if (existing) {
      throw new ConflictException(`Training type code "${dto.code}" already exists`);
    }

    const created = await this.prisma.trainingTypeConfig.create({
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

  async update(
    id: string,
    dto: UpdateTrainingTypeDto,
    tenantId: string | null,
  ): Promise<TrainingTypeResponse> {
    const existing = await this.prisma.trainingTypeConfig.findFirst({
      where: { id, tenantId },
    });
    if (!existing)
      throw new NotFoundException(
        'Training type not found. It may have been deleted or belongs to another organisation.',
      );

    const updated = await this.prisma.trainingTypeConfig.update({
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

  async deactivate(id: string, tenantId: string | null): Promise<void> {
    const existing = await this.prisma.trainingTypeConfig.findFirst({
      where: { id, tenantId },
    });
    if (!existing)
      throw new NotFoundException(
        'Training type not found. It may have been deleted or belongs to another organisation.',
      );

    await this.prisma.trainingTypeConfig.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
