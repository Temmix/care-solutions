import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly enabled: boolean;
  private readonly resend: Resend | null;

  constructor(@Inject(ConfigService) private config: ConfigService) {
    this.fromEmail = this.config.get<string>('NOTIFICATION_FROM_EMAIL', 'noreply@clinvara.com');
    this.enabled = this.config.get<string>('EMAIL_ENABLED', 'false') === 'true';

    const apiKey = this.config.get<string>('RESEND_API_KEY', '');
    this.resend = apiKey ? new Resend(apiKey) : null;

    this.logger.log(
      `EmailService initialised: enabled=${this.enabled}, from=${this.fromEmail}, provider=resend, hasApiKey=${!!apiKey}`,
    );
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
  }): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`Email disabled, skipping: ${params.subject} → ${params.to}`);
      return;
    }

    if (!this.resend) {
      this.logger.warn(`No RESEND_API_KEY configured, skipping: ${params.subject} → ${params.to}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.htmlBody,
        ...(params.textBody ? { text: params.textBody } : {}),
      });

      this.logger.log(`Email sent: ${params.subject} → ${params.to}`);
    } catch (err) {
      this.logger.error(`Failed to send email: ${params.subject} → ${params.to}`, err);
    }
  }
}
