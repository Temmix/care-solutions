import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionLimitService } from '../billing/subscription-limit.service';
import { EncryptionService } from '../encryption/encryption.service';
import { BlindIndexService } from '../encryption/blind-index.service';
import { EmailService } from '../notifications/email.service';
import { renderInvitationEmail, renderDeactivationEmail } from '../notifications/email-templates';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { CreateTenantAdminDto } from './dto/create-tenant-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(SubscriptionLimitService) private limits: SubscriptionLimitService,
    @Inject(EncryptionService) private encryption: EncryptionService,
    @Inject(BlindIndexService) private blindIndex: BlindIndexService,
    @Inject(EmailService) private emailService: EmailService,
  ) {}

  async findAll(tenantId: string | null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    if (!tenantId) {
      // SUPER_ADMIN listing all users
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          select: USER_SELECT,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count(),
      ]);
      return { data: users, total, page, limit };
    }

    // Tenant-scoped: find users via membership join table
    const where = { organizationId: tenantId, status: 'ACTIVE' as const };
    const [memberships, total] = await Promise.all([
      this.prisma.userTenantMembership.findMany({
        where,
        select: {
          role: true,
          user: { select: USER_SELECT },
        },
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.userTenantMembership.count({ where }),
    ]);

    // Map to expected shape, using membership role
    const data = memberships.map((m) => ({
      ...m.user,
      role: m.role, // Override with tenant-specific role from membership
    }));

    return { data, total, page, limit };
  }

  async findOne(id: string, tenantId: string | null) {
    if (tenantId) {
      // Validate user has active membership in this tenant
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { userId: id, organizationId: tenantId, status: 'ACTIVE' },
        select: {
          role: true,
          user: { select: USER_SELECT },
        },
      });

      if (!membership) {
        throw new NotFoundException('User not found. They may have been deactivated or removed.');
      }

      return { ...membership.user, role: membership.role };
    }

    const user = await this.prisma.user.findFirst({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found. They may have been deactivated or removed.');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string | null) {
    await this.findOne(id, tenantId);

    // If role is being updated and we have a tenant context, also update the membership
    if (dto.role && tenantId) {
      await this.prisma.userTenantMembership.updateMany({
        where: { userId: id, organizationId: tenantId, status: 'ACTIVE' },
        data: { role: dto.role },
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async remove(id: string, tenantId: string | null) {
    const userToRemove = await this.findOne(id, tenantId);

    // If tenant-scoped, deactivate the membership rather than the entire user
    if (tenantId) {
      await this.prisma.userTenantMembership.updateMany({
        where: { userId: id, organizationId: tenantId, status: 'ACTIVE' },
        data: { status: 'INACTIVE', leftAt: new Date() },
      });
    }

    const result = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });

    // Send deactivation email (mandatory, bypasses preferences)
    const orgName = tenantId
      ? ((
          await this.prisma.organization.findUnique({
            where: { id: tenantId },
            select: { name: true },
          })
        )?.name ?? 'your organisation')
      : 'Clinvara';
    const { html, text } = renderDeactivationEmail({
      firstName: userToRemove.firstName ?? 'there',
      orgName,
    });
    this.emailService
      .sendEmail({
        to: result.email,
        subject: 'Account Deactivated',
        htmlBody: html,
        textBody: text,
      })
      .catch((err) =>
        this.logger.warn(`Failed to send deactivation email to ${result.email}`, err),
      );

    return result;
  }

  // ── Tenant user creation ───────────────────────────────

  async createTenantUser(dto: CreateTenantUserDto, tenantId: string) {
    if (dto.role === 'SUPER_ADMIN' || dto.role === 'TENANT_ADMIN') {
      throw new ForbiddenException(
        'Super admins and tenant admins must be created through their dedicated management pages.',
      );
    }

    if (dto.role === 'PATIENT' || dto.role === 'SYSTEM') {
      throw new ForbiddenException(
        'Patients must be created through the patient management module.',
      );
    }

    await this.limits.enforceUserLimit(tenantId);

    if (dto.role === 'ADMIN') {
      await this.limits.enforceAdminLimit(tenantId);
    }

    const existing = await this.findUserByEmail(dto.email);

    if (existing) {
      // If user exists, check if they already have a membership in this tenant
      const existingMembership = await this.prisma.userTenantMembership.findUnique({
        where: { userId_organizationId: { userId: existing.id, organizationId: tenantId } },
      });

      if (existingMembership && existingMembership.status === 'ACTIVE') {
        throw new ConflictException('This user is already a member of this organization.');
      }

      // Reactivate or create membership for existing user
      if (existingMembership) {
        await this.prisma.userTenantMembership.update({
          where: { id: existingMembership.id },
          data: { status: 'ACTIVE', role: dto.role, leftAt: null, joinedAt: new Date() },
        });
      } else {
        await this.prisma.userTenantMembership.create({
          data: {
            userId: existing.id,
            organizationId: tenantId,
            role: dto.role,
            status: 'ACTIVE',
          },
        });
      }

      return this.prisma.user.findUnique({
        where: { id: existing.id },
        select: USER_SELECT,
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role, // Dual-write: keep for backwards compat
          tenantId, // Dual-write: keep for backwards compat
          mustChangePassword: true,
        },
        select: USER_SELECT,
      });

      await tx.userTenantMembership.create({
        data: {
          userId: created.id,
          organizationId: tenantId,
          role: dto.role,
          status: 'ACTIVE',
        },
      });

      return created;
    });

    // Send invitation email with temp password (mandatory, bypasses preferences)
    const org = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const { html, text } = renderInvitationEmail({
      firstName: dto.firstName,
      orgName: org?.name ?? 'your organisation',
      tempPassword: dto.password,
      loginUrl: 'https://app.clinvara.com/login',
    });
    this.emailService
      .sendEmail({
        to: dto.email,
        subject: "You've been invited to Clinvara",
        htmlBody: html,
        textBody: text,
      })
      .catch((err) => this.logger.warn(`Failed to send invitation email to ${dto.email}`, err));

    return user;
  }

  // ── Password management ───────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found. They may have been deactivated or removed.');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException(
        'The current password you entered is incorrect. Please try again.',
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Your new password must be different from your current password.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return { message: 'Password changed successfully' };
  }

  // ── Super Admin management ──────────────────────────────

  async findAllSuperAdmins(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = { role: 'SUPER_ADMIN' };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  async createSuperAdmin(dto: CreateSuperAdminDto) {
    const existing = await this.findUserByEmail(dto.email);

    if (existing) {
      throw new ConflictException(
        'This email address is already in use. Please use a different email.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'SUPER_ADMIN',
        tenantId: null,
      },
      select: USER_SELECT,
    });
  }

  async deactivateSuperAdmin(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException(
        'You cannot deactivate your own account. Ask another administrator to do this.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id, role: 'SUPER_ADMIN' },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(
        'Super admin not found. They may have been deactivated or removed.',
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }

  async reactivateSuperAdmin(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'SUPER_ADMIN' },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(
        'Super admin not found. They may have been deactivated or removed.',
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: USER_SELECT,
    });
  }

  // ── Tenant Admin management ──────────────────────────────

  async findAllTenantAdmins(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = { role: 'TENANT_ADMIN' };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  async createTenantAdmin(dto: CreateTenantAdminDto) {
    const existing = await this.findUserByEmail(dto.email);

    if (existing) {
      throw new ConflictException(
        'This email address is already in use. Please use a different email.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'TENANT_ADMIN',
        tenantId: null,
      },
      select: USER_SELECT,
    });
  }

  async deactivateTenantAdmin(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException(
        'You cannot deactivate your own account. Ask another administrator to do this.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id, role: 'TENANT_ADMIN' },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(
        'Tenant admin not found. They may have been deactivated or removed.',
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }

  async reactivateTenantAdmin(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'TENANT_ADMIN' },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(
        'Tenant admin not found. They may have been deactivated or removed.',
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: USER_SELECT,
    });
  }

  // ── Private helpers ──────────────────────────────────────

  private async findUserByEmail(email: string) {
    if (this.encryption.isEnabled()) {
      const emailHash = this.blindIndex.computeGlobalBlindIndex(email, 'email');
      return this.prisma.user.findFirst({ where: { emailIndex: emailHash } });
    }
    return this.prisma.user.findUnique({ where: { email } });
  }
}
