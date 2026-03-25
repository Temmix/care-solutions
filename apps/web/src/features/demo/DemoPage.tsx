import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Electronic Patient Records',
    description:
      'Comprehensive patient management with encrypted records, care plans, assessments, and medication tracking.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    ),
  },
  {
    title: 'Care Plan Management',
    description:
      'Create and track structured care plans with goals, activities, and progress monitoring for each patient.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
        />
      </svg>
    ),
  },
  {
    title: 'Workforce Management',
    description:
      'Shift patterns, roster scheduling, availability tracking, and compliance monitoring with working time regulations.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
        />
      </svg>
    ),
  },
  {
    title: 'Patient Flow & Bed Management',
    description:
      'Real-time bed occupancy, admission and discharge workflows, transfer management, and discharge planning checklists.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
        />
      </svg>
    ),
  },
  {
    title: 'Medication Administration',
    description:
      'Prescribe, dispense, and track medications with full audit trails. Supports multiple routes and dosage forms.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
        />
      </svg>
    ),
  },
  {
    title: 'Security & Compliance',
    description:
      'Field-level AES-256 encryption, KMS key management, role-based access control, and full audit logging.',
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
        />
      </svg>
    ),
  },
];

const stats = [
  { label: 'FHIR R4', description: 'Standards compliant' },
  { label: 'AES-256', description: 'Field-level encryption' },
  { label: 'Multi-tenant', description: 'Full data isolation' },
  { label: 'Real-time', description: 'WebSocket updates' },
];

