import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import { useAuth } from '../../hooks/use-auth';

interface AcceptanceStatusItem {
  type: string;
  title: string;
  version: string;
  accepted: boolean;
  acceptedAt: string | null;
  acceptedById: string | null;
}

interface AcceptanceStatus {
  documents: AcceptanceStatusItem[];
  outstanding: string[];
  allAccepted: boolean;
}

// Maps a document type to its public legal page route (rendered elsewhere).
const DOCUMENT_ROUTES: Record<string, string> = {
  DPA: '/legal/dpa',
  PRIVACY_POLICY: '/legal/privacy',
  TERMS_OF_SERVICE: '/legal/terms',
  ACCEPTABLE_USE_POLICY: '/legal/acceptable-use',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DataProtectionSettingsPage(): React.ReactElement {
  const { currentRole, isSuperAdmin, isTenantAdmin } = useAuth();
  const canManage =
    isSuperAdmin || isTenantAdmin || currentRole === 'ADMIN' || currentRole === 'TENANT_ADMIN';

  const [status, setStatus] = useState<AcceptanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<AcceptanceStatus>('/legal/acceptances/status')
      .then((s) => {
        setStatus(s);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load status'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
  }, [canManage, load]);

  const handleAccept = async (doc: AcceptanceStatusItem): Promise<void> => {
    setAccepting(doc.type);
    try {
      await api.post('/legal/acceptances', { documentType: doc.type });
      toast.success(`${doc.title} accepted`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record acceptance');
    } finally {
      setAccepting(null);
    }
  };

  if (!canManage) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <ErrorAlert
          variant="warning"
          message="You need administrator access to manage data-protection settings."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Data Protection</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and accept the current versions of your organisation's legal agreements.
        </p>
      </div>

      {error && <ErrorAlert message={error} className="mb-4" onDismiss={() => setError('')} />}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          Loading…
        </div>
      ) : (
        <>
          {status && !status.allAccepted && (
            <ErrorAlert
              variant="warning"
              className="mb-4"
              message={`${status.outstanding.length} document${
                status.outstanding.length === 1 ? '' : 's'
              } awaiting acceptance.`}
            />
          )}

          <div className="space-y-3">
            {status?.documents.map((doc) => (
              <div
                key={doc.type}
                className="flex items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-100"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{doc.title}</h3>
                    {doc.accepted ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5">
                        Accepted
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5">
                        Outstanding
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Version {doc.version}
                    {doc.accepted && doc.acceptedAt
                      ? ` · accepted ${formatDate(doc.acceptedAt)}`
                      : ''}
                    {DOCUMENT_ROUTES[doc.type] && (
                      <>
                        {' · '}
                        <a
                          href={DOCUMENT_ROUTES[doc.type]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline"
                        >
                          View document
                        </a>
                      </>
                    )}
                  </p>
                </div>
                {!doc.accepted && (
                  <button
                    onClick={() => handleAccept(doc)}
                    disabled={accepting === doc.type}
                    className="shrink-0 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                  >
                    {accepting === doc.type ? 'Accepting…' : 'Accept'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
