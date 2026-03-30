import { Injectable, Inject, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { BlindIndexService } from '../encryption/blind-index.service';
import { RegisterDto, LoginDto } from './dto';
import { PLAN_LIMITS, TRIAL_DURATION_DAYS, TRIAL_TIER } from '../billing/plan-limits';
import { EmailService } from '../notifications/email.service';
import { renderWelcomeEmail } from '../notifications/email-templates';

const MEMBERSHIP_SELECT = {
  organizationId: true,
  role: true,
  organization: {
    select: { id: true, name: true, type: true },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(EncryptionService) private encryption: EncryptionService,
    @Inject(BlindIndexService) private blindIndex: BlindIndexService,
    @Inject(EmailService) private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.findUserByEmail(dto.email);

    if (existing) {
      throw new ConflictException(
        'An account with this email already exists. Please log in or use a different email.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // If tenantName is provided, create a new organization and assign user as ADMIN
    if (dto.tenantName) {
      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: dto.tenantName!,
            type: dto.organizationType ?? 'CARE_HOME',
            phone: dto.orgPhone ?? null,
            email: dto.orgEmail ?? null,
            addressLine1: dto.addressLine1 ?? null,
            city: dto.city ?? null,
            postalCode: dto.postalCode ?? null,
            country: dto.country ?? 'GB',
          },
        });

        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: 'ADMIN',
            tenantId: org.id, // Dual-write: keep for backwards compat
          },
        });

        // Create membership record
        await tx.userTenantMembership.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        });

        // Create 60-day Professional trial subscription
        const trialLimits = PLAN_LIMITS[TRIAL_TIER];
        await tx.subscription.create({
          data: {
            organizationId: org.id,
            tier: TRIAL_TIER,
            status: 'TRIALING',
            trialEndsAt: new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000),
            patientLimit: trialLimits.patientLimit,
            userLimit: trialLimits.userLimit,
          },
        });

        return { user, org };
      });

      // Send welcome email (mandatory, bypasses preferences)
      const { html, text } = renderWelcomeEmail({
        firstName: dto.firstName,
        orgName: dto.tenantName!,
        trialDays: TRIAL_DURATION_DAYS,
        loginUrl: 'https://app.clinvara.com/login',
      });
      this.emailService
        .sendEmail({
          to: dto.email,
          subject: 'Welcome to Clinvara!',
          htmlBody: html,
          textBody: text,
        })
        .catch(() => {});

      const tokens = this.generateTokens(result.user.id, result.user.email);
      const memberships = [
        {
          organizationId: result.org.id,
          role: 'ADMIN' as const,
          organization: {
            id: result.org.id,
            name: dto.tenantName!,
            type: dto.organizationType ?? 'CARE_HOME',
          },
        },
      ];
      return { ...tokens, memberships };
    }

    // No tenant provided — create user with default role
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role ?? 'PATIENT',
      },
    });

    const tokens = this.generateTokens(user.id, user.email);
    return { ...tokens, memberships: [] };
  }

  async login(dto: LoginDto) {
    const user = await this.findUserByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Incorrect email or password. Please check your details and try again.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException(
        'Incorrect email or password. Please check your details and try again.',
      );
    }

    const tokens = this.generateTokens(user.id, user.email);

    const memberships = await this.prisma.userTenantMembership.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      select: MEMBERSHIP_SELECT,
      orderBy: { joinedAt: 'desc' },
    });

    return { ...tokens, mustChangePassword: user.mustChangePassword, memberships };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Your session has expired. Please log in again.');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        memberships: {
          where: { status: 'ACTIVE' },
          select: MEMBERSHIP_SELECT,
          orderBy: { joinedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  private async findUserByEmail(email: string) {
    if (this.encryption.isEnabled()) {
      const emailHash = this.blindIndex.computeGlobalBlindIndex(email, 'email');
      return this.prisma.user.findFirst({ where: { emailIndex: emailHash } });
    }
    return this.prisma.user.findUnique({ where: { email } });
  }

  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d'),
    });

    return { accessToken, refreshToken };
  }
}
