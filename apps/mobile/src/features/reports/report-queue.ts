import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError } from '../../lib/api-client';
import { uuidv4 } from '../clock/offline-queue';
import type { ShiftReport, ShiftReportCategory, ShiftReportPriority } from '../../types';

/**
 * Durable offline queue for shift reports — care workers often write notes with
 * no signal, so reports are captured locally with their write time and synced
 * when connectivity returns. The server dedupes on `clientEventId`.
 */

const PENDING_KEY = 'report_queue_pending_v1';
const FAILED_KEY = 'report_queue_failed_v1';

export interface QueuedReport {
  clientEventId: string;
  shiftAssignmentId: string;
  patientId: string;
  category: ShiftReportCategory;
  priority: ShiftReportPriority;
  content: string;
  capturedAt: string; // ISO
}

export interface FailedReport extends QueuedReport {
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

export { uuidv4 };

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

export async function getPending(): Promise<QueuedReport[]> {
  return read<QueuedReport>(PENDING_KEY);
}

export async function getFailed(): Promise<FailedReport[]> {
  return read<FailedReport>(FAILED_KEY);
}

export async function clearFailed(): Promise<void> {
  await write(FAILED_KEY, []);
  emit();
}

export async function enqueue(report: QueuedReport): Promise<void> {
  const pending = await getPending();
  pending.push(report);
  await write(PENDING_KEY, pending);
  emit();
}

let flushing = false;

/** Send pending reports in order. Server rejections (ApiError) are quarantined
 * to the failed list; a bare network failure leaves them pending. */
export async function flush(): Promise<{ synced: number; remaining: number; failed: number }> {
  if (flushing) {
    const [p, f] = await Promise.all([getPending(), getFailed()]);
    return { synced: 0, remaining: p.length, failed: f.length };
  }
  flushing = true;
  try {
    let pending = await getPending();
    const failed = await getFailed();
    let synced = 0;

    for (const report of [...pending]) {
      try {
        await api.post<ShiftReport>('/shift-reports', report);
        pending = pending.filter((r) => r.clientEventId !== report.clientEventId);
        await write(PENDING_KEY, pending);
        synced += 1;
        emit();
      } catch (err) {
        if (err instanceof ApiError) {
          pending = pending.filter((r) => r.clientEventId !== report.clientEventId);
          failed.push({ ...report, error: err.message });
          await write(PENDING_KEY, pending);
          await write(FAILED_KEY, failed);
          emit();
        } else {
          break; // offline — retry later, preserve order
        }
      }
    }

    return { synced, remaining: pending.length, failed: failed.length };
  } finally {
    flushing = false;
  }
}
