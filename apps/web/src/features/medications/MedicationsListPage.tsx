import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMedications, type FhirMedicationRequest } from './hooks/use-medications';
import { PrescriptionStatusBadge } from './components/PrescriptionStatusBadge';
import { ErrorAlert } from '../../components/ErrorAlert';

const STATUSES = ['', 'DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'STOPPED', 'CANCELLED'] as const;

export function MedicationsListPage(): React.ReactElement {
  const { searchPrescriptions, loading, error } = useMedications();
  const [prescriptions, setPrescriptions] = useState<FhirMedicationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const limit = 20;

  useEffect(() => {
    searchPrescriptions({
      page,
      limit,
      status: status || undefined,
    })
      .then((result) => {
        setPrescriptions(
          (result.entry ?? [])
            .map((e) => e.resource)
            .filter((r): r is FhirMedicationRequest => !!r),
        );
        setTotal(result.total ?? 0);
      })
      .catch(() => {});
  }, [page, status, searchPrescriptions]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Medications</h1>
          <p className="text-sm text-slate-500 m-0">
            {total} prescription{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/app/medications/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Prescription
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white appearance-none"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {loading && prescriptions.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400 text-sm">Loading prescriptions...</div>
        </div>
      )}

      {!loading && prescriptions.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm mb-4 m-0">No prescriptions found</p>
          <Link
            to="/app/medications/new"
            className="text-accent text-sm no-underline hover:underline"
          >
            Create your first prescription
          </Link>
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left font-medium text-slate-500 px-6 py-3">Medication</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Patient</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Dosage</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Status</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Start Date</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Prescriber</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr
                  key={rx.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/medications/${rx.id}`}
                      className="text-slate-900 font-medium no-underline hover:text-accent transition-colors"
                    >
                      {rx.medicationReference?.display ?? '-'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{rx.subject?.display ?? '-'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {rx.dosageInstruction?.[0]?.text ?? '-'}
                  </td>
                  <td className="px-6 py-4">
                    <PrescriptionStatusBadge status={rx.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {rx.dispenseRequest?.validityPeriod?.start
                      ? new Date(rx.dispenseRequest.validityPeriod.start).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{rx.requester?.display ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
