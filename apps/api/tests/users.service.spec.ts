import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../src/modules/users/users.service';

// Mock bcryptjs (default import)
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('hashed-password') },
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    userTenantMembership: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      userTenantMembership: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };

    const limits = {
      enforceUserLimit: jest.fn(),
      enforcePatientLimit: jest.fn(),
    };
    const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
    const blindIndex = {
      computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'global-hash'),
    };
    service = new UsersService(
      prisma as any,
      limits as any,
      encryption as any,
      blindIndex as any,
      { sendEmail: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  // ── Tenant-scoped methods ───────────────────────────────

  describe('findAll', () => {
    it('returns paginated users filtered by tenant via membership', async () => {
      const memberships = [
        { role: 'ADMIN', user: { id: 'u1', email: 'a@test.com' } },
        { role: 'CARER', user: { id: 'u2', email: 'b@test.com' } },
      ];
      prisma.userTenantMembership.findMany.mockResolvedValue(memberships);
      prisma.userTenantMembership.count.mockResolvedValue(2);

      const result = await service.findAll('tenant-1', 1, 20);

      expect(prisma.userTenantMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'tenant-1', status: 'ACTIVE' },
        }),
      );
      expect(result).toEqual({
        data: [
          { id: 'u1', email: 'a@test.com', role: 'ADMIN' },
          { id: 'u2', email: 'b@test.com', role: 'CARER' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('returns all users when tenantId is null', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll(null);

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(prisma.userTenantMembership.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a user by id and tenant via membership', async () => {
      const membership = {
        role: 'ADMIN',
        user: { id: 'u1', email: 'test@test.com' },
      };
      prisma.userTenantMembership.findFirst.mockResolvedValue(membership);

      const result = await service.findOne('u1', 'tenant-1');

      expect(prisma.userTenantMembership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', organizationId: 'tenant-1', status: 'ACTIVE' },
        }),
      );
      expect(result).toEqual({ id: 'u1', email: 'test@test.com', role: 'ADMIN' });
    });

    it('throws NotFoundException when membership not found', async () => {
      prisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect(service.findOne('u1', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('returns user directly when tenantId is null', async () => {
      const user = { id: 'u1', email: 'test@test.com' };
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await service.findOne('u1', null);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
      expect(result).toEqual(user);
    });
  });

  // ── Super Admin methods ─────────────────────────────────

  describe('findAllSuperAdmins', () => {
    it('returns paginated super admins', async () => {
      const admins = [{ id: 'sa1', role: 'SUPER_ADMIN' }];
      prisma.user.findMany.mockResolvedValue(admins);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAllSuperAdmins(1, 20);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'SUPER_ADMIN' } }),
      );
      expect(result).toEqual({ data: admins, total: 1, page: 1, limit: 20 });
    });

    it('uses custom pagination', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAllSuperAdmins(3, 10);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('createSuperAdmin', () => {
    const dto = {
      email: 'new-admin@test.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'Admin',
    };

    it('creates a super admin user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'sa-new', ...dto, role: 'SUPER_ADMIN' });

      const result = await service.createSuperAdmin(dto);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            passwordHash: 'hashed-password',
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: 'SUPER_ADMIN',
            tenantId: null,
          }),
        }),
      );
      expect(result.role).toBe('SUPER_ADMIN');
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createSuperAdmin(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('deactivateSuperAdmin', () => {
    it('deactivates a super admin', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN', isActive: true });
      prisma.user.update.mockResolvedValue({ id: 'sa1', isActive: false });

      const result = await service.deactivateSuperAdmin('sa1', 'sa-current');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sa1' },
          data: { isActive: false },
        }),
      );
      expect(result.isActive).toBe(false);
    });

    it('throws ForbiddenException when deactivating own account', async () => {
      await expect(service.deactivateSuperAdmin('sa1', 'sa1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when super admin not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.deactivateSuperAdmin('nonexistent', 'sa-current')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSuperAdmin (encrypted)', () => {
    it('should use global blind index for email uniqueness check', async () => {
      const encEnabled = { isEnabled: jest.fn().mockReturnValue(true) };
      const blindIdx = {
        computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'email-hash'),
      };
      const encService = new UsersService(
        prisma as any,
        { enforceUserLimit: jest.fn() } as any,
        encEnabled as any,
        blindIdx as any,
        { sendEmail: jest.fn().mockResolvedValue(undefined) } as any,
      );

      (prisma.user as any).findFirst = jest.fn().mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'sa-new',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN',
      });

      await encService.createSuperAdmin({
        email: 'admin@test.com',
        password: 'Pass123!',
        firstName: 'New',
        lastName: 'Admin',
      } as any);

      expect(blindIdx.computeGlobalBlindIndex).toHaveBeenCalledWith('admin@test.com', 'email');
      expect((prisma.user as any).findFirst).toHaveBeenCalledWith({
        where: { emailIndex: 'email-hash' },
      });
    });
  });

  // ── Email notifications ─────────────────────────────────

  describe('invitation email', () => {
    it('should send invitation email after creating a tenant user', async () => {
      const emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
      const mockCreatedUser = {
        id: 'new-user',
        email: 'invited@test.com',
        firstName: 'New',
        lastName: 'User',
        role: 'NURSE',
        isActive: true,
        mustChangePassword: true,
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const txPrisma = {
        ...prisma,
        organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Test Org' }) },
        $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) => {
          const tx = {
            user: { create: jest.fn().mockResolvedValue(mockCreatedUser) },
            userTenantMembership: { create: jest.fn().mockResolvedValue({}) },
          };
          return cb(tx);
        }),
      };

      const limits = { enforceUserLimit: jest.fn() };
      const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
      const blindIndex = {
        computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'global-hash'),
      };
      const svc = new UsersService(
        txPrisma as any,
        limits as any,
        encryption as any,
        blindIndex as any,
        emailService as any,
      );

      await svc.createTenantUser(
        {
          email: 'invited@test.com',
          password: 'TempPass123!',
          firstName: 'New',
          lastName: 'User',
          role: 'NURSE',
        } as any,
        'tenant-1',
      );

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invited@test.com',
          subject: expect.stringContaining('invited to Clinvara'),
          htmlBody: expect.stringContaining('TempPass123!'),
          textBody: expect.stringContaining('TempPass123!'),
        }),
      );
    });

    it('should not fail user creation if invitation email fails', async () => {
      const emailService = { sendEmail: jest.fn().mockRejectedValue(new Error('SES down')) };
      const mockCreatedUser = {
        id: 'new-user',
        email: 'invited@test.com',
        firstName: 'New',
        lastName: 'User',
        role: 'NURSE',
        isActive: true,
        mustChangePassword: true,
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const txPrisma = {
        ...prisma,
        organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Test Org' }) },
        $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) => {
          const tx = {
            user: { create: jest.fn().mockResolvedValue(mockCreatedUser) },
            userTenantMembership: { create: jest.fn().mockResolvedValue({}) },
          };
          return cb(tx);
        }),
      };

      const limits = { enforceUserLimit: jest.fn() };
      const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
      const blindIndex = {
        computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'global-hash'),
      };
      const svc = new UsersService(
        txPrisma as any,
        limits as any,
        encryption as any,
        blindIndex as any,
        emailService as any,
      );

      const result = await svc.createTenantUser(
        {
          email: 'invited@test.com',
          password: 'TempPass123!',
          firstName: 'New',
          lastName: 'User',
          role: 'NURSE',
        } as any,
        'tenant-1',
      );

      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('deactivation email', () => {
    it('should send deactivation email after removing a tenant user', async () => {
      const emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
      const mockUser = {
        id: 'u1',
        email: 'user@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'NURSE',
        isActive: true,
        mustChangePassword: false,
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const deactivatedUser = { ...mockUser, isActive: false };

      const removePrisma = {
        ...prisma,
        userTenantMembership: {
          ...prisma.userTenantMembership,
          findFirst: jest.fn().mockResolvedValue({ role: 'NURSE', user: mockUser }),
          updateMany: jest.fn().mockResolvedValue({}),
        },
        user: {
          ...prisma.user,
          update: jest.fn().mockResolvedValue(deactivatedUser),
        },
        organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Test Org' }) },
      };

      const limits = { enforceUserLimit: jest.fn() };
      const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
      const blindIndex = {
        computeGlobalBlindIndex: jest.fn((_v: string, _f: string) => 'global-hash'),
      };
      const svc = new UsersService(
        removePrisma as any,
        limits as any,
        encryption as any,
        blindIndex as any,
        emailService as any,
      );

      await svc.remove('u1', 'tenant-1');

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Account Deactivated',
          htmlBody: expect.stringContaining('deactivated'),
          textBody: expect.stringContaining('deactivated'),
        }),
      );
    });
  });

  describe('reactivateSuperAdmin', () => {
    it('reactivates a super admin', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN', isActive: false });
      prisma.user.update.mockResolvedValue({ id: 'sa1', isActive: true });

      const result = await service.reactivateSuperAdmin('sa1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sa1' },
          data: { isActive: true },
        }),
      );
      expect(result.isActive).toBe(true);
    });

    it('throws NotFoundException when super admin not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.reactivateSuperAdmin('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