export function DemoPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-base">
              C
            </div>
            <span className="text-lg font-semibold text-primary tracking-tight">Clinvara</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors no-underline"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-lg transition-colors no-underline"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-linear-to-br from-primary via-primary-light to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-accent-light mb-6">
              <span className="w-1.5 h-1.5 bg-accent-light rounded-full" />
              Healthcare SaaS Platform
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-6">
              Modern healthcare
              <br />
              management platform
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-10 max-w-lg">
              Unified electronic patient records, care coordination, workforce management, and
              operational tools for care homes, GP practices, and hospitals.
            </p>
            <div className="flex items-center gap-4">
              <Link
                to="/register"
                className="px-6 py-3 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-lg transition-colors no-underline"
              >
                Start Free Trial
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 border border-white/20 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-colors no-underline"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pt-10 border-t border-white/10">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-accent-light">{stat.label}</div>
                <div className="text-slate-400 text-sm mt-1">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Everything you need to run a care organisation
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              Built from the ground up for UK healthcare providers with compliance, security, and
              interoperability at the core.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-slate-100 p-6 hover:border-slate-200 transition-colors"
              >
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture highlights */}
      <section className="py-20 lg:py-24 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
                Enterprise-grade architecture
              </h2>
              <p className="text-slate-500 mb-8">
                Designed for NHS and private healthcare organisations that demand security,
                reliability, and regulatory compliance.
              </p>
              <ul className="space-y-4">
                {[
                  [
                    'Multi-tenant isolation',
                    "Each organisation's data is fully separated with tenant-scoped access controls.",
                  ],
                  [
                    'Field-level encryption',
                    'Patient data is encrypted at the field level using AES-256 with envelope encryption via AWS KMS.',
                  ],
                  [
                    'Role-based access',
                    'Granular permissions across Admin, Clinician, Nurse, and Carer roles.',
                  ],
                  [
                    'Real-time updates',
                    'WebSocket-powered live bed status, shift swap notifications, and care event streaming.',
                  ],
                ].map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <div className="mt-1 w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-3 h-3 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{title}</div>
                      <div className="text-sm text-slate-500">{desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Built for UK Healthcare
                </div>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Care Homes',
                      desc: 'Resident records, care plans, medication rounds, and CQC-ready reporting.',
                      color: 'bg-teal-50 text-teal-600',
                    },
                    {
                      label: 'GP Practices',
                      desc: 'Patient registration, clinical assessments, referrals, and appointment management.',
                      color: 'bg-blue-50 text-blue-600',
                    },
                    {
                      label: 'Hospitals',
                      desc: 'Bed management, patient flow, discharge planning, and workforce compliance.',
                      color: 'bg-violet-50 text-violet-600',
                    },
                  ].map((org) => (
                    <div key={org.label} className="flex gap-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${org.color} shrink-0 mt-0.5`}
                      >
                        {org.label}
                      </span>
                      <span className="text-sm text-slate-500">{org.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Compliance & Standards
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'FHIR R4', desc: 'Interoperable data model' },
                    { label: 'RBAC', desc: '4 clinical role levels' },
                    { label: 'Encrypted', desc: 'Data at rest & in transit' },
                    { label: 'Audit Trail', desc: 'Full activity logging' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-white rounded-lg border border-slate-100 p-3 text-center"
                    >
                      <div className="text-sm font-bold text-accent">{item.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Roadmap */}
      <section className="py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Platform Roadmap
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              Our development journey — from core clinical systems to a fully integrated healthcare
              platform.
            </p>
          </div>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-6 lg:left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2 hidden sm:block" />

            <div className="space-y-8 sm:space-y-12">
              {[
                {
                  phase: 'Phase 1',
                  title: 'Core Clinical Platform',
                  status: 'complete' as const,
                  items: [
                    'Electronic Patient Records (FHIR R4)',
                    'Care Plan management with goals & activities',
                    'Clinical assessments & observations',
                    'Medication prescribing & administration',
                    'Multi-tenant architecture with data isolation',
                    'Role-based access control (Admin, Clinician, Nurse, Carer)',
                  ],
                },
                {
                  phase: 'Phase 2',
                  title: 'Workforce & Operations',
                  status: 'complete' as const,
                  items: [
                    'Shift pattern builder & roster scheduling',
                    'Staff availability & leave management',
                    'Shift swap marketplace',
                    'Working time compliance monitoring',
                    'Staff training records & certification tracking',
                    'Notification system with preferences',
                  ],
                },
                {
                  phase: 'Phase 3',
                  title: 'Specialist Modules',
                  status: 'complete' as const,
                  items: [
                    'Patient flow & real-time bed management',
                    'Admission, transfer & discharge workflows',
                    'Discharge planning checklists',
                    'Continuing Healthcare (CHC) assessments',
                    'Virtual ward enrolment & monitoring',
                    'IoT device integration & API key management',
                  ],
                },
                {
                  phase: 'Phase 4',
                  title: 'Intelligence & Configuration',
                  status: 'in-progress' as const,
                  items: [
                    'Module visibility — org-type-aware feature toggling',
                    'Audit log & compliance dashboard',
                    'Reporting & analytics engine',
                    'Billing & subscription management',
                    'Organisation settings & customisation',
                    'Field-level AES-256 encryption with KMS',
                  ],
                },
                {
                  phase: 'Phase 5',
                  title: 'Interoperability & Scale',
                  status: 'planned' as const,
                  items: [
                    'FHIR R4 API for third-party integrations',
                    'NHS Spine / PDS patient demographic lookup',
                    'E-referral service (e-RS) integration',
                    'GP Connect appointment booking',
                    'Webhooks & event-driven notifications',
                    'White-label & multi-region deployment',
                  ],
                },
                {
                  phase: 'Phase 6',
                  title: 'AI & Advanced Analytics',
                  status: 'planned' as const,
                  items: [
                    'AI-assisted care plan recommendations',
                    'Predictive deterioration scoring (NEWS2)',
                    'Automated roster optimisation',
                    'Natural language clinical note summarisation',
                    'Population health dashboards',
                    'Outcome benchmarking across organisations',
                  ],
                },
              ].map((milestone, index) => (
                <div
                  key={milestone.phase}
                  className={`relative sm:grid sm:grid-cols-2 sm:gap-8 ${index % 2 === 0 ? '' : 'sm:direction-rtl'}`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-6 lg:left-1/2 -translate-x-1/2 hidden sm:flex items-center justify-center">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        milestone.status === 'complete'
                          ? 'bg-accent border-accent'
                          : milestone.status === 'in-progress'
                            ? 'bg-amber-400 border-amber-400'
                            : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  {/* Content card — alternating sides on lg */}
                  <div
                    className={`sm:col-span-1 ${index % 2 === 0 ? 'lg:col-start-1' : 'lg:col-start-2'} sm:pl-12 lg:pl-0`}
                  >
                    <div className="bg-white rounded-xl border border-slate-100 p-6 hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {milestone.phase}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            milestone.status === 'complete'
                              ? 'bg-accent/10 text-accent'
                              : milestone.status === 'in-progress'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-slate-50 text-slate-400'
                          }`}
                        >
                          {milestone.status === 'complete'
                            ? 'Complete'
                            : milestone.status === 'in-progress'
                              ? 'In Progress'
                              : 'Planned'}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mb-3">
                        {milestone.title}
                      </h3>
                      <ul className="space-y-1.5">
                        {milestone.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-slate-500">
                            <svg
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                milestone.status === 'complete'
                                  ? 'text-accent'
                                  : milestone.status === 'in-progress'
                                    ? 'text-amber-400'
                                    : 'text-slate-300'
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              {milestone.status === 'complete' ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m4.5 12.75 6 6 9-13.5"
                                />
                              ) : (
                                <circle cx="12" cy="12" r="8" />
                              )}
                            </svg>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
            Ready to get started?
          </h2>
          <p className="text-slate-500 text-base mb-8 max-w-md mx-auto">
            Create your organisation account and start managing patients, staff, and operations in
            minutes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-lg transition-colors no-underline"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg transition-colors no-underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight">Clinvara</span>
          </div>
          <div className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Clinvara Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
