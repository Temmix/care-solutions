import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly enabled: boolean;

  constructor(@Inject(ConfigService) private config: ConfigService) {
    this.fromEmail = this.config.get<string>('NOTIFICATION_FROM_EMAIL', 'noreply@clinvara.com');
    this.enabled = this.config.get<string>('EMAIL_ENABLED', 'false') === 'true';
    this.logger.log(
      `EmailService initialised: enabled=${this.enabled}, from=${this.fromEmail}, EMAIL_ENABLED raw="${this.config.get<string>('EMAIL_ENABLED', '(not set)')}"`,
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

    try {
      // Dynamic import to avoid requiring @aws-sdk/client-ses when not in use
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

      const ses = new SESClient({
        region: this.config.get<string>('AWS_REGION', 'eu-west-2'),
      });

      await ses.send(
        new SendEmailCommand({
          Source: this.fromEmail,
          Destination: { ToAddresses: [params.to] },
          Message: {
            Subject: { Data: params.subject },
            Body: {
              Html: { Data: params.htmlBody },
              ...(params.textBody ? { Text: { Data: params.textBody } } : {}),
            },
          },
        }),
      );

      this.logger.log(`Email sent: ${params.subject} → ${params.to}`);
    } catch (err) {
      this.logger.error(`Failed to send email: ${params.subject} → ${params.to}`, err);
    }
  }
}
