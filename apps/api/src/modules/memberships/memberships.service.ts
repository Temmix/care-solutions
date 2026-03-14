import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMembershipDto } from './dto';
import { Role, MembershipStatus } from '@prisma/client';

const MEMBERSHIP_SELECT = {
  id: true,
  userId: true,
  organizationId: true,
  role: true,
  status: true,
  joinedAt: true,
  leftAt: true,
  createdAt: true,
  organization: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
} as const;

@Injectable()
export class MembershipsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findByUserId(userId: string, includeInactive = false) {
    const where: { userId: string; status?: MembershipStatus } = { userId };
    if (!includeInactive) {
      where.status = 'ACTIVE';
    }

    return this.prisma.userTenantMembership.findMany({
      where,
      select: MEMBERSHIP_SELECT,
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findByOrganizationId(organizationId: string, includeInactive = false) {
    const where: { organizationId: string; status?: MembershipStatus } = { organizationId };
    if (!includeInactive) {
      where.status = 'ACTIVE';
    }

    return this.prisma.userTenantMembership.findMany({
      where,
      select: {
        ...MEMBERSHIP_SELECT,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async getMembershipRole(userId: string, organizationId: string): Promise<Role | null> {
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId, organizationId, status: 'ACTIVE' },
      select: { role: true },
    });
    return membership?.role ?? null;
  }

  async createMembership(userId: string, dto: CreateMembershipDto) {
    if (dto.role === 'SUPER_ADMIN' || dto.role === 'TENANT_ADMIN') {
      throw new ForbiddenException(
        'Super admins and tenant admins cannot be assigned as tenant members.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found.');
    }

    const existing = await this.prisma.userTenantMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId: dto.organizationId } },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new ConflictException('User is already an active member of this organization.');
      }
      // Reactivate inactive membership
      return this.prisma.userTenantMembership.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', role: dto.role, leftAt: null, joinedAt: new Date() },
        select: MEMBERSHIP_SELECT,
      });
    }

    return this.prisma.userTenantMembership.create({
      data: {
        userId,
        organizationId: dto.organizationId,
        role: dto.role,
      },
      select: MEMBERSHIP_SELECT,
    });
  }

  async deactivateMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }

    if (membership.status === 'INACTIVE') {
      throw new ConflictException('This membership is already inactive.');
    }

    return this.prisma.userTenantMembership.update({
      where: { id: membership.id },
      data: { status: 'INACTIVE', leftAt: new Date() },
      select: MEMBERSHIP_SELECT,
    });
  }

  async updateMembershipRole(userId: string, organizationId: string, role: Role) {
    if (role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN') {
      throw new ForbiddenException(
        'Super admins and tenant admins cannot be assigned as tenant members.',
      );
    }

    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }

    if (membership.status === 'INACTIVE') {
      throw new ConflictException('Cannot update an inactive membership. Reactivate it first.');
    }

    return this.prisma.userTenantMembership.update({
      where: { id: membership.id },
      data: { role },
      select: MEMBERSHIP_SELECT,
    });
  }
}
