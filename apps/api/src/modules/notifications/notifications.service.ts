import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EmailService } from './email.service';
import { SearchNotificationsDto, UpdatePreferencesDto } from './dto';
import { renderEmailTemplate } from './email-templates';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(EventsService) private events: EventsService,
    @Inject(EmailService) private emailService: EmailService,
  ) {}

  // ── Create & dispatch notification ─────────────────────────

  async notify(params: {
    userId: string;
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }): Promise<void> {
    try {
      // Check IN_APP preference
      const shouldInApp = await this.shouldNotify(params.userId, params.type, 'IN_APP');
      if (!shouldInApp) return;

      const notification = await this.prisma.notification.create({
        data: {
          type: params.type,
          title: params.title,
          message: params.message,
          link: params.link,
          userId: params.userId,
          tenantId: params.tenantId,
        },
      });

      // Emit via WebSocket for real-time badge update
      this.events.emitNotification(params.userId, {
        id: notification.id,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      });

      // Check EMAIL preference and send
      const shouldEmail = await this.shouldNotify(params.userId, params.type, 'EMAIL');
      if (shouldEmail) {
        const user = await this.prisma.user.findUnique({
          where: { id: params.userId },
          select: { email: true, firstName: true },
        });
        if (user?.email) {
          const { html, text } = renderEmailTemplate({
            recipientName: user.firstName ?? 'there',
            title: params.title,
            body: params.message,
            ctaLabel: params.link ? 'View in Clinvara' : undefined,
            ctaUrl: params.link ? `https://app.clinvara.com${params.link}` : undefined,
          });
          await this.emailService.sendEmail({
            to: user.email,
            subject: `Clinvara: ${params.title}`,
            htmlBody: html,
            textBody: text,
          });
        }
      }
    } catch {
      // Fire-and-forget: don't block business logic
    }
  }

  // ── Notify multiple users ──────────────────────────────────

  async notifyMany(
    userIds: string[],
    params: {
      tenantId: string;
      type: NotificationType;
      title: string;
      message: string;
      link?: string;
    },
  ): Promise<void> {
    await Promise.allSettled(userIds.map((userId) => this.notify({ userId, ...params })));
  }

  // ── List notifications ─────────────────────────────────────

  async list(userId: string, tenantId: string, dto: SearchNotificationsDto) {
    const page = parseInt(dto.page ?? '1', 10);
    const limit = parseInt(dto.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: { userId: string; tenantId: string; read?: boolean } = { userId, tenantId };
    if (dto.unreadOnly === 'true') where.read = false;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, tenantId, read: false } }),
    ]);

    return { data, total, unreadCount, page, limit };
  }

  // ── Unread count ───────────────────────────────────────────

  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, tenantId, read: false },
    });
  }

  // ── Mark as read ───────────────────────────────────────────

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string, tenantId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, tenantId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { count: result.count };
  }

  // ── Preferences ────────────────────────────────────────────

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { eventType: 'asc' },
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const upserts = dto.preferences.map((pref) =>
      this.prisma.notificationPreference.upsert({
        where: {
          userId_eventType_channel: {
            userId,
            eventType: pref.eventType,
            channel: pref.channel,
          },
        },
        create: {
          userId,
          eventType: pref.eventType,
          channel: pref.channel,
          enabled: pref.enabled,
        },
        update: { enabled: pref.enabled },
      }),
    );
    return Promise.all(upserts);
  }

  // ── Helpers ────────────────────────────────────────────────

  private async shouldNotify(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel | string,
  ): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_eventType_channel: {
          userId,
          eventType: type,
          channel: channel as NotificationChannel,
        },
      },
    });
    // Default to enabled if no preference exists
    return pref === null ? true : pref.enabled;
  }
}
