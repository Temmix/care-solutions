import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api-client';
import { ErrorAlert } from '../../../components/ErrorAlert';
import { useAuth } from '../../../hooks/use-auth';

interface ProcessingBasis {
  id: string;
  purpose: string;
  article6Basis: string;
  article9Condition: string | null;
  notes: string | null;
}

interface Consent {
  id: string;
  type: string;
  status: string;
  grantedAt: string | null;
  withdrawnAt: string | null;
}

const PURPOSES = [
  'DIRECT_CARE',
  'CARE_COORDINATION',
  'BILLING',
  'SAFEGUARDING',
  'SERVICE_IMPROVEMENT',
  'RESEARCH',
  'LEGAL_COMPLIANCE',
  'OTHER',
];
const ARTICLE_6 = [
  'CONSENT',
  'CONTRACT',
  'LEGAL_OBLIGATION',
  'VITAL_INTERESTS',
  'PUBLIC_TASK',
  'LEGITIMATE_INTERESTS',
];
const ARTICLE_9 = [
  'EXPLICIT_CONSENT',
  'EMPLOYMENT_SOCIAL_SECURITY',
  'VITAL_INTERESTS',
  'NOT_FOR_PROFIT',
  'MADE_PUBLIC_BY_SUBJECT',
  'LEGAL_CLAIMS',
  'SUBSTANTIAL_PUBLIC_INTEREST',
  'HEALTH_OR_SOCIAL_CARE',
  'PUBLIC_HEALTH',
  'ARCHIVING_RESEARCH',
];
const CONSENT_TYPES = [
  'DATA_SHARING',
  'THIRD_PARTY_SHARING',
  'RESEARCH',
  'MARKETING',
  'PHOTOGRAPHY',
];

const humanise = (v: string): string =>
  v
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const selectClass =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent';

export function PatientConsentPanel({
  patientId,
}: {
  patientId: string;
}): React.ReactElement | null {
  const { currentRole, isSuperAdmin, isTenantAdmin } = useAuth();
  const canManage =
    isSuperAdmin ||
    isTenantAdmin ||
    ['ADMIN', 'TENANT_ADMIN', 'CLINICIAN', 'NURSE'].includes(currentRole ?? '');

  const [bases, setBases] = useState<ProcessingBasis[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [article6, setArticle6] = useState(ARTICLE_6[4]); // PUBLIC_TASK
  const [article9, setArticle9] = useState(ARTICLE_9[7]); // HEALTH_OR_SOCIAL_CARE
  const [notes, setNotes] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<ProcessingBasis[]>(`/privacy/patients/${patientId}/processing-bases`),
      api.get<Consent[]>(`/privacy/patients/${patientId}/consents`),
    ])
      .then(([b, c]) => {
        setBases(b);
        setConsents(c);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
  }, [canManage, load]);

  if (!canManage) return null;

  const saveBasis = async (): Promise<void> => {
    setBusy(true);
    try {
      await api.put(`/privacy/patients/${patientId}/processing-bases`, {
        purpose,
        article6Basis: article6,
        article9Condition: article9 || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Lawful basis saved');
      setNotes('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save basis');
    } finally {
      setBusy(false);
    }
  };

  const setConsent = async (type: string, status: 'GRANTED' | 'WITHDRAWN'): Promise<void> => {
    setBusy(true);
    try {
      await api.put(`/privacy/patients/${patientId}/consents`, { type, status });
      toast.success(`Consent ${status === 'GRANTED' ? 'granted' : 'withdrawn'}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update consent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Data Protection</h2>

      {error && <ErrorAlert message={error} className="mb-4" onDismiss={() => setError('')} />}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* ── Lawful basis ─────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Lawful basis for processing
            </h3>
            {bases.length === 0 ? (
              <p className="text-sm text-slate-400 mb-3">No lawful basis recorded yet.</p>
            ) : (
              <ul className="mb-3 space-y-1.5">
                {bases.map((b) => (
                  <li key={b.id} className="text-sm text-slate-700">
                    <span className="font-medium">{humanise(b.purpose)}</span> — Art. 6:{' '}
                    {humanise(b.article6Basis)}
                    {b.article9Condition ? `; Art. 9: ${humanise(b.article9Condition)}` : ''}
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                aria-label="Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className={selectClass}
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {humanise(p)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Article 6 basis"
                value={article6}
                onChange={(e) => setArticle6(e.target.value)}
                className={selectClass}
              >
                {ARTICLE_6.map((a) => (
                  <option key={a} value={a}>
                    {humanise(a)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Article 9 condition"
                value={article9}
                onChange={(e) => setArticle9(e.target.value)}
                className={selectClass}
              >
                <option value="">No special-category condition</option>
                {ARTICLE_9.map((a) => (
                  <option key={a} value={a}>
                    {humanise(a)}
                  </option>
                ))}
              </select>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className={selectClass}
              />
            </div>
            <button
              onClick={saveBasis}
              disabled={busy}
              className="mt-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              Save basis
            </button>
          </div>

          {/* ── Consents ─────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Consents
            </h3>
            <ul className="space-y-2">
              {CONSENT_TYPES.map((type) => {
                const existing = consents.find((c) => c.type === type);
                const granted = existing?.status === 'GRANTED';
                return (
                  <li key={type} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">{humanise(type)}</span>
                      {existing ? (
                        <span
                          className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5 ${
                            granted
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {granted ? 'Granted' : 'Withdrawn'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-50 text-slate-400 text-xs px-2 py-0.5">
                          Not recorded
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setConsent(type, granted ? 'WITHDRAWN' : 'GRANTED')}
                      disabled={busy}
                      className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-50 disabled:opacity-50"
                    >
                      {granted ? 'Withdraw' : 'Grant'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
