// In-memory AsyncStorage + a mocked api-client so we can exercise the queue's
// real logic (enqueue, flush, quarantine) without native modules or network.

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(mockStore[k] ?? null),
    setItem: (k: string, v: string) => {
      mockStore[k] = v;
      return Promise.resolve();
    },
    removeItem: (k: string) => {
      delete mockStore[k];
      return Promise.resolve();
    },
  },
}));

const mockPost = jest.fn();
jest.mock('../src/lib/api-client', () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { api: { post: (...args: unknown[]) => mockPost(...args) }, ApiError };
});

import {
  enqueue,
  flush,
  getPending,
  getFailed,
  uuidv4,
  type QueuedClockEvent,
} from '../src/features/clock/offline-queue';
import { ApiError } from '../src/lib/api-client';

function makeEvent(over: Partial<QueuedClockEvent> = {}): QueuedClockEvent {
  return {
    clientEventId: uuidv4(),
    kind: 'in',
    shiftAssignmentId: 'a1',
    capturedAt: '2026-06-05T06:00:00.000Z',
    latitude: 51.5,
    longitude: -0.1,
    ...over,
  };
}

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  mockPost.mockReset();
});

describe('uuidv4', () => {
  it('produces an RFC-4122 v4 string', () => {
    expect(uuidv4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(uuidv4()).not.toBe(uuidv4());
  });
});

describe('enqueue', () => {
  it('adds the event to the pending queue', async () => {
    await enqueue(makeEvent());
    expect(await getPending()).toHaveLength(1);
  });
});

describe('flush', () => {
  it('posts a clock-in to /clock-in and clears it on success', async () => {
    mockPost.mockResolvedValue({ id: 'rec-1' });
    await enqueue(makeEvent({ clientEventId: 'evt-1' }));

    const result = await flush();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][0]).toBe('/clock-in');
    expect(mockPost.mock.calls[0][1]).toMatchObject({
      shiftAssignmentId: 'a1',
      clientEventId: 'evt-1',
      capturedAt: '2026-06-05T06:00:00.000Z',
      latitude: 51.5,
      longitude: -0.1,
    });
    expect(result).toMatchObject({ synced: 1, remaining: 0, failed: 0 });
    expect(await getPending()).toHaveLength(0);
  });

  it('routes clock-out events to /clock-out', async () => {
    mockPost.mockResolvedValue({});
    await enqueue(makeEvent({ kind: 'out', notes: 'done' }));

    await flush();

    expect(mockPost.mock.calls[0][0]).toBe('/clock-out');
    expect(mockPost.mock.calls[0][1]).toMatchObject({ notes: 'done' });
  });

  it('quarantines an event the server rejects (ApiError) to the failed list', async () => {
    mockPost.mockRejectedValue(new ApiError('Too early to clock in.', 400));
    await enqueue(makeEvent());

    const result = await flush();

    expect(result).toMatchObject({ synced: 0, remaining: 0, failed: 1 });
    expect(await getPending()).toHaveLength(0);
    const failed = await getFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0].error).toBe('Too early to clock in.');
  });

  it('keeps events pending on a network error and stops (preserves order)', async () => {
    mockPost.mockRejectedValue(new Error('Network request failed'));
    await enqueue(makeEvent({ clientEventId: 'e1' }));
    await enqueue(makeEvent({ clientEventId: 'e2' }));

    const result = await flush();

    expect(result).toMatchObject({ synced: 0, remaining: 2 });
    expect(await getPending()).toHaveLength(2);
    expect(await getFailed()).toHaveLength(0);
  });

  it('syncs a previously network-failed event once connectivity returns', async () => {
    mockPost.mockRejectedValueOnce(new Error('offline'));
    await enqueue(makeEvent({ clientEventId: 'retry-1' }));
    await flush(); // fails (network), stays pending
    expect(await getPending()).toHaveLength(1);

    mockPost.mockResolvedValue({ id: 'rec' });
    const result = await flush(); // succeeds now

    expect(result).toMatchObject({ synced: 1, remaining: 0 });
    expect(await getPending()).toHaveLength(0);
  });
});
