import { PushService } from '../src/modules/notifications/push.service';

// Verifies the Expo push fan-out and dead-token pruning.

function createMockPrisma() {
  return {
    deviceToken: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

const config = { get: jest.fn().mockReturnValue(undefined) };

describe('PushService', () => {
  let service: PushService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new PushService(prisma as any, config as any);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('does nothing when the user has no registered devices', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([]);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    await service.sendToUser('user-1', { title: 'Hi', body: 'There' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends one Expo message per device token', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([
      { token: 'ExponentPushToken[a]' },
      { token: 'ExponentPushToken[b]' },
    ]);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }, { status: 'ok' }] }),
    });
    global.fetch = fetchMock as any;

    await service.sendToUser('user-1', {
      title: 'Shift assigned',
      body: 'You have a new shift',
      data: { link: '/app/shifts' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({ to: 'ExponentPushToken[a]', title: 'Shift assigned' });
    expect(prisma.deviceToken.deleteMany).not.toHaveBeenCalled();
  });

  it('prunes tokens Expo reports as DeviceNotRegistered', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([{ token: 'good' }, { token: 'dead' }]);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }],
      }),
    });
    global.fetch = fetchMock as any;

    await service.sendToUser('user-1', { title: 'Hi', body: 'There' });

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['dead'] } },
    });
  });

  it('never throws when the Expo request fails', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([{ token: 'good' }]);
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as any;

    await expect(
      service.sendToUser('user-1', { title: 'Hi', body: 'There' }),
    ).resolves.toBeUndefined();
  });
});
