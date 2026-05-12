import { LokiTransport } from '@care/logger';

describe('LokiTransport', () => {
  let mockFetch: jest.Mock;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    originalFetch = global.fetch;
    mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  const sampleEntry = (overrides: Record<string, unknown> = {}) => ({
    level: 'info' as const,
    message: 'hello world',
    timestamp: '2026-05-12T20:00:00.000Z',
    service: 'TestService',
    method: 'doThing',
    ...overrides,
  });

  it('batches multiple entries into one HTTP push by streamKey', async () => {
    const t = new LokiTransport({ url: 'http://loki', batchSize: 100, flushIntervalMs: 1000 });
    t.write(sampleEntry());
    t.write(sampleEntry({ message: 'second' }));
    t.write(sampleEntry({ level: 'error', message: 'oops' }));

    await t.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://loki/loki/api/v1/push');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body.streams).toHaveLength(2); // two distinct levels => two streams
    const infoStream = body.streams.find(
      (s: { stream: { level: string } }) => s.stream.level === 'info',
    );
    const errorStream = body.streams.find(
      (s: { stream: { level: string } }) => s.stream.level === 'error',
    );
    expect(infoStream.values).toHaveLength(2);
    expect(errorStream.values).toHaveLength(1);
  });

  it('auto-flushes when batchSize is hit', async () => {
    const t = new LokiTransport({ url: 'http://loki', batchSize: 2, flushIntervalMs: 99_999 });
    t.write(sampleEntry());
    t.write(sampleEntry()); // hits batchSize
    // Microtask for the inner promise to resolve
    await Promise.resolve();
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('auto-flushes after flushIntervalMs', async () => {
    const t = new LokiTransport({ url: 'http://loki', batchSize: 100, flushIntervalMs: 500 });
    t.write(sampleEntry());
    expect(mockFetch).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    // Pump microtask queue
    await Promise.resolve();
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('drops batch silently when Loki returns an error (no throw to caller)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));
    const t = new LokiTransport({ url: 'http://loki' });
    t.write(sampleEntry());
    // flush MUST resolve, never reject
    await expect(t.flush()).resolves.toBeUndefined();
  });

  it('drops batch silently on timeout', async () => {
    // Mock that respects the AbortSignal (mirrors real fetch behaviour).
    mockFetch.mockImplementationOnce(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('AbortError: aborted')));
        }),
    );
    const t = new LokiTransport({ url: 'http://loki', timeoutMs: 100 });
    t.write(sampleEntry());
    const flushed = t.flush();
    jest.advanceTimersByTime(100);
    await expect(flushed).resolves.toBeUndefined();
  });

  it('write() after close() is a no-op', async () => {
    const t = new LokiTransport({ url: 'http://loki', flushIntervalMs: 100 });
    await t.close();
    t.write(sampleEntry());
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('attaches static labels to every stream', async () => {
    const t = new LokiTransport({
      url: 'http://loki',
      labels: { app: 'clinvara-api', env: 'production' },
    });
    t.write(sampleEntry());
    await t.flush();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    // Static labels: app + env. Per-entry: level + service (controller).
    expect(body.streams[0].stream).toMatchObject({
      app: 'clinvara-api',
      env: 'production',
      level: 'info',
      service: 'TestService',
    });
  });

  it('does NOT include userId/tenantId as labels (cardinality safety)', async () => {
    const t = new LokiTransport({ url: 'http://loki' });
    t.write(sampleEntry({ userId: 'user-1', tenantId: 'tenant-1' }));
    await t.flush();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    const labels = body.streams[0].stream;
    expect(labels.userId).toBeUndefined();
    expect(labels.tenantId).toBeUndefined();
    // The userId/tenantId ARE present in the log body (for full-text search)
    expect(body.streams[0].values[0][1]).toContain('user-1');
    expect(body.streams[0].values[0][1]).toContain('tenant-1');
  });

  it('normalises trailing slash on the URL', async () => {
    const t = new LokiTransport({ url: 'http://loki/' });
    t.write(sampleEntry());
    await t.flush();
    expect(mockFetch.mock.calls[0][0]).toBe('http://loki/loki/api/v1/push');
  });
});
