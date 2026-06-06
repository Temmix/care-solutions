import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError } from '../../lib/api-client';
import type { ClockRecord } from '../../types';

/**
 * Durable offline queue for clock events. Care workers frequently clock in/out
 * in buildings with poor signal, so every clock action is captured locally with
 * its true timestamp + GPS and synced when connectivity returns. The server
 * dedupes on `clientEventId`, so retries are safe.
 */

const PENDING_KEY = 'clock_queue_pending_v1';
const FAILED_KEY = 'clock_queue_failed_v1';

export type ClockKind = 'in' | 'out';

export interface QueuedClockEvent {
  clientEventId: string;
  kind: ClockKind;
  shiftAssignmentId: string;
  capturedAt: string; // ISO
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface FailedClockEvent extends QueuedClockEvent {
  error: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  listeners.forEach((l) => l());
}

/** RFC-4122 v4 string (Math.random is fine — these are idempotency keys). */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function read<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function write<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function getPending(): Promise<QueuedClockEvent[]> {
  return read<QueuedClockEvent>(PENDING_KEY);
}

export async function getFailed(): Promise<FailedClockEvent[]> {
  return read<FailedClockEvent>(FAILED_KEY);
}

export async function clearFailed(): Promise<void> {
  await write(FAILED_KEY, []);
  emit();
}

/** Add an event to the queue and immediately attempt to flush it. */
export async function enqueue(event: QueuedClockEvent): Promise<void> {
  const pending = await getPending();
  pending.push(event);
  await write(PENDING_KEY, pending);
  emit();
}

const ENDPOINT: Record<ClockKind, string> = { in: '/clock-in', out: '/clock-out' };

function toPayload(event: QueuedClockEvent): Record<string, unknown> {
  const base: Record<string, unknown> = {
    shiftAssignmentId: event.shiftAssignmentId,
    clientEventId: event.clientEventId,
    capturedAt: event.capturedAt,
  };
  if (event.kind === 'in') {
    base.latitude = event.latitude;
    base.longitude = event.longitude;
  } else {
    if (event.latitude != null) base.latitude = event.latitude;
    if (event.longitude != null) base.longitude = event.longitude;
    if (event.notes) base.notes = event.notes;
  }
  return base;
}

export interface FlushResult {
  synced: number;
  remaining: number;
  failed: number;
}

let flushing = false;

/**
 * Attempt to send every pending event in order. A definitive server rejection
 * (e.g. geofence/time-window failure, surfaced as an ApiError with a status)
 * moves the event to the failed list so it stops blocking the queue and the
 * worker can be told. A bare network failure leaves it pending for next time.
 */
export async function flush(): Promise<FlushResult> {
  if (flushing) return summarise();
  flushing = true;
  try {
    let pending = await getPending();
    const failed = await getFailed();
    let synced = 0;

    for (const event of [...pending]) {
      try {
        await api.post<ClockRecord>(ENDPOINT[event.kind], toPayload(event));
        pending = pending.filter((e) => e.clientEventId !== event.clientEventId);
        await write(PENDING_KEY, pending);
        synced += 1;
        emit();
      } catch (err) {
        if (err instanceof ApiError) {
          // Server said no (and will keep saying no) — quarantine it.
          pending = pending.filter((e) => e.clientEventId !== event.clientEventId);
          failed.push({ ...event, error: err.message });
          await write(PENDING_KEY, pending);
          await write(FAILED_KEY, failed);
          emit();
        } else {
          // Offline / transient — stop and retry later, preserving order.
          break;
        }
      }
    }

    return { synced, remaining: pending.length, failed: failed.length };
  } finally {
    flushing = false;
  }
}

async function summarise(): Promise<FlushResult> {
  const [pending, failed] = await Promise.all([getPending(), getFailed()]);
  return { synced: 0, remaining: pending.length, failed: failed.length };
}
