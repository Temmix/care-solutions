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
    };

    service = new UsersService(prisma as any);
  });

  // ── Tenant-scoped methods ───────────────────────────────

  describe('findAll', () => {
    it('returns paginated users filtered by tenant', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(2);

      const result = await service.findAll('tenant-1', 1, 20);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
      expect(result).toEqual({ data: users, total: 2, page: 1, limit: 20 });
    });

    it('returns all users when tenantId is null', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll(null);

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  describe('findOne', () => {
    it('returns a user by id and tenant', async () => {
      const user = { id: 'u1', email: 'test@test.com' };
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await service.findOne('u1', 'tenant-1');

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1', tenantId: 'tenant-1' } }),
      );
      expect(result).toEqual(user);
    });

    it('throws NotFoundException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('u1', 'tenant-1')).rejects.toThrow(NotFoundException);
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
