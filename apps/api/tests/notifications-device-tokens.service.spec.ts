import { NotificationsService } from '../src/modules/notifications/notifications.service';

// Covers device-token registration/unregistration and that PUSH dispatch is
// gated by user preference.

function createMockPrisma() {
  return {
    deviceToken: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    notification: { create: jest.fn() },
    notificationPreference: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
}

describe('NotificationsService device tokens', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const events = { emitNotification: jest.fn() };
  const email = { sendEmail: jest.fn() };
  const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn() };

  beforeEach(() => {
    prisma = createMockPrisma();
    jest.clearAllMocks();
    service = new NotificationsService(
      prisma as any,
      events as any,
      email as any,
      push as any,
      config as any,
    );
  });

  describe('registerDeviceToken', () => {
    it('upserts by token and reassigns the device to the current user', async () => {
      prisma.deviceToken.upsert.mockResolvedValue({ id: 'd1' });

      await service.registerDeviceToken('user-1', 'tenant-1', 'ExponentPushToken[x]', 'IOS' as any);

      const arg = prisma.deviceToken.upsert.mock.calls[0][0];
      expect(arg.where).toEqual({ token: 'ExponentPushToken[x]' });
      expect(arg.create).toMatchObject({
        token: 'ExponentPushToken[x]',
        userId: 'user-1',
        tenantId: 'tenant-1',
        platform: 'IOS',
      });
      expect(arg.update).toMatchObject({ userId: 'user-1', tenantId: 'tenant-1' });
    });
  });

  describe('unregisterDeviceToken', () => {
    it('deletes only the caller’s matching token', async () => {
      prisma.deviceToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unregisterDeviceToken('user-1', 'ExponentPushToken[x]');

      expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'ExponentPushToken[x]', userId: 'user-1' },
      });
      expect(result).toEqual({ count: 1 });
    });
  });

  describe('notify push dispatch', () => {
    it('sends a push when the PUSH preference is enabled', async () => {
      // IN_APP + EMAIL + PUSH all default to enabled (no preference rows).
      prisma.notificationPreference.findUnique.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      prisma.user.findUnique.mockResolvedValue({ email: null, firstName: 'Sam' });

      await service.notify({
        userId: 'user-1',
        tenantId: 'tenant-1',
        type: 'SHIFT_SWAP_APPROVED' as any,
        title: 'Swap approved',
        message: 'Your swap was approved',
        link: '/app/workforce/swaps',
      });

      expect(push.sendToUser).toHaveBeenCalledWith('user-1', {
        title: 'Swap approved',
        body: 'Your swap was approved',
        data: { type: 'SHIFT_SWAP_APPROVED', link: '/app/workforce/swaps' },
      });
    });

    it('does not send a push when the PUSH preference is disabled', async () => {
      prisma.notificationPreference.findUnique.mockImplementation(({ where }: any) => {
        const channel = where.userId_eventType_channel.channel;
        return Promise.resolve(channel === 'PUSH' ? { enabled: false } : { enabled: true });
      });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      prisma.user.findUnique.mockResolvedValue({ email: null, firstName: 'Sam' });

      await service.notify({
        userId: 'user-1',
        tenantId: 'tenant-1',
        type: 'SHIFT_SWAP_APPROVED' as any,
        title: 'Swap approved',
        message: 'Your swap was approved',
      });

      expect(push.sendToUser).not.toHaveBeenCalled();
    });
  });
});
