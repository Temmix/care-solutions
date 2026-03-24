import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiKeyGuard } from '../src/modules/iot/guards/api-key.guard';

// ── Helpers ──────────────────────────────────────────────

const RAW_KEY = 'cvk_abc123def456';
const KEY_HASH = createHash('sha256').update(RAW_KEY).digest('hex');

function makePrisma() {
  return {
    iotApiKey: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
  };
}

function makeContext(headers: Record<string, string> = {}) {
  const request: Record<string, unknown> = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    request,
  };
}

// ── ApiKeyGuard ─────────────────────────────────────────

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    guard = new ApiKeyGuard(prisma as any);
  });

  it('throws UnauthorizedException when X-API-Key header is missing', async () => {
    const ctx = makeContext({});
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx as any)).rejects.toThrow('Missing X-API-Key header');
  });

  it('throws UnauthorizedException when key is not found in database', async () => {
    prisma.iotApiKey.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ 'x-api-key': RAW_KEY });

    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx as any)).rejects.toThrow('Invalid API key');
  });

  it('looks up key by SHA-256 hash', async () => {
    prisma.iotApiKey.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ 'x-api-key': RAW_KEY });

    await guard.canActivate(ctx as any).catch(() => {});

    expect(prisma.iotApiKey.findUnique).toHaveBeenCalledWith({
      where: { keyHash: KEY_HASH },
    });
  });

  it('throws UnauthorizedException when key is revoked', async () => {
    prisma.iotApiKey.findUnique.mockResolvedValue({
      id: 'k1',
      isActive: false,
      tenantId: 't1',
      deviceId: null,
      expiresAt: null,
    });
    const ctx = makeContext({ 'x-api-key': RAW_KEY });

    await expect(guard.canActivate(ctx as any)).rejects.toThrow('API key has been revoked');
  });

  it('throws UnauthorizedException when key is expired', async () => {
    prisma.iotApiKey.findUnique.mockResolvedValue({
      id: 'k1',
      isActive: true,
      tenantId: 't1',
      deviceId: null,
      expiresAt: new Date('2020-01-01'),
    });
    const ctx = makeContext({ 'x-api-key': RAW_KEY });

    await expect(guard.canActivate(ctx as any)).rejects.toThrow('API key has expired');
  });

  it('returns true and attaches context to request for valid key', async () => {
    prisma.iotApiKey.findUnique.mockResolvedValue({
      id: 'k1',
      isActive: true,
      tenantId: 't1',
      deviceId: 'd1',
      expiresAt: null,
    });
    const ctx = makeContext({ 'x-api-key': RAW_KEY });

    const result = await guard.canActivate(ctx as any);

    expect(result).toBe(true);
    expect(ctx.request.tenantId).toBe('t1');
    expect(ctx.request.apiKeyId).toBe('k1');
    expect(ctx.request.apiKeyDeviceId).toBe('d1');
  });

  it('allows non-expired key with future expiry', async () => {
    const futureDate = new Date(Date.now() + 86_400_000); // tomorrow
    prisma.iotApiKey.findUnique.mockResolvedValue({
      id: 'k1',
      isActive: true,
      tenantId: 't1',
      deviceId: null,
      expiresAt: futureDate,
    });
    const ctx = makeContext({ 'x-api-key': RAW_KEY });

    const result = await guard.canActivate(ctx as any);
    expect(result).toBe(true);
  });

  it('fire-and-forget updates lastUsedAt', async () => {
    prisma.iotApiKey.findUnique.mockResolvedValue({
      id: 'k1',
      isActive: true,
      tenantId: 't1',
      deviceId: null,
      expiresAt: null,
    });
    const ctx = makeContext({ 'x-api-key': RAW_KEY });

    await guard.canActivate(ctx as any);

    expect(prisma.iotApiKey.update).toHaveBeenCalledWith({
      where: { id: 'k1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
