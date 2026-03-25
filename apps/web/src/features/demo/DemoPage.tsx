import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Every patient, every record, one place',
    description:
      'No more chasing paper files or logging into three systems. Patient demographics, care plans, medications, and assessments — all encrypted, all audited, all accessible from any device.',
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
    title: 'Care plans that actually get followed',
    description:
      'Structured goals, activities, and progress notes your whole team can see and update. No more care plans sitting in a drawer — everyone stays aligned on what matters.',
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
    title: 'Rosters that build themselves',
    description:
      'Shift patterns, availability, swap marketplace, and working time compliance — all in one view. Your managers spend time caring, not wrestling with spreadsheets.',
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
    title: 'Know every bed, every minute',
    description:
      'Real-time occupancy dashboards, admission and discharge workflows, and transfer tracking. No more ringing wards to find a bed — it is all on one screen.',
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
    title: 'Medication rounds without the paper trail',
    description:
      'Prescribe, dispense, and record administration with a full audit trail. No more illegible MAR charts or missed signatures — every dose is tracked digitally.',
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
    title: 'Inspection-ready from day one',
    description:
      'Field-level encryption, complete audit trails, role-based access, and compliance dashboards. When the regulator calls, your data is already in order.',
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
  { label: '13 Modules', description: 'One platform, zero integrations' },
  { label: 'NHS-Ready', description: 'FHIR R4 compliant from day one' },
  { label: '256-bit', description: 'Field-level patient data encryption' },
  { label: '< 5 min', description: 'From sign-up to first patient record' },
];

const replacements = [
  {
    from: 'Spreadsheet rosters',
    to: 'Roster & Shift Management',
    icon: (
      <svg
        className="w-5 h-5"
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
    from: 'Paper MAR charts',
    to: 'Digital Medication Rounds',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082"
        />
      </svg>
    ),
  },
  {
    from: 'Separate HR system',
    to: 'Training & Compliance',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
        />
      </svg>
    ),
  },
  {
    from: 'Whiteboard bed boards',
    to: 'Patient Flow Dashboard',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75"
        />
      </svg>
    ),
  },
  {
    from: 'Disconnected IoT vendors',
    to: 'Unified Device Management',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
        />
      </svg>
    ),
  },
  {
    from: 'Manual CQC prep',
    to: 'Audit & Compliance',
    icon: (
      <svg
        className="w-5 h-5"
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
              Stop juggling 6 systems
              <br />
              to run one care organisation
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-10 max-w-lg">
              Clinvara replaces your disconnected patient records, rostering spreadsheets, and
              paper-based compliance tracking with one unified platform — purpose-built for UK
              healthcare.
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

      {/* Who It's For */}
      <section className="py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Built for the way you work
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              One platform, configured for your organisation type. Only see the features that matter
              to your team.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                label: 'Care Homes',
                color: 'bg-teal-500',
                lightColor: 'bg-teal-50 border-teal-100',
                textColor: 'text-teal-600',
                description:
                  'Replace your paper MARs, whiteboard rosters, and CQC prep folders. Clinvara gives your team medication rounds, care plans, staff training tracking, and CHC assessments — all in one login.',
                highlights: [
                  'Digital medication rounds',
                  'Care plan management',
                  'CHC assessments',
                  'Staff training & compliance',
                  'CQC-ready audit trails',
                ],
              },
              {
                label: 'GP Practices',
                color: 'bg-blue-500',
                lightColor: 'bg-blue-50 border-blue-100',
                textColor: 'text-blue-600',
                description:
                  'Patient records, clinical assessments, and practitioner scheduling without the NHS IT overhead. Lightweight enough for a single practice, powerful enough for a federation.',
                highlights: [
                  'Patient demographics',
                  'Clinical assessments',
                  'Practitioner management',
                  'Reporting & analytics',
                  'FHIR R4 interoperability',
                ],
              },
              {
                label: 'Hospitals & Trusts',
                color: 'bg-violet-500',
                lightColor: 'bg-violet-50 border-violet-100',
                textColor: 'text-violet-600',
                description:
                  'Real-time bed management, patient flow dashboards, virtual ward monitoring, and IoT device integration. See your entire operation on one screen.',
                highlights: [
                  'Real-time bed occupancy',
                  'Patient flow & transfers',
                  'Virtual ward monitoring',
                  'IoT device integration',
                  'Discharge planning',
                ],
              },
            ].map((org) => (
              <div
                key={org.label}
                className={`rounded-xl border p-6 ${org.lightColor} transition-colors`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${org.color}`} />
                  <span className={`text-sm font-bold ${org.textColor}`}>{org.label}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">{org.description}</p>
                <ul className="space-y-2">
                  {org.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-500">
                      <svg
                        className={`w-4 h-4 shrink-0 ${org.textColor}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-24 bg-white border-y border-slate-100">
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
                className="bg-slate-50 rounded-xl border border-slate-100 p-6 hover:border-slate-200 transition-colors"
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

      {/* Replace Your Stack */}
      <section className="py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Replace your entire stack
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              Every tool you are paying for separately, Clinvara handles in one platform with one
              login and one bill.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {replacements.map((item) => (
              <div
                key={item.from}
                className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center text-red-400">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs text-red-400 font-medium line-through">{item.from}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-accent shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-900">{item.to}</span>
                </div>
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
                    <div className="mt-1 w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
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
                  Trusted by UK Healthcare
                </div>
                <div className="space-y-4">
                  {[
                    {
                      label: 'CQC & ICO',
                      desc: 'Built to meet Care Quality Commission and Information Commissioner standards.',
                      color: 'bg-teal-50 text-teal-600',
                    },
                    {
                      label: 'NHS Digital',
                      desc: 'FHIR R4 data model aligned with NHS Digital interoperability requirements.',
                      color: 'bg-blue-50 text-blue-600',
                    },
                    {
                      label: 'DSPT Ready',
                      desc: 'Architecture designed to satisfy Data Security and Protection Toolkit criteria.',
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

      {/* CTA */}
      <section className="py-20 lg:py-24 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
            See Clinvara in action with your own data
          </h2>
          <p className="text-slate-500 text-base mb-8 max-w-lg mx-auto">
            Start your free trial — no credit card, no commitment. Import your existing patient
            records or explore every feature with our demo dataset.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-lg transition-colors no-underline"
            >
              Start Free Trial
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg transition-colors no-underline"
            >
              Book a Demo
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
