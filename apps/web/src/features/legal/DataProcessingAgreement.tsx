import { Link } from 'react-router-dom';

export function DataProcessingAgreement(): React.ReactElement {
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Data Processing Agreement</h1>
          <p className="text-slate-500 text-sm mb-8">Last updated: 15 April 2026</p>

          <p>
            This Data Processing Agreement (<strong>&quot;DPA&quot;</strong>) forms part of the{' '}
            <Link to="/legal/terms" className="text-accent hover:underline">
              Terms of Service
            </Link>{' '}
            between Aethon Labs Ltd (<strong>&quot;Processor&quot;</strong>,{' '}
            <strong>&quot;Clinvara&quot;</strong>) and the Organisation subscribing to the Clinvara
            platform (<strong>&quot;Controller&quot;</strong>).
          </p>
          <p>
            This DPA is entered into pursuant to Article 28 of the UK General Data Protection
            Regulation (UK GDPR) and sets out the terms on which the Processor processes personal
            data on behalf of the Controller.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">1. Definitions</h2>
          <p>
            In this DPA, &quot;personal data&quot;, &quot;data subject&quot;,
            &quot;processing&quot;, &quot;controller&quot;, &quot;processor&quot;, and
            &quot;supervisory authority&quot; have the meanings given in UK GDPR. Additional
            definitions:
          </p>
          <ul>
            <li>
              <strong>&quot;Customer Data&quot;</strong> — all personal data submitted to the
              Service by or on behalf of the Controller.
            </li>
            <li>
              <strong>&quot;Service&quot;</strong> — the Clinvara platform as described in the Terms
              of Service.
            </li>
            <li>
              <strong>&quot;Sub-processor&quot;</strong> — any third party engaged by the Processor
              to process Customer Data.
            </li>
            <li>
              <strong>&quot;Security Incident&quot;</strong> — a breach of security leading to the
              accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or
              access to Customer Data.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            2. Scope &amp; Purpose of Processing
          </h2>
          <p>
            2.1. The Processor shall process Customer Data solely for the purpose of providing the
            Service as described in the Terms of Service and in accordance with the
            Controller&apos;s documented instructions.
          </p>
          <p>2.2. The details of processing are as follows:</p>
          <table className="w-full text-sm border-collapse mt-4 mb-4">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-600 w-1/3">Subject matter</td>
                <td className="py-2">Provision of healthcare management SaaS platform</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-600">Duration</td>
                <td className="py-2">
                  For the term of the Controller&apos;s subscription, plus 30 days for data export
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-600">Nature of processing</td>
                <td className="py-2">
                  Collection, storage, retrieval, encryption, structured display, search indexing,
                  transmission (notifications), and deletion
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-600">
                  Categories of data subjects
                </td>
                <td className="py-2">
                  Patients, staff (clinicians, nurses, carers, administrators), practitioners
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-slate-600">Types of personal data</td>
                <td className="py-2">
                  Names, dates of birth, contact details, NHS numbers, addresses, clinical records
                  (care plans, assessments, medications, vital signs, encounter notes), shift
                  schedules, GPS coordinates (clock-in), training records, audit logs
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            2.3. The processing includes <strong>special category data</strong> (health data) under
            Article 9 of UK GDPR. The Controller is responsible for establishing the appropriate
            legal basis for this processing.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">3. Controller Obligations</h2>
          <p>The Controller shall:</p>
          <ul>
            <li>
              Ensure it has a lawful basis for processing all personal data submitted to the
              Service, including health data and staff location data
            </li>
            <li>
              Provide processing instructions to the Processor through configuration of the Service
              (e.g., enabling modules, setting geofence radii, configuring alert thresholds)
            </li>
            <li>
              Comply with its obligations under UK GDPR, including responding to data subject rights
              requests
            </li>
            <li>
              Ensure that Authorised Users are trained on data protection responsibilities and the
              Acceptable Use Policy
            </li>
            <li>
              Notify the Processor promptly of any data subject rights request that requires the
              Processor&apos;s assistance
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">4. Processor Obligations</h2>
          <p>The Processor shall:</p>
          <ul>
            <li>
              Process Customer Data only on documented instructions from the Controller, unless
              required by law (in which case the Processor shall inform the Controller before
              processing, unless prohibited by law)
            </li>
            <li>
              Ensure that persons authorised to process Customer Data have committed themselves to
              confidentiality
            </li>
            <li>
              Implement and maintain appropriate technical and organisational security measures (see
              Section 6)
            </li>
            <li>
              Not engage another processor (sub-processor) without prior written authorisation of
              the Controller (see Section 7)
            </li>
            <li>
              Assist the Controller in responding to data subject rights requests, insofar as this
              is possible given the nature of processing
            </li>
            <li>
              Assist the Controller in ensuring compliance with obligations relating to security,
              breach notification, data protection impact assessments, and prior consultation with
              the supervisory authority
            </li>
            <li>
              At the Controller&apos;s choice, delete or return all Customer Data upon termination
              of the Service, and delete existing copies unless required by law to retain them
            </li>
            <li>
              Make available to the Controller all information necessary to demonstrate compliance
              with this DPA, and allow for and contribute to audits conducted by the Controller or
              an auditor mandated by the Controller
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">5. Data Subject Rights</h2>
          <p>
            5.1. The Controller is responsible for responding to data subject rights requests
            (access, rectification, erasure, restriction, portability, objection).
          </p>
          <p>
            5.2. Where a data subject contacts the Processor directly, the Processor shall promptly
            redirect the request to the Controller.
          </p>
          <p>5.3. The Processor shall assist the Controller in fulfilling rights requests by:</p>
          <ul>
            <li>Providing data export functionality within the Service</li>
            <li>
              Enabling the Controller to view, correct, and delete records through the platform
            </li>
            <li>Responding to technical queries about what data is held and how it is processed</li>
          </ul>
          <p>
            5.4. Reasonable assistance beyond self-service features may be subject to additional
            fees at the Processor&apos;s standard rates.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">6. Security Measures</h2>
          <p>
            The Processor implements and maintains the following technical and organisational
            measures to protect Customer Data:
          </p>

          <h3 className="text-base font-semibold text-slate-800 mt-6">6.1. Encryption</h3>
          <ul>
            <li>AES-256-GCM authenticated encryption at rest for all patient PII and staff PII</li>
            <li>Per-tenant data encryption keys (DEKs), wrapped by a master key</li>
            <li>Key management via AWS Key Management Service (KMS) or local key provider</li>
            <li>Key versioning to support rotation without re-encrypting existing data</li>
            <li>TLS 1.2+ for all data in transit</li>
          </ul>

          <h3 className="text-base font-semibold text-slate-800 mt-6">6.2. Access Control</h3>
          <ul>
            <li>
              Role-based access control (RBAC) with 7 role levels: SUPER_ADMIN, TENANT_ADMIN, ADMIN,
              CLINICIAN, NURSE, CARER, PATIENT
            </li>
            <li>JWT-based authentication with token expiry and refresh</li>
            <li>Forced password change capability for new or compromised accounts</li>
            <li>Tenant isolation enforced at the API layer — all queries scoped by tenant ID</li>
          </ul>

          <h3 className="text-base font-semibold text-slate-800 mt-6">
            6.3. Data Integrity &amp; Availability
          </h3>
          <ul>
            <li>Automated daily database backups with 7-day retention</li>
            <li>
              Database hosted on AWS RDS (PostgreSQL) with encryption at rest and automated failover
            </li>
            <li>Application deployed on AWS ECS Fargate with auto-scaling</li>
            <li>Health check endpoints for automated monitoring</li>
          </ul>

          <h3 className="text-base font-semibold text-slate-800 mt-6">
            6.4. Audit &amp; Monitoring
          </h3>
          <ul>
            <li>
              Comprehensive audit logging of all data access and modifications (user, action,
              resource, timestamp, metadata)
            </li>
            <li>Blind indexing (HMAC-SHA256) for searchable encrypted fields</li>
            <li>Audit logs retained for a minimum of 3 years</li>
          </ul>

          <h3 className="text-base font-semibold text-slate-800 mt-6">6.5. Personnel</h3>
          <ul>
            <li>
              All Processor personnel with access to Customer Data are bound by confidentiality
              obligations
            </li>
            <li>Access to production infrastructure is limited to essential personnel only</li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">7. Sub-processors</h2>
          <p>
            7.1. The Controller authorises the Processor to engage the following sub-processors:
          </p>
          <table className="w-full text-sm border-collapse mt-4 mb-4">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Sub-processor</th>
                <th className="text-left py-2 pr-4 font-medium text-slate-600">Location</th>
                <th className="text-left py-2 font-medium text-slate-600">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Amazon Web Services (AWS)</td>
                <td className="py-2 pr-4">eu-west-2 (London, UK)</td>
                <td className="py-2">
                  Cloud infrastructure, database hosting (RDS), encryption key management (KMS),
                  container orchestration (ECS), object storage, load balancing
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">Stripe, Inc.</td>
                <td className="py-2 pr-4">USA (EU data centre)</td>
                <td className="py-2">
                  Payment processing for subscriptions. Receives organisation billing data only. No
                  patient data shared.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Resend</td>
                <td className="py-2 pr-4">USA</td>
                <td className="py-2">
                  Transactional email delivery. Receives recipient email address and notification
                  content. No patient clinical data included in emails.
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            7.2. The Processor shall notify the Controller at least 30 days before adding or
            replacing a sub-processor. The Controller may object to the change within 14 days. If
            the objection is not resolved, the Controller may terminate the agreement.
          </p>
          <p>
            7.3. The Processor shall impose data protection obligations on each sub-processor that
            are no less protective than those in this DPA.
          </p>
          <p>
            7.4. The Processor remains fully liable to the Controller for the performance of each
            sub-processor&apos;s obligations.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">8. International Transfers</h2>
          <p>
            8.1. All Customer Data is stored and processed within the United Kingdom (AWS eu-west-2,
            London).
          </p>
          <p>
            8.2. Certain sub-processors (Stripe, Resend) may process limited data in the United
            States. Such transfers are governed by:
          </p>
          <ul>
            <li>
              The UK-US Data Bridge (UK Extension to the EU-US Data Privacy Framework), where
              applicable
            </li>
            <li>
              Standard Contractual Clauses (UK International Data Transfer Agreement) as a fallback
            </li>
          </ul>
          <p>
            8.3. No patient health data is transferred outside the UK. Only billing metadata
            (Stripe) and notification delivery data (Resend: email addresses and non-clinical
            notification text) leave the UK.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            9. Security Incident Notification
          </h2>
          <p>
            9.1. The Processor shall notify the Controller without undue delay, and in any event
            within <strong>48 hours</strong>, after becoming aware of a Security Incident affecting
            Customer Data.
          </p>
          <p>9.2. The notification shall include:</p>
          <ul>
            <li>A description of the nature of the incident</li>
            <li>The categories and approximate number of data subjects affected</li>
            <li>The categories and approximate number of records affected</li>
            <li>The likely consequences of the incident</li>
            <li>Measures taken or proposed to address the incident and mitigate its effects</li>
            <li>A contact point for further information</li>
          </ul>
          <p>
            9.3. The Processor shall cooperate with the Controller in investigating the incident and
            in the Controller&apos;s obligations to notify the ICO and affected data subjects.
          </p>
          <p>
            9.4. The Processor shall take immediate steps to contain the incident, preserve
            evidence, and prevent recurrence.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            10. Data Retention &amp; Deletion
          </h2>
          <p>
            10.1. Customer Data is retained for the duration of the Controller&apos;s subscription.
          </p>
          <p>10.2. Upon termination or expiry of the subscription:</p>
          <ul>
            <li>
              The Controller has <strong>30 days</strong> to export Customer Data using the
              platform&apos;s export features (export is also available on demand at any time during
              the subscription)
            </li>
            <li>
              After this 30-day window, Customer Data becomes <strong>eligible for deletion</strong>
              . The Processor will delete it from production systems on the Controller&apos;s
              written request, or as part of the Processor&apos;s offboarding process, and will
              provide written confirmation once deletion is complete
            </li>
            <li>
              Deletion from production systems is performed under controlled, logged access by
              authorised personnel. Customer Data in automated backups will be purged as backups
              rotate (within 7 days of production deletion)
            </li>
          </ul>
          <p>
            10.3. Audit logs may be retained for up to 3 years after termination for legal and
            regulatory compliance purposes. The Controller will be informed of any such retention.
          </p>
          <p>
            10.4. The Processor shall provide written confirmation of deletion upon the
            Controller&apos;s request.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            11. Audits &amp; Inspections
          </h2>
          <p>
            11.1. The Processor shall make available to the Controller all information reasonably
            necessary to demonstrate compliance with this DPA.
          </p>
          <p>
            11.2. The Controller (or an independent third-party auditor bound by confidentiality)
            may conduct an audit of the Processor&apos;s processing activities, subject to:
          </p>
          <ul>
            <li>30 days&apos; prior written notice</li>
            <li>
              Audits being conducted during normal business hours and in a manner that minimises
              disruption
            </li>
            <li>No more than one audit per 12-month period (unless required by the ICO)</li>
            <li>
              The auditor agreeing to confidentiality obligations no less restrictive than this DPA
            </li>
          </ul>
          <p>
            11.3. Where the Processor holds a current SOC 2, ISO 27001, or equivalent certification,
            it may provide a copy in lieu of a physical audit, at its discretion.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">
            12. Data Protection Impact Assessments
          </h2>
          <p>
            Where the Controller is required to carry out a Data Protection Impact Assessment (DPIA)
            relating to processing carried out via the Service, the Processor shall provide
            reasonable assistance, including information about:
          </p>
          <ul>
            <li>The nature, scope, and purpose of processing</li>
            <li>Technical and organisational security measures in place</li>
            <li>Sub-processor arrangements and data flows</li>
            <li>Data retention practices</li>
          </ul>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">13. Liability</h2>
          <p>
            13.1. Each party&apos;s liability under this DPA is subject to the limitations set out
            in the Terms of Service.
          </p>
          <p>
            13.2. The Processor shall be liable for damage caused by processing that does not comply
            with this DPA or the Controller&apos;s lawful instructions.
          </p>
          <p>
            13.3. The Controller shall be liable for ensuring the lawfulness of processing
            instructions and the accuracy and completeness of Customer Data submitted to the
            Service.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">14. Term &amp; Termination</h2>
          <p>
            14.1. This DPA commences when the Controller subscribes to the Service and continues for
            the duration of the subscription and any post-termination data retention period.
          </p>
          <p>
            14.2. This DPA terminates automatically upon the expiry of the data retention and
            deletion obligations set out in Section 10.
          </p>
          <p>
            14.3. Sections relating to confidentiality, liability, and data deletion survive
            termination of this DPA.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">15. Governing Law</h2>
          <p>
            This DPA is governed by the laws of England and Wales and subject to the exclusive
            jurisdiction of the courts of England and Wales, consistent with the Terms of Service.
          </p>

          <h2 className="text-lg font-semibold text-slate-900 mt-8">16. Contact</h2>
          <p>For questions about this DPA or to exercise rights under it:</p>
          <p>
            Aethon Labs Ltd
            <br />
            Email: admin@clinvara.com
          </p>

          <div className="border-t border-slate-200 mt-10 pt-6 text-xs text-slate-400 flex flex-wrap gap-4">
            <Link to="/legal/terms" className="text-accent hover:underline no-underline">
              Terms of Service
            </Link>
            <Link to="/legal/privacy" className="text-accent hover:underline no-underline">
              Privacy Policy
            </Link>
            <Link to="/legal/acceptable-use" className="text-accent hover:underline no-underline">
              Acceptable Use Policy
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
