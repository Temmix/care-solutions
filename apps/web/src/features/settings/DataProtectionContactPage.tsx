const DP_CONTACT_EMAIL = 'admin@clinvara.com';

const RIGHTS = [
  'Access — a copy of the personal data held about you',
  'Rectification — correction of inaccurate data',
  'Erasure — deletion, where no legal/clinical retention applies',
  'Restriction & objection — limit or object to processing',
  'Portability — receive your data in a machine-readable format',
];

export function DataProtectionContactPage(): React.ReactElement {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Data Protection Contact</h1>
        <p className="text-sm text-slate-500 mt-1">
          How to raise a data-protection query or exercise your rights.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Contact us</h2>
          <p className="text-sm text-slate-600">
            For data-protection enquiries, email{' '}
            <a href={`mailto:${DP_CONTACT_EMAIL}`} className="text-accent hover:underline">
              {DP_CONTACT_EMAIL}
            </a>
            . We aim to respond to valid requests within 30 days.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Your rights</h2>
          <p className="text-sm text-slate-600 mb-3">Under UK GDPR you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {RIGHTS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            For patient or staff records, requests are handled by your organisation as the data
            controller; we assist as the processor.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Policies</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <a
                href="/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="/legal/dpa"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Data Processing Agreement
              </a>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Complaints</h2>
          <p className="text-sm text-slate-600">
            If you are unhappy with how we handle your data, you can complain to the UK regulator,
            the Information Commissioner's Office (ICO), at{' '}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              ico.org.uk
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
