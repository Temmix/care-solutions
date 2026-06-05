import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Delivers push notifications to mobile devices via the Expo Push API, which
 * fans out to both APNs (iOS) and FCM (Android) from a single HTTPS call.
 * Fire-and-forget: failures are logged but never block business logic.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /** Send a push to every registered device for a user. */
  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<void> {
    try {
      const devices = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });
      if (devices.length === 0) return;

      const messages: ExpoPushMessage[] = devices.map((d) => ({
        to: d.token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      }));

      const tickets = await this.send(messages);
      await this.pruneInvalidTokens(
        messages.map((m) => m.to),
        tickets,
      );
    } catch (err) {
      this.logger.warn(`Push to user ${userId} failed: ${(err as Error).message}`);
    }
  }

  private async send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      throw new Error(`Expo push responded ${res.status}`);
    }
    const json = (await res.json()) as { data?: ExpoPushTicket[] };
    return json.data ?? [];
  }

  /**
   * Remove tokens Expo reports as unregistered (app uninstalled / token rotated)
   * so we stop sending to dead devices. Tickets map 1:1 to the sent tokens.
   */
  private async pruneInvalidTokens(tokens: string[], tickets: ExpoPushTicket[]): Promise<void> {
    const dead = tickets
      .map((ticket, i) => ({ ticket, token: tokens[i] }))
      .filter(
        ({ ticket }) =>
          ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered',
      )
      .map(({ token }) => token);

    if (dead.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
    }
  }
}
