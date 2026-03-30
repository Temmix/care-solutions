import { useState, useEffect } from 'react';
import { useTraining, type TrainingRecord, type TrainingType } from './hooks/use-training';
import { TrainingStatusBadge } from './components/TrainingStatusBadge';
import { TrainingPriorityBadge } from './components/TrainingPriorityBadge';
import { ErrorAlert } from '../../components/ErrorAlert';

export function MyTrainingPage(): React.ReactElement {
  const { getMyTraining, getTrainingTypes, loading, error } = useTraining();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Build a lookup map from training types
  const typeLabels: Record<string, string> = {};
  for (const t of trainingTypes) {
    typeLabels[t.code] = t.name;
  }

  useEffect(() => {
    getMyTraining()
      .then(setRecords)
      .catch(() => {});
    getTrainingTypes()
      .then(setTrainingTypes)
      .catch(() => {});
  }, []);

  const now = new Date();
  const expiringRecords = records.filter((r) => {
    if (!r.expiryDate) return false;
    const expiry = new Date(r.expiryDate);
    const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 30 && daysUntil > 0 && r.status !== 'EXPIRED';
  });

  const overdueRecords = records.filter((r) => r.status === 'OVERDUE' || r.status === 'EXPIRED');

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">My Training</h1>

      {error && <ErrorAlert message={error} />}

      {/* Alerts */}
      {overdueRecords.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-red-700">
            {overdueRecords.length} training record{overdueRecords.length > 1 ? 's' : ''} expired or
            overdue
          </p>
        </div>
      )}
      {expiringRecords.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-amber-700">
            {expiringRecords.length} training record{expiringRecords.length > 1 ? 's' : ''} expiring
            within 30 days
          </p>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Title
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Category
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Priority
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Expiry
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Certificates
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {records.map((r) => {
              const isExpiring =
                r.expiryDate &&
                new Date(r.expiryDate).getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000 &&
                r.status !== 'EXPIRED';
              return (
                <>
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpiring ? 'bg-amber-50/50' : ''}`}
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{r.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {typeLabels[r.category] ?? r.category}
                    </td>
                    <td className="px-4 py-3">
                      <TrainingPriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <TrainingStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.certificates.length > 0 ? `${r.certificates.length}` : '—'}
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-details`}>
                      <td colSpan={6} className="px-4 py-4 bg-slate-50/50">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-slate-500">Provider:</span>{' '}
                            <span className="text-slate-700">{r.provider ?? '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Scheduled:</span>{' '}
                            <span className="text-slate-700">
                              {r.scheduledDate
                                ? new Date(r.scheduledDate).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Completed:</span>{' '}
                            <span className="text-slate-700">
                              {r.completedDate
                                ? new Date(r.completedDate).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Score:</span>{' '}
                            <span className="text-slate-700">
                              {r.score != null ? `${r.score}%` : '—'}
                            </span>
                          </div>
                        </div>
                        {r.notes && (
                          <p className="text-sm text-slate-600 mb-3">
                            <span className="text-slate-500">Notes:</span> {r.notes}
                          </p>
                        )}
                        {r.certificates.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                              Certificates
                            </p>
                            <div className="space-y-1">
                              {r.certificates.map((cert) => (
                                <div
                                  key={cert.id}
                                  className="text-sm text-slate-600 bg-white rounded p-2 border border-slate-100"
                                >
                                  <span className="font-medium">{cert.name}</span> — {cert.issuer}
                                  {cert.certificateNumber && ` (#${cert.certificateNumber})`}
                                  <span className="text-slate-400 ml-2">
                                    Issued: {new Date(cert.issueDate).toLocaleDateString()}
                                    {cert.expiryDate &&
                                      ` · Expires: ${new Date(cert.expiryDate).toLocaleDateString()}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {records.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                  No training records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
