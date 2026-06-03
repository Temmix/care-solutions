import { Link } from 'react-router-dom';

export function PrivacyPolicy(): React.ReactElement {
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Privacy Policy</h1>
          <p className="text-slate-500 text-sm mb-8">Last updated: 15 April 2026</p>

          <p>
            This Privacy Policy explains how Aethon Labs Ltd (<strong>&quot;Clinvara&quot;</strong>,{' '}
            <strong>&quot;we&quot;</strong>, <strong>&quot;us&quot;</strong>) collects, uses,
            stores, and protects personal data when you use the Clinvara platform. We are committed
            to protecting your privacy in accordance with the UK General Data Protection Regulation
            (UK GDPR) and the Data Protection Act 2018.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            1. Data Controller &amp; Processor Roles
          </h2>
          <p>
            1.1. <strong>For Customer Data (patient records, clinical data, staff records):</strong>{' '}
            Your Organisation is the <strong>data controller</strong>. Clinvara acts as a{' '}
            <strong>data processor</strong> under the terms of our{' '}
            <Link to="/legal/dpa" className="text-accent hover:underline">
              Data Processing Agreement
            </Link>
            .
          </p>
          <p>
            1.2. <strong>For account and billing data:</strong> Clinvara is the{' '}
            <strong>data controller</strong> for information collected during registration, billing,
            and platform administration.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">2. Personal Data We Collect</h2>

          <h3 className="text-base font-semibold text-slate-800 mt-6">
            2.1. Account &amp; Organisation Data (Controller)
          </h3>
          <ul>
            <li>Name, email address, and role of account holders</li>
            <li>Organisation name, type, and contact details</li>
            <li>Billing information (processed by Stripe; we do not store card numbers)</li>
            <li>Login activity, session tokens, and password hashes</li>
          </ul>

          <h3 className="text-base font-semibold text-slate-800 mt-6">
            2.2. Patient Data (Processor)
          </h3>
          <p>Submitted by your Organisation, this may include:</p>
          <ul>
            <li>
              Demographics: name, date of birth, gender, marital status, address, contact details
            </li>
            <li>Identifiers: NHS number, Medical Record Number (MRN), passport number</li>
            <li>
              Clinical records: care plans, assessments, risk scores, medications, vital signs
            </li>
            <li>Encounter data: admissions, discharges, transfers, hospital course notes</li>
            <li>CHC assessments: domain scores, funding decisions, clinical summaries</li>
            <li>Virtual ward data: vital sign observations, IoT device readings, alert history</li>
          </ul>

          <h3 className="text-base font-semibold text-slate-800 mt-6">
            2.3. Staff &amp; Workforce Data (Processor)
          </h3>
          <ul>
            <li>Staff names, email addresses, and role assignments</li>
            <li>Shift schedules, availability records, and swap requests</li>
            <li>Training records, certificates, and compliance status</li>
            <li>Clock-in/out timestamps and GPS coordinates (see Section 5)</li>
            <li>Timesheet records and attendance flags</li>
          </ul>

          <h3 className="text-base font-semibold text-slate-800 mt-6">2.4. Technical Data</h3>
          <ul>
            <li>Browser type, device type, and operating system</li>
            <li>IP address (for security and session management)</li>
            <li>WebSocket connection metadata for real-time features</li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            3. Legal Basis for Processing
          </h2>
          <table className="w-full text-sm border-collapse mt-4 mb-4">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Data Type</th>
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Legal Basis</th>
                <th className="text-left py-2 font-medium text-slate-600">Article</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Account &amp; billing</td>
                <td className="py-2 pr-4">Contract performance</td>
                <td className="py-2">Art. 6(1)(b)</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Patient health data</td>
                <td className="py-2 pr-4">
                  Provision of health/social care (controller determines)
                </td>
                <td className="py-2">Art. 9(2)(h)</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Staff workforce data</td>
                <td className="py-2 pr-4">Legitimate interest / employment contract</td>
                <td className="py-2">Art. 6(1)(f)</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">GPS clock-in data</td>
                <td className="py-2 pr-4">Legitimate interest (attendance verification)</td>
                <td className="py-2">Art. 6(1)(f)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Security &amp; audit logs</td>
                <td className="py-2 pr-4">Legal obligation / legitimate interest</td>
                <td className="py-2">Art. 6(1)(c)/(f)</td>
              </tr>
            </tbody>
          </table>
          <p>
            Your Organisation, as data controller, is responsible for determining and documenting
            the appropriate legal basis for processing patient data within its clinical context.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">4. How We Use Personal Data</h2>
          <ul>
            <li>Providing and maintaining the Service as described in our Terms</li>
            <li>Authenticating users and enforcing role-based access controls</li>
            <li>Processing subscription payments via Stripe</li>
            <li>Sending transactional notifications (email, in-app, and real-time WebSocket)</li>
            <li>Verifying staff location during geofenced clock-in</li>
            <li>Generating alerts when IoT vital sign thresholds are breached</li>
            <li>Maintaining audit logs for compliance and security investigations</li>
            <li>Responding to support requests</li>
          </ul>
          <p>
            We do <strong>not</strong> use Customer Data for marketing, advertising, profiling, or
            automated decision-making. We do <strong>not</strong> sell personal data to third
            parties.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">5. Geolocation Data</h2>
          <p>
            5.1. When staff use the clock-in feature, the Service requests GPS coordinates via the
            browser&apos;s Geolocation API. This requires explicit browser-level permission from the
            user.
          </p>
          <p>
            5.2. We capture GPS coordinates at the <strong>moment of clock-in</strong> and
            optionally at clock-out. We do <strong>not</strong> continuously track staff location,
            record location in the background, or use location data outside of the clock-in/out
            process.
          </p>
          <p>
            5.3. GPS data collected includes: latitude, longitude, and calculated distance from the
            assigned location. This data is stored alongside the timesheet record.
          </p>
          <p>
            5.4. Staff may deny GPS permission in their browser. If denied, the clock-in button is
            disabled and a clear explanation is displayed.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">6. Data Security</h2>
          <ul>
            <li>
              <strong>Encryption at rest:</strong> Patient and staff PII is encrypted using
              AES-256-GCM with per-tenant data encryption keys. Keys are managed via AWS KMS or a
              local key management provider.
            </li>
            <li>
              <strong>Encryption in transit:</strong> All data transmitted between your browser and
              our servers is encrypted via TLS 1.2+.
            </li>
            <li>
              <strong>Tenant isolation:</strong> Each Organisation&apos;s data is logically
              separated. Cross-tenant data access is technically impossible through the application
              layer.
            </li>
            <li>
              <strong>Access controls:</strong> Role-based access control (RBAC) with 7 distinct
              role levels. All actions are authenticated via JWT tokens.
            </li>
            <li>
              <strong>Audit logging:</strong> All data access and modifications are logged with user
              ID, action type, resource, and timestamp.
            </li>
            <li>
              <strong>Blind indexing:</strong> Searchable fields (NHS numbers, names, postcodes) use
              HMAC-SHA256 blind indexes, enabling search without decrypting the underlying data.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            7. Data Sharing &amp; Sub-processors
          </h2>
          <p>We share personal data only with the following categories of recipients:</p>
          <table className="w-full text-sm border-collapse mt-4 mb-4">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Sub-processor</th>
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Purpose</th>
                <th className="text-left py-2 font-medium text-slate-600">Data Shared</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Amazon Web Services (eu-west-2)</td>
                <td className="py-2 pr-4">Infrastructure, database, encryption</td>
                <td className="py-2">All Customer Data (encrypted)</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Stripe</td>
                <td className="py-2 pr-4">Payment processing</td>
                <td className="py-2">Organisation billing details</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Resend</td>
                <td className="py-2 pr-4">Email delivery</td>
                <td className="py-2">Recipient email, notification content</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">postcodes.io</td>
                <td className="py-2 pr-4">Postcode geocoding</td>
                <td className="py-2">UK postcodes only (no PII)</td>
              </tr>
            </tbody>
          </table>
          <p>
            We do not transfer personal data outside the United Kingdom or European Economic Area.
            All infrastructure is hosted in AWS eu-west-2 (London).
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">8. Data Retention</h2>
          <p>
            8.1. <strong>Customer Data</strong> is retained for the duration of your subscription.
            You can export your data on demand at any time using the platform&apos;s export
            features. Upon termination, you have a further 30 days to export before data becomes
            eligible for permanent deletion.
          </p>
          <p>
            8.2. <strong>Audit logs</strong> are retained for a minimum of 3 years in accordance
            with NHS information governance guidance.
          </p>
          <p>
            8.3. <strong>Account data</strong> (email, name) is retained for 12 months after account
            closure for legal and compliance purposes, then deleted.
          </p>
          <p>
            8.4. <strong>Database backups</strong> are retained for 7 days on a rolling basis.
          </p>
          <p>
            8.5. Your Organisation, as data controller, may have additional statutory retention
            requirements for clinical records (e.g., NHS Records Management Code of Practice). It is
            your responsibility to ensure records are retained or exported accordingly before
            terminating your subscription.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">9. Your Rights</h2>
          <p>Under UK GDPR, individuals have the following rights:</p>
          <ul>
            <li>
              <strong>Right of access</strong> — Request a copy of your personal data
            </li>
            <li>
              <strong>Right to rectification</strong> — Request correction of inaccurate data
            </li>
            <li>
              <strong>Right to erasure</strong> — Request deletion of your data. Where records must
              be kept for legal or clinical retention reasons, this is fulfilled by irreversible
              anonymisation: direct identifiers are removed and free-text notes are blanked, while
              the de-identified clinical record is retained.
            </li>
            <li>
              <strong>Right to restriction</strong> — Request limitation of processing
            </li>
            <li>
              <strong>Right to data portability</strong> — Receive your data in a structured,
              machine-readable format
            </li>
            <li>
              <strong>Right to object</strong> — Object to processing based on legitimate interest
            </li>
          </ul>
          <p>
            <strong>For staff and patients:</strong> Rights requests regarding Customer Data should
            be directed to your Organisation (the data controller), who will liaise with us as
            needed.
          </p>
          <p>
            <strong>For Organisation administrators:</strong> Contact us directly at
            admin@clinvara.com.
          </p>
          <p>
            We will respond to valid requests within 30 days. If we need more time, we will inform
            you within the initial 30-day period.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            10. Cookies &amp; Local Storage
          </h2>
          <p>
            The Service uses <strong>localStorage</strong> in your browser to store authentication
            tokens (access token and refresh token) and your selected tenant ID. These are essential
            for the Service to function and are not used for tracking or advertising.
          </p>
          <p>
            We do not use third-party tracking cookies, analytics pixels, or advertising technology.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">11. Children&apos;s Data</h2>
          <p>
            The Service may process data relating to children as part of patient records submitted
            by healthcare organisations. This processing is carried out under the
            Organisation&apos;s clinical governance as data controller and in accordance with the
            legal basis for healthcare provision.
          </p>
          <p>
            The Service is not directed at children as end users. Account registration requires the
            user to be at least 18 years old.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">12. Data Breaches</h2>
          <p>
            12.1. In the event of a personal data breach, we will notify affected Organisation
            administrators without undue delay and within 72 hours of becoming aware of the breach,
            in accordance with Article 33 of UK GDPR.
          </p>
          <p>
            12.2. Our notification will include: the nature of the breach, categories and
            approximate number of individuals affected, likely consequences, and measures taken to
            mitigate the breach.
          </p>
          <p>
            12.3. Your Organisation, as data controller, is responsible for assessing whether the
            breach requires notification to the ICO and/or affected individuals.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify Organisation
            administrators of material changes via email or in-app notification at least 30 days
            before they take effect. The &quot;Last updated&quot; date at the top of this page will
            be revised accordingly.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            14. Contact &amp; Complaints
          </h2>
          <p>For privacy enquiries or to exercise your rights:</p>
          <p>
            Aethon Labs Ltd
            <br />
            Email: admin@clinvara.com
          </p>
          <p>
            If you are not satisfied with our response, you have the right to lodge a complaint with
            the Information Commissioner&apos;s Office (ICO):
          </p>
          <p>
            Information Commissioner&apos;s Office
            <br />
            Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF
            <br />
            Tel: 0303 123 1113
          </p>

          <div className="border-t border-slate-200 mt-10 pt-6 text-xs text-slate-400 flex flex-wrap gap-4">
            <Link to="/legal/terms" className="text-accent hover:underline no-underline">
              Terms of Service
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
