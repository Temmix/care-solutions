import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LogEntry } from '../types';
import type { LogTransport } from './transport.interface';

export interface FileTransportOptions {
  /** Directory where log files are stored */
  directory: string;
  /** Prefix for log file names (default: "app") */
  prefix?: string;
}

export class FileTransport implements LogTransport {
  readonly name = 'file';

  private readonly directory: string;
  private readonly prefix: string;
  private currentDate: string = '';
  private writeStream: fs.WriteStream | null = null;

  constructor(options: FileTransportOptions) {
    this.directory = options.directory;
    this.prefix = options.prefix ?? 'app';

    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true });
    }
  }

  write(entry: LogEntry): void {
    const today = entry.timestamp.slice(0, 10); // YYYY-MM-DD

    if (today !== this.currentDate) {
      this.rotateFile(today);
    }

    const line = JSON.stringify(entry) + '\n';
    this.writeStream?.write(line);
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.end(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private rotateFile(date: string): void {
    if (this.writeStream) {
      this.writeStream.end();
    }

    this.currentDate = date;
    const filename = `${this.prefix}-${date}.log`;
    const filepath = path.join(this.directory, filename);

    this.writeStream = fs.createWriteStream(filepath, { flags: 'a' });
  }
}
