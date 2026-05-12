import type { LogEntry } from '../types';
import type { LogTransport } from './transport.interface';

export interface LokiTransportOptions {
  /** Base URL of the Loki instance, e.g. `http://loki.railway.internal:3100` */
  url: string;
  /** Static labels to attach to every log stream (e.g. service name, env) */
  labels?: Record<string, string>;
  /** Max lines per batch before forced flush (default: 100) */
  batchSize?: number;
  /** Max wait between flushes in ms (default: 1000) */
  flushIntervalMs?: number;
  /** Request timeout in ms (default: 5000) */
  timeoutMs?: number;
}

interface QueueEntry {
  /** Stream key — combined labels as a stable string, used to group entries */
  streamKey: string;
  /** Stream labels */
  labels: Record<string, string>;
  /** Loki entry tuple: [unixNanos, line] */
  entry: [string, string];
}

/**
 * Ships log lines to Grafana Loki via the push API.
 *
 * Key behaviours:
 * - **Batched**: queues entries and flushes every `flushIntervalMs` or when
 *   `batchSize` is reached, whichever comes first. Prevents one HTTP call
 *   per log line.
 * - **Fire-and-forget**: the `write()` method returns synchronously after
 *   enqueueing. Logging is never a blocking operation in the calling code.
 * - **Graceful degradation**: HTTP errors and Loki outages do NOT throw
 *   into the app. They are dropped silently — losing a few log lines is
 *   far better than crashing on every request.
 * - **PII-safe labels**: streams are keyed by `level` and `service` only
 *   (plus any static labels). User/tenant IDs go inside the log BODY where
 *   Loki indexes via full-text search, never as labels (which would
 *   explode cardinality and persist forever).
 */
export class LokiTransport implements LogTransport {
  readonly name = 'loki';

  private readonly url: string;
  private readonly staticLabels: Record<string, string>;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly timeoutMs: number;

  private queue: QueueEntry[] = [];
  private timer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(options: LokiTransportOptions) {
    this.url = options.url.replace(/\/$/, '') + '/loki/api/v1/push';
    this.staticLabels = options.labels ?? {};
    this.batchSize = options.batchSize ?? 100;
    this.flushIntervalMs = options.flushIntervalMs ?? 1000;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  write(entry: LogEntry): void {
    if (this.closed) return;

    const labels: Record<string, string> = {
      ...this.staticLabels,
      level: entry.level,
      service: entry.service,
    };
    const streamKey = JSON.stringify(labels);

    // Loki expects unix nanoseconds as a string
    const ts = String(BigInt(new Date(entry.timestamp).getTime()) * 1_000_000n);
    const line = JSON.stringify(entry);

    this.queue.push({ streamKey, labels, entry: [ts, line] });

    if (this.queue.length >= this.batchSize) {
      void this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => void this.flush(), this.flushIntervalMs);
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  /** Flush the queue. Never throws — drops the batch on error. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) return;

    const drained = this.queue;
    this.queue = [];

    const payload = this.buildPayload(drained);

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        await fetch(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        // Don't even check status — Loki returning 5xx isn't worth crashing.
      } finally {
        clearTimeout(tid);
      }
    } catch {
      // Loki unavailable, network error, timeout — drop the batch.
      // Console + file transports still have the logs, and we don't want
      // logging to fail the request.
    }
  }

  /** Group queue entries by their stream key for Loki's push format. */
  private buildPayload(entries: QueueEntry[]): { streams: unknown[] } {
    const streams = new Map<
      string,
      { stream: Record<string, string>; values: [string, string][] }
    >();

    for (const e of entries) {
      let s = streams.get(e.streamKey);
      if (!s) {
        s = { stream: e.labels, values: [] };
        streams.set(e.streamKey, s);
      }
      s.values.push(e.entry);
    }

    return { streams: Array.from(streams.values()) };
  }
}
