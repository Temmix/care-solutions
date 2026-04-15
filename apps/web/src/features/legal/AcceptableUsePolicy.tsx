import { Link } from 'react-router-dom';

export function AcceptableUsePolicy(): React.ReactElement {
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Acceptable Use Policy</h1>
          <p className="text-slate-500 text-sm mb-8">Last updated: 15 April 2026</p>

          <p>
            This Acceptable Use Policy (<strong>&quot;AUP&quot;</strong>) sets out the rules
            governing use of the Clinvara platform by all Authorised Users. This AUP forms part of
            and is incorporated into our{' '}
            <Link to="/legal/terms" className="text-accent hover:underline">
              Terms of Service
            </Link>
            .
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">1. General Principles</h2>
          <p>
            1.1. Clinvara is a healthcare management platform designed exclusively for legitimate
            healthcare delivery and administration. All use must be lawful, ethical, and consistent
            with professional healthcare standards.
          </p>
          <p>
            1.2. Each Authorised User is personally responsible for their actions within the
            platform. All activity is attributed to individual user accounts and recorded in the
            audit log.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">2. Account Security</h2>
          <p>You must:</p>
          <ul>
            <li>Use a unique, strong password for your Clinvara account</li>
            <li>Never share your login credentials with any other person</li>
            <li>Lock or log out of sessions when leaving your device unattended</li>
            <li>
              Report any suspected unauthorised access to your Organisation administrator
              immediately
            </li>
            <li>Change your password promptly if you believe it has been compromised</li>
          </ul>
          <p>
            Organisation administrators must promptly deactivate accounts of users who leave the
            organisation or no longer require access.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">3. Patient Data Access</h2>
          <p>
            3.1. You must only access patient records when you have a{' '}
            <strong>legitimate clinical or administrative need</strong> to do so. Accessing patient
            data out of curiosity, for personal reasons, or for any purpose unrelated to the
            patient&apos;s care is strictly prohibited.
          </p>
          <p>
            3.2. You must not access records of patients who are not under your direct or indirect
            care, unless you have been explicitly authorised by your Organisation to do so (e.g.,
            for audit, quality assurance, or safeguarding purposes).
          </p>
          <p>
            3.3. All access to patient records is logged. Your Organisation may audit access
            patterns and investigate any access that appears inappropriate.
          </p>
          <p>
            3.4. You must not share patient information with anyone who is not authorised to receive
            it, whether verbally, in writing, via screenshots, or through any other means.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">4. Data Integrity</h2>
          <p>You must:</p>
          <ul>
            <li>
              Enter data accurately and honestly. Falsifying clinical records, assessments,
              medication administration records, or timesheet data is prohibited.
            </li>
            <li>
              Correct errors through proper channels (editing the record with an audit trail) rather
              than deleting and re-creating records to avoid audit visibility.
            </li>
            <li>
              Not use the system to create misleading records for the purpose of defrauding
              patients, insurers, the NHS, or any other party.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            5. Clock-In &amp; Geolocation
          </h2>
          <p>
            5.1. The geofenced clock-in feature is designed to verify staff attendance at assigned
            care locations. You must not:
          </p>
          <ul>
            <li>Attempt to spoof, falsify, or manipulate your GPS location when clocking in</li>
            <li>Clock in on behalf of another staff member</li>
            <li>Clock in at a location where you are not physically present</li>
            <li>Tamper with or interfere with the geofence validation process</li>
          </ul>
          <p>
            5.2. Fraudulent clock-in activity may be treated as a disciplinary matter by your
            Organisation and may result in suspension of your Clinvara access.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            6. IoT Devices &amp; Remote Monitoring
          </h2>
          <p>
            6.1. IoT device API keys must be kept confidential and must not be shared outside your
            Organisation or published in any public repository, forum, or document.
          </p>
          <p>
            6.2. Devices must only be registered and used for their intended clinical purpose within
            your Organisation&apos;s virtual ward programmes.
          </p>
          <p>
            6.3. You must not use IoT integration endpoints to submit fabricated vital sign data or
            manipulate alert thresholds to suppress clinically significant readings.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">7. Prohibited Activities</h2>
          <p>The following activities are strictly prohibited:</p>
          <ul>
            <li>
              <strong>Unauthorised access:</strong> Attempting to access accounts, data, or systems
              you are not authorised to use, including other Organisations&apos; tenants.
            </li>
            <li>
              <strong>Security testing:</strong> Performing vulnerability scans, penetration tests,
              or security assessments against the platform without prior written authorisation from
              Aethon Labs Ltd.
            </li>
            <li>
              <strong>Data extraction:</strong> Bulk downloading, scraping, or systematically
              extracting data from the platform except through authorised export features.
            </li>
            <li>
              <strong>Reverse engineering:</strong> Decompiling, disassembling, or
              reverse-engineering any part of the platform&apos;s software.
            </li>
            <li>
              <strong>Malicious code:</strong> Uploading or transmitting viruses, trojans,
              ransomware, or any other malicious software.
            </li>
            <li>
              <strong>Excessive load:</strong> Using automated scripts, bots, or processes that
              place unreasonable load on the platform&apos;s infrastructure.
            </li>
            <li>
              <strong>Abuse of notifications:</strong> Sending spam or abusive content through the
              platform&apos;s notification or messaging systems.
            </li>
            <li>
              <strong>Circumventing controls:</strong> Attempting to bypass subscription limits,
              role-based access controls, module visibility settings, or any other platform
              restriction.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            8. Organisation Administrator Responsibilities
          </h2>
          <p>Organisation administrators have additional responsibilities:</p>
          <ul>
            <li>
              Assign appropriate roles to users based on the principle of least privilege. Do not
              grant ADMIN access to staff who do not require it.
            </li>
            <li>Regularly review user access and deactivate accounts that are no longer needed.</li>
            <li>Review audit logs periodically for suspicious or inappropriate access patterns.</li>
            <li>
              Ensure that all staff are informed about this AUP and understand their
              responsibilities.
            </li>
            <li>
              Configure appropriate alert thresholds, geofence radii, and notification settings for
              your Organisation&apos;s clinical requirements.
            </li>
            <li>
              Report any suspected data breach or security incident to Aethon Labs Ltd immediately.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            9. Audit &amp; Investigation
          </h2>
          <p>
            9.1. All user actions within Clinvara are recorded in an audit log, including: data
            viewed, created, updated, deleted, and exported; login/logout events; and administrative
            actions.
          </p>
          <p>
            9.2. Audit logs are available to Organisation administrators and may be used to
            investigate potential policy violations, data breaches, or safeguarding concerns.
          </p>
          <p>
            9.3. In the event of a suspected violation, we may cooperate with your
            Organisation&apos;s investigation, including providing relevant audit data, in
            accordance with our Data Processing Agreement.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">10. Enforcement</h2>
          <p>10.1. Violations of this AUP may result in:</p>
          <ul>
            <li>Temporary suspension of the offending user&apos;s account</li>
            <li>Permanent removal of the user from the platform</li>
            <li>
              Suspension or termination of the Organisation&apos;s subscription (for severe or
              systemic violations)
            </li>
            <li>Referral to regulatory bodies or law enforcement where required by law</li>
          </ul>
          <p>
            10.2. We will notify your Organisation administrator before taking enforcement action
            against individual users, except where immediate action is necessary to protect the
            security or integrity of the platform or other users&apos; data.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">11. Reporting Violations</h2>
          <p>
            If you become aware of any violation of this AUP, please report it to your Organisation
            administrator or contact us at admin@clinvara.com.
          </p>
          <p>
            We take all reports seriously and will investigate promptly. Reports can be made
            anonymously.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">12. Changes</h2>
          <p>
            We may update this AUP from time to time. Material changes will be communicated to
            Organisation administrators at least 30 days before they take effect. Continued use of
            the platform after the effective date constitutes acceptance of the updated AUP.
          </p>

          <div className="border-t border-slate-200 mt-10 pt-6 text-xs text-slate-400 flex flex-wrap gap-4">
            <Link to="/legal/terms" className="text-accent hover:underline no-underline">
              Terms of Service
            </Link>
            <Link to="/legal/privacy" className="text-accent hover:underline no-underline">
              Privacy Policy
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
