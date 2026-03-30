import { ConflictException, UnauthorizedException } from '@nestjs/common';

const mockHash = jest.fn();
const mockCompare = jest.fn();

jest.mock('bcryptjs', () => {
  return {
    __esModule: true,
    default: {
      get hash() {
        return mockHash;
      },
      get compare() {
        return mockCompare;
      },
    },
  };
});

import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    organization: { create: jest.Mock };
    userTenantMembership: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { getOrThrow: jest.Mock; get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      organization: {
        create: jest.fn(),
      },
      userTenantMembership: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    configService = {
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
      get: jest.fn().mockReturnValue('15m'),
    };

    const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
    const blindIndex = {
      computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'global-hash'),
    };
    service = new AuthService(
      prisma as any,
      jwtService as any,
      configService as any,
      encryption as any,
      blindIndex as any,
      { sendEmail: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  describe('register', () => {
    const baseDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should throw ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(baseDto as any)).rejects.toThrow(ConflictException);
      await expect(service.register(baseDto as any)).rejects.toThrow(
        'An account with this email already exists',
      );
    });

    it('should register user without tenant and return memberships', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: baseDto.email,
        role: 'PATIENT',
        tenantId: null,
      });

      const result = await service.register(baseDto as any);

      expect(mockHash).toHaveBeenCalledWith('password123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: baseDto.email,
          passwordHash: 'hashed-password',
          firstName: 'John',
          lastName: 'Doe',
          role: 'PATIENT',
        }),
      });
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        memberships: [],
      });
    });

    it('should register user with tenant via transaction and return membership', async () => {
      const dtoWithTenant = { ...baseDto, tenantName: 'My Org' };
      prisma.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed-password');

      const mockOrg = { id: 'org-1', name: 'My Org' };
      const mockUser = { id: 'user-1', email: baseDto.email, role: 'ADMIN' };

      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(mockOrg) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          userTenantMembership: { create: jest.fn().mockResolvedValue({}) },
          subscription: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.register(dtoWithTenant as any);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        memberships: [
          {
            organizationId: 'org-1',
            role: 'ADMIN',
            organization: { id: 'org-1', name: 'My Org', type: 'CARE_HOME' },
          },
        ],
      });
    });

    it('should use provided role when no tenantName', async () => {
      const dtoWithRole = { ...baseDto, role: 'CLINICIAN' };
      prisma.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: baseDto.email,
        role: 'CLINICIAN',
        tenantId: null,
      });

      await service.register(dtoWithRole as any);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: 'CLINICIAN' }),
      });
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should return tokens and memberships on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: 'hashed',
        role: 'CLINICIAN',
        tenantId: 'tenant-1',
        isActive: true,
        mustChangePassword: false,
      });
      mockCompare.mockResolvedValue(true);
      prisma.userTenantMembership.findMany.mockResolvedValue([
        {
          organizationId: 'tenant-1',
          role: 'CLINICIAN',
          organization: { id: 'tenant-1', name: 'Test Org', type: 'CARE_HOME' },
        },
      ]);

      const result = await service.login(loginDto as any);

      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        mustChangePassword: false,
        memberships: [
          {
            organizationId: 'tenant-1',
            role: 'CLINICIAN',
            organization: { id: 'tenant-1', name: 'Test Org', type: 'CARE_HOME' },
          },
        ],
      });
      expect(mockCompare).toHaveBeenCalledWith('password123', 'hashed');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: 'hashed',
        isActive: true,
      });
      mockCompare.mockResolvedValue(false);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: 'hashed',
        isActive: false,
      });

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens on valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'CLINICIAN',
        tenantId: 'tenant-1',
        isActive: true,
      });

      const result = await service.refresh('valid-refresh-token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'jwt-secret',
      });
      expect(result).toEqual({ accessToken: 'mock-token', refreshToken: 'mock-token' });
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('bad-token')).rejects.toThrow('Your session has expired');
    });

    it('should throw UnauthorizedException when user from token is inactive', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: false,
      });

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login (encrypted)', () => {
    it('should use global blind index for email lookup when encryption enabled', async () => {
      const encryptionEnabled = { isEnabled: jest.fn().mockReturnValue(true) };
      const blindIdx = {
        computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'email-hash-123'),
      };
      const encService = new AuthService(
        prisma as any,
        jwtService as any,
        configService as any,
        encryptionEnabled as any,
        blindIdx as any,
        { sendEmail: jest.fn().mockResolvedValue(undefined) } as any,
      );

      prisma.user.findUnique.mockResolvedValue(null); // findUnique should NOT be called for email
      (prisma as any).user.findFirst = jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        isActive: true,
        mustChangePassword: false,
      });
      mockCompare.mockResolvedValue(true);
      prisma.userTenantMembership.findMany.mockResolvedValue([]);

      await encService.login({ email: 'test@example.com', password: 'pass' } as any);

      expect(blindIdx.computeGlobalBlindIndex).toHaveBeenCalledWith('test@example.com', 'email');
      expect((prisma as any).user.findFirst).toHaveBeenCalledWith({
        where: { emailIndex: 'email-hash-123' },
      });
    });
  });

  describe('welcome email', () => {
    const dtoWithTenant = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      tenantName: 'My Org',
    };

    it('should send welcome email after org registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed-password');

      const mockOrg = { id: 'org-1', name: 'My Org' };
      const mockUser = { id: 'user-1', email: dtoWithTenant.email, role: 'ADMIN' };
      const emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };

      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(mockOrg) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          userTenantMembership: { create: jest.fn().mockResolvedValue({}) },
          subscription: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
      const blindIndex = {
        computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'global-hash'),
      };
      const svc = new AuthService(
        prisma as any,
        jwtService as any,
        configService as any,
        encryption as any,
        blindIndex as any,
        emailService as any,
      );

      await svc.register(dtoWithTenant as any);

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: dtoWithTenant.email,
          subject: 'Welcome to Clinvara!',
          htmlBody: expect.stringContaining('Welcome to Clinvara'),
          textBody: expect.stringContaining('Welcome to Clinvara'),
        }),
      );
    });

    it('should not send welcome email for registration without tenant', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'PATIENT',
        tenantId: null,
      });

      const emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
      const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
      const blindIndex = {
        computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'global-hash'),
      };
      const svc = new AuthService(
        prisma as any,
        jwtService as any,
        configService as any,
        encryption as any,
        blindIndex as any,
        emailService as any,
      );

      await svc.register({
        email: 'test@example.com',
        password: 'pass123',
        firstName: 'Jane',
        lastName: 'Doe',
      } as any);

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not fail registration if welcome email fails', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed-password');

      const mockOrg = { id: 'org-1', name: 'My Org' };
      const mockUser = { id: 'user-1', email: dtoWithTenant.email, role: 'ADMIN' };
      const emailService = { sendEmail: jest.fn().mockRejectedValue(new Error('SES down')) };

      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(mockOrg) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          userTenantMembership: { create: jest.fn().mockResolvedValue({}) },
          subscription: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
      const blindIndex = {
        computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'global-hash'),
      };
      const svc = new AuthService(
        prisma as any,
        jwtService as any,
        configService as any,
        encryption as any,
        blindIndex as any,
        emailService as any,
      );

      const result = await svc.register(dtoWithTenant as any);

      expect(result.accessToken).toBe('mock-token');
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile with memberships', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLINICIAN',
        isActive: true,
        createdAt: new Date(),
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', name: 'Org', type: 'CARE_HOME' },
        memberships: [],
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          tenant: expect.any(Object),
          memberships: expect.any(Object),
        }),
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
