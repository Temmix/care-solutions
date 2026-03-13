import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePractitionerDto, UpdatePractitionerDto } from './dto';
import { toFhirPractitioner } from './mappers/practitioner-fhir.mapper';

@Injectable()
export class PractitionersService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(dto: CreatePractitionerDto, tenantId: string) {
    const practitioner = await this.prisma.practitioner.create({
      data: { ...dto, tenantId },
      include: { organization: true },
    });
    return toFhirPractitioner(practitioner);
  }

  async findAll(tenantId: string | null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.PractitionerWhereInput = { active: true };
    if (tenantId) where.tenantId = tenantId;

    const [practitioners, total] = await Promise.all([
      this.prisma.practitioner.findMany({
        where,
        include: { organization: true },
        skip,
        take: limit,
        orderBy: { familyName: 'asc' },
      }),
      this.prisma.practitioner.count({ where }),
    ]);
    return {
      data: practitioners.map(toFhirPractitioner),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, tenantId: string | null) {
    const where: Prisma.PractitionerWhereInput = { id };
    if (tenantId) where.tenantId = tenantId;

    const practitioner = await this.prisma.practitioner.findFirst({
      where,
      include: { organization: true },
    });
    if (!practitioner) throw new NotFoundException('Practitioner not found');
    return toFhirPractitioner(practitioner);
  }

  async update(id: string, dto: UpdatePractitionerDto, tenantId: string) {
    await this.findOne(id, tenantId);
    const practitioner = await this.prisma.practitioner.update({
      where: { id },
      data: dto,
      include: { organization: true },
    });
    return toFhirPractitioner(practitioner);
  }
}
