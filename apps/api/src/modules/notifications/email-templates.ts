const ACCENT = '#6366f1';
const SLATE_900 = '#0f172a';
const SLATE_600 = '#475569';
const SLATE_400 = '#94a3b8';
const BG = '#f8fafc';

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="padding:0 0 24px;">
          <span style="font-size:20px;font-weight:700;color:${ACCENT};letter-spacing:-0.5px;">Clinvara</span>
        </td></tr>
        <!-- Body card -->
        <tr><td style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:${SLATE_400};">
            Clinvara — Clinical care, simplified
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:${SLATE_400};">
            You received this email because you have an account on Clinvara.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
    <tr><td style="background:${ACCENT};border-radius:8px;padding:12px 24px;">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${label}</a>
    </td></tr>
  </table>`;
}

// ── Generic notification email ─────────────────────────

export function renderEmailTemplate(params: {
  recipientName: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): { html: string; text: string } {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:${SLATE_900};">${params.title}</h2>
    <p style="margin:0 0 4px;font-size:14px;color:${SLATE_600};line-height:1.6;">
      Hi ${params.recipientName},
    </p>
    <p style="margin:0;font-size:14px;color:${SLATE_600};line-height:1.6;">
      ${params.body}
    </p>
    ${params.ctaLabel && params.ctaUrl ? ctaButton(params.ctaLabel, params.ctaUrl) : ''}
  `);

  const text = [
    params.title,
    '',
    `Hi ${params.recipientName},`,
    '',
    params.body,
    ...(params.ctaUrl ? ['', `${params.ctaLabel}: ${params.ctaUrl}`] : []),
  ].join('\n');

  return { html, text };
}

// ── Welcome email (mandatory, bypasses preferences) ────

export function renderWelcomeEmail(params: {
  firstName: string;
  orgName: string;
  trialDays: number;
  loginUrl: string;
}): { html: string; text: string } {
  const html = layout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:${SLATE_900};">Welcome to Clinvara!</h2>
    <p style="margin:0 0 12px;font-size:14px;color:${SLATE_600};line-height:1.6;">
      Hi ${params.firstName},
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:${SLATE_600};line-height:1.6;">
      Your organisation <strong>${params.orgName}</strong> has been created successfully.
      You have a <strong>${params.trialDays}-day Professional trial</strong> with full access
      to all features — no credit card required.
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:${SLATE_600};line-height:1.6;">
      Here's what you can do next:
    </p>
    <ul style="margin:0 0 12px;padding-left:20px;font-size:14px;color:${SLATE_600};line-height:1.8;">
      <li>Add your team members</li>
      <li>Register your first patients</li>
      <li>Set up care plans and assessments</li>
      <li>Configure staff rosters and schedules</li>
    </ul>
    ${ctaButton('Get Started', params.loginUrl)}
  `);

  const text = [
    'Welcome to Clinvara!',
    '',
    `Hi ${params.firstName},`,
    '',
    `Your organisation ${params.orgName} has been created successfully.`,
    `You have a ${params.trialDays}-day Professional trial with full access to all features.`,
    '',
    'Get started: ' + params.loginUrl,
  ].join('\n');

  return { html, text };
}

// ── Invitation email (mandatory, bypasses preferences) ─

export function renderInvitationEmail(params: {
  firstName: string;
  orgName: string;
  tempPassword: string;
  loginUrl: string;
}): { html: string; text: string } {
  const html = layout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:${SLATE_900};">You've been invited to Clinvara</h2>
    <p style="margin:0 0 12px;font-size:14px;color:${SLATE_600};line-height:1.6;">
      Hi ${params.firstName},
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:${SLATE_600};line-height:1.6;">
      You've been added to <strong>${params.orgName}</strong> on Clinvara.
      Use the temporary password below to log in, then set your own password.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${BG};border-radius:8px;padding:16px;width:100%;border:1px solid #e2e8f0;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:12px;color:${SLATE_400};text-transform:uppercase;letter-spacing:0.5px;">Temporary Password</p>
        <p style="margin:0;font-size:16px;font-weight:600;color:${SLATE_900};font-family:monospace;">${params.tempPassword}</p>
      </td></tr>
    </table>
    ${ctaButton('Log In', params.loginUrl)}
  `);

  const text = [
    "You've been invited to Clinvara",
    '',
    `Hi ${params.firstName},`,
    '',
    `You've been added to ${params.orgName} on Clinvara.`,
    `Your temporary password: ${params.tempPassword}`,
    '',
    'Log in: ' + params.loginUrl,
  ].join('\n');

  return { html, text };
}

// ── Deactivation email (mandatory) ─────────────────────

export function renderDeactivationEmail(params: { firstName: string; orgName: string }): {
  html: string;
  text: string;
} {
  const html = layout(`
    <h2 style="margin:0 0 16px;font-size:18px;color:${SLATE_900};">Account Deactivated</h2>
    <p style="margin:0 0 12px;font-size:14px;color:${SLATE_600};line-height:1.6;">
      Hi ${params.firstName},
    </p>
    <p style="margin:0;font-size:14px;color:${SLATE_600};line-height:1.6;">
      Your account in <strong>${params.orgName}</strong> has been deactivated.
      If you believe this is a mistake, please contact your organisation administrator.
    </p>
  `);

  const text = [
    'Account Deactivated',
    '',
    `Hi ${params.firstName},`,
    '',
    `Your account in ${params.orgName} has been deactivated.`,
    'If you believe this is a mistake, please contact your organisation administrator.',
  ].join('\n');

  return { html, text };
}
