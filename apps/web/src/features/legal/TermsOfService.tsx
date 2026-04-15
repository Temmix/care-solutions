import { Link } from 'react-router-dom';

export function TermsOfService(): React.ReactElement {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span className="text-lg font-bold text-primary">Clinvara</span>
          </Link>
          <Link to="/login" className="text-sm text-accent hover:underline no-underline">
            Sign In
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white rounded-xl border border-slate-100 p-8 sm:p-12 prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Terms of Service</h1>
          <p className="text-slate-500 text-sm mb-8">Last updated: 15 April 2026</p>

          <p>
            These Terms of Service (<strong>&quot;Terms&quot;</strong>) govern your access to and
            use of the Clinvara platform (<strong>&quot;Service&quot;</strong>), operated by Aethon
            Labs Ltd, a company registered in England and Wales (<strong>&quot;we&quot;</strong>,{' '}
            <strong>&quot;us&quot;</strong>, <strong>&quot;our&quot;</strong>). By accessing or
            using the Service, you agree to be bound by these Terms.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">1. Definitions</h2>
          <ul>
            <li>
              <strong>&quot;Organisation&quot;</strong> means the legal entity (care home, NHS
              trust, domiciliary care agency, GP practice, or other healthcare provider) that
              subscribes to the Service.
            </li>
            <li>
              <strong>&quot;Authorised User&quot;</strong> means any individual granted access to
              the Service by the Organisation, including administrators, clinicians, nurses, carers,
              and patients.
            </li>
            <li>
              <strong>&quot;Customer Data&quot;</strong> means all data submitted to the Service by
              or on behalf of the Organisation, including patient records, staff information, care
              plans, and clinical assessments.
            </li>
            <li>
              <strong>&quot;Protected Health Information&quot; (&quot;PHI&quot;)</strong> means any
              individually identifiable health information as defined under UK GDPR and the Data
              Protection Act 2018.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            2. Eligibility &amp; Account Registration
          </h2>
          <p>
            2.1. The Service is available to healthcare organisations operating in the United
            Kingdom. By registering, you represent that you are authorised to bind your Organisation
            to these Terms.
          </p>
          <p>
            2.2. You must provide accurate and complete registration information. You are
            responsible for maintaining the confidentiality of your account credentials and for all
            activities under your account.
          </p>
          <p>
            2.3. Each Authorised User must have a unique account. Sharing login credentials is
            prohibited and may result in suspension of access.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">3. Service Description</h2>
          <p>Clinvara provides a cloud-based healthcare management platform comprising:</p>
          <ul>
            <li>Electronic patient records and care plan management</li>
            <li>Medication management and administration recording</li>
            <li>Clinical assessments and risk scoring</li>
            <li>Workforce scheduling, shift management, and geofenced clock-in/out</li>
            <li>Staff training compliance tracking</li>
            <li>Patient flow and bed management</li>
            <li>Continuing Healthcare (CHC) pathway management</li>
            <li>Virtual ward remote monitoring with IoT device integration</li>
            <li>Audit logging, reporting, and notifications</li>
          </ul>
          <p>
            3.2. The Service is a <strong>clinical support tool only</strong>. It does not
            constitute medical advice, diagnosis, or treatment. All clinical decisions remain the
            sole responsibility of qualified healthcare professionals within your Organisation.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            4. Subscriptions &amp; Billing
          </h2>
          <p>
            4.1. The Service is offered on a monthly subscription basis across the following tiers:
          </p>
          <table className="w-full text-sm border-collapse mt-4 mb-4">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Tier</th>
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Patients</th>
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Users</th>
                <th className="text-left py-2 font-medium text-slate-600">Price</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Free</td>
                <td className="py-2 pr-4">5</td>
                <td className="py-2 pr-4">1</td>
                <td className="py-2">£0/month</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Starter</td>
                <td className="py-2 pr-4">200</td>
                <td className="py-2 pr-4">20</td>
                <td className="py-2">£59/month</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Professional</td>
                <td className="py-2 pr-4">500</td>
                <td className="py-2 pr-4">50</td>
                <td className="py-2">£99/month</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Enterprise</td>
                <td className="py-2 pr-4">Unlimited</td>
                <td className="py-2 pr-4">Unlimited</td>
                <td className="py-2">£299/month</td>
              </tr>
            </tbody>
          </table>
          <p>
            4.2. New Organisations may be offered a 60-day free trial on the Professional tier. At
            the end of the trial period, the subscription will automatically downgrade to the Free
            tier unless upgraded.
          </p>
          <p>
            4.3. Subscriptions renew automatically on a monthly basis. Payments are processed via
            Stripe. You authorise recurring charges to the payment method on file.
          </p>
          <p>
            4.4. You may upgrade or downgrade your subscription at any time through the billing
            settings. Downgrades take effect at the end of the current billing period.
          </p>
          <p>
            4.5. <strong>No refunds</strong> are provided for partial billing periods. You retain
            access to paid features until the end of your current billing cycle.
          </p>
          <p>
            4.6. We reserve the right to modify pricing with 30 days&apos; written notice. Price
            changes will take effect at the next billing cycle following the notice period.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            5. Data Ownership &amp; Responsibility
          </h2>
          <p>
            5.1. <strong>Your Organisation owns its Customer Data.</strong> We do not claim any
            intellectual property rights over the data you submit to the Service.
          </p>
          <p>
            5.2. We act as a <strong>data processor</strong> on behalf of your Organisation (the
            data controller) for the purposes of UK GDPR. A separate{' '}
            <Link to="/legal/dpa" className="text-accent hover:underline">
              Data Processing Agreement
            </Link>{' '}
            governs this relationship.
          </p>
          <p>
            5.3. You are responsible for ensuring that all Customer Data is collected and processed
            lawfully, including obtaining appropriate patient consents where required.
          </p>
          <p>
            5.4. We will not access, use, or share Customer Data for any purpose other than
            providing the Service, unless required by law or with your express written consent.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            6. Security &amp; Encryption
          </h2>
          <p>
            6.1. All Protected Health Information is encrypted at rest using AES-256-GCM
            authenticated encryption with per-tenant encryption keys.
          </p>
          <p>
            6.2. Data is transmitted over TLS 1.2 or higher. All API communications require
            authenticated sessions.
          </p>
          <p>
            6.3. Tenant data is logically isolated. Users of one Organisation cannot access the data
            of another Organisation under any circumstances.
          </p>
          <p>
            6.4. All access to patient records and sensitive operations is recorded in an immutable
            audit log.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            7. Geolocation &amp; Clock-In Tracking
          </h2>
          <p>
            7.1. The Service includes geofenced clock-in functionality that captures the GPS
            coordinates of staff when they clock in and (optionally) clock out of shifts.
          </p>
          <p>
            7.2. GPS data is used solely to verify that staff are physically present at the assigned
            care location at the time of clock-in. Location data is not used for continuous
            tracking.
          </p>
          <p>
            7.3. Organisations are responsible for informing their staff about GPS data collection,
            its purpose, and obtaining appropriate consent in accordance with UK employment and data
            protection law.
          </p>
          <p>
            7.4. GPS clock-in data is retained as part of timesheet and compliance records for the
            period specified in your Organisation&apos;s data retention policy.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            8. IoT &amp; Remote Monitoring
          </h2>
          <p>
            8.1. The virtual ward module supports integration with IoT medical devices for remote
            vital sign monitoring. Supported device types include pulse oximeters, blood pressure
            monitors, thermometers, glucometers, weight scales, wearables, spirometers, and ECG
            monitors.
          </p>
          <p>
            8.2. The Service generates alerts when vital sign readings breach configured thresholds.
            These alerts are <strong>informational only</strong> and do not constitute clinical
            diagnoses.
          </p>
          <p>
            8.3. We are not liable for missed or delayed alerts caused by device malfunction,
            battery failure, loss of connectivity, or any other hardware or network issue.
          </p>
          <p>
            8.4. Your Organisation is solely responsible for defining clinically appropriate
            threshold values, escalation protocols, and response procedures.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">9. Clinical Disclaimer</h2>
          <p>
            9.1. Clinvara is a <strong>technology platform</strong>, not a healthcare provider. The
            Service does not provide medical advice, diagnosis, or treatment recommendations.
          </p>
          <p>
            9.2. CHC pathway scoring, assessment tools, and care plan frameworks are provided as
            structured workflows. All clinical assessments, funding decisions, and care decisions
            remain the responsibility of appropriately qualified professionals.
          </p>
          <p>
            9.3. Medication management features support recording and administration workflows but{' '}
            <strong>do not replace</strong> pharmacist review, clinical validation, or professional
            drug interaction checking.
          </p>
          <p>
            9.4. Your Organisation retains full clinical governance responsibility for all care
            delivered using or supported by the Service.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">10. Acceptable Use</h2>
          <p>You and your Authorised Users agree not to:</p>
          <ul>
            <li>Access patient data without a legitimate clinical or administrative need</li>
            <li>Share login credentials or allow unauthorised access to the Service</li>
            <li>
              Attempt to access data belonging to other Organisations or circumvent tenant isolation
            </li>
            <li>
              Use the Service for any purpose other than legitimate healthcare delivery and
              administration
            </li>
            <li>
              Extract, scrape, or bulk-download data except through authorised export features
            </li>
            <li>
              Reverse-engineer, decompile, or attempt to derive the source code of the Service
            </li>
            <li>Introduce viruses, malware, or any code designed to disrupt the Service</li>
            <li>Use the Service in violation of any applicable law or regulation</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate access for any user or Organisation that
            violates these terms, with or without notice depending on severity.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            11. Availability &amp; Support
          </h2>
          <p>
            11.1. We target 99.5% monthly uptime for the Service, excluding planned maintenance
            windows. This is a target, not a guarantee.
          </p>
          <p>
            11.2. Planned maintenance will be communicated at least 48 hours in advance where
            practicable and scheduled outside peak hours.
          </p>
          <p>
            11.3. We maintain automated daily database backups with a 7-day retention period. In the
            event of data loss, we will make reasonable efforts to restore from the most recent
            backup.
          </p>
          <p>
            11.4. Support is provided via email. Response times depend on your subscription tier and
            the severity of the issue.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">12. Third-Party Services</h2>
          <p>The Service integrates with the following third-party providers:</p>
          <ul>
            <li>
              <strong>Stripe</strong> — Payment processing. Subject to{' '}
              <span className="text-accent">Stripe&apos;s Terms of Service</span>.
            </li>
            <li>
              <strong>Amazon Web Services (AWS)</strong> — Cloud infrastructure hosting, database
              services, encryption key management, and email delivery. Data is hosted in the
              eu-west-2 (London) region.
            </li>
            <li>
              <strong>Resend</strong> — Transactional email delivery for notifications.
            </li>
            <li>
              <strong>postcodes.io</strong> — UK postcode-to-coordinate lookup. No personal data is
              shared with this service.
            </li>
          </ul>
          <p>
            We select sub-processors that maintain appropriate security standards. A current list of
            sub-processors is available on request.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">13. Intellectual Property</h2>
          <p>
            13.1. Aethon Labs Ltd retains all intellectual property rights in the Service, including
            its software, design, documentation, and branding.
          </p>
          <p>
            13.2. Your subscription grants a non-exclusive, non-transferable, revocable licence to
            use the Service for your Organisation&apos;s internal healthcare operations during the
            subscription period.
          </p>
          <p>
            13.3. We do not acquire any rights in your Customer Data. We will not use Customer Data
            to train models, generate analytics for third parties, or for any purpose beyond
            providing the Service.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">14. Limitation of Liability</h2>
          <p>
            14.1. To the maximum extent permitted by law, our total aggregate liability arising from
            or related to these Terms shall not exceed the total fees paid by your Organisation in
            the 12 months preceding the claim.
          </p>
          <p>
            14.2. We shall not be liable for any indirect, incidental, special, consequential, or
            punitive damages, including loss of profits, data, or business opportunity.
          </p>
          <p>
            14.3. We are not liable for clinical outcomes, patient safety incidents, or any harm
            arising from clinical decisions made using or informed by the Service.
          </p>
          <p>
            14.4. Nothing in these Terms excludes or limits liability for death or personal injury
            caused by negligence, fraud, or any liability that cannot be excluded by law.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">15. Indemnification</h2>
          <p>
            Your Organisation agrees to indemnify and hold us harmless from any claims, damages, or
            expenses arising from: (a) your breach of these Terms; (b) your violation of any
            applicable law or regulation; (c) any claim by a third party relating to your use of the
            Service or Customer Data; (d) clinical decisions or care delivery outcomes.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">16. Termination</h2>
          <p>
            16.1. Either party may terminate the subscription with 30 days&apos; written notice.
          </p>
          <p>
            16.2. We may terminate immediately if your Organisation: (a) breaches the acceptable use
            policy; (b) fails to pay fees for more than 30 days; (c) enters insolvency or
            administration.
          </p>
          <p>
            16.3. Upon termination, you will have a 30-day data export window during which you can
            download your Customer Data. After this period, we will delete all Customer Data in
            accordance with our data retention obligations.
          </p>
          <p>
            16.4. Sections relating to data ownership, limitation of liability, indemnification, and
            governing law survive termination.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">17. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify Organisation administrators
            of material changes at least 30 days before they take effect. Continued use of the
            Service after the effective date constitutes acceptance of the revised Terms.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">18. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of England and
            Wales. Any disputes arising from these Terms shall be subject to the exclusive
            jurisdiction of the courts of England and Wales.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">19. Contact</h2>
          <p>For questions about these Terms, contact us at:</p>
          <p>
            Aethon Labs Ltd
            <br />
            Email: admin@clinvara.com
          </p>

          <div className="border-t border-slate-200 mt-10 pt-6 text-xs text-slate-400 flex flex-wrap gap-4">
            <Link to="/legal/privacy" className="text-accent hover:underline no-underline">
              Privacy Policy
            </Link>
            <Link to="/legal/acceptable-use" className="text-accent hover:underline no-underline">
              Acceptable Use Policy
            </Link>
            <Link to="/legal/dpa" className="text-accent hover:underline no-underline">
              Data Processing Agreement
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
