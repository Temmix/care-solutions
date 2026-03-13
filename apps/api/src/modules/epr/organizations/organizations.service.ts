import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { toFhirOrganization, toFhirOrgBundle } from './mappers/organization-fhir.mapper';

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const org = await this.prisma.organization.create({ data: dto });
    return toFhirOrganization(org);
  }

  async findAll(tenantId: string | null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // SUPER_ADMIN sees all orgs; tenant users see only their own org
    const where = tenantId ? { active: true, id: tenantId } : { active: true };

    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return toFhirOrgBundle(orgs, total);
  }

  async findOne(id: string, tenantId: string | null) {
    // Tenant users can only view their own org
    if (tenantId && id !== tenantId) {
      throw new NotFoundException('Organization not found');
    }

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return toFhirOrganization(org);
  }

  async update(id: string, dto: UpdateOrganizationDto, tenantId: string | null) {
    if (tenantId && id !== tenantId) {
      throw new NotFoundException('Organization not found');
    }
    await this.findOne(id, tenantId);
    const org = await this.prisma.organization.update({ where: { id }, data: dto });
    return toFhirOrganization(org);
  }

  async deactivate(id: string, tenantId: string | null) {
    if (tenantId && id !== tenantId) {
      throw new NotFoundException('Organization not found');
    }
    await this.findOne(id, tenantId);
    await this.prisma.organization.update({
      where: { id },
      data: { active: false },
    });
  }
}
