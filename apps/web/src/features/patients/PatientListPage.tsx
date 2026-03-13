import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePatients, type FhirPatient } from './hooks/use-patients';
import { useAuth } from '../../hooks/use-auth';

const genderBadge: Record<string, string> = {
  male: 'bg-blue-50 text-blue-700',
  female: 'bg-pink-50 text-pink-700',
  other: 'bg-purple-50 text-purple-700',
  unknown: 'bg-slate-50 text-slate-500',
};

export function PatientListPage(): React.ReactElement {
  const { isSuperAdmin, selectedTenant } = useAuth();
  const { searchPatients, loading, error } = usePatients();
  const [patients, setPatients] = useState<FhirPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [searchNhs, setSearchNhs] = useState('');

  const doSearch = async (p = 1) => {
    try {
      const result = await searchPatients({
        name: searchName || undefined,
        nhsNumber: searchNhs || undefined,
        page: p,
        limit: 20,
      });
      setPatients(result.entry?.map((e) => e.resource!).filter(Boolean) ?? []);
      setTotal(result.total ?? 0);
      setPage(p);
    } catch {
      // error state handled by hook
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    doSearch();
  }, [selectedTenant]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    doSearch(1);
  };

  const getNhsNumber = (p: FhirPatient) =>
    p.identifier?.find((id) => id.system?.includes('nhs'))?.value ?? '-';

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
          As a Super Admin, select a tenant to view their patients.
        </p>
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          Select a Tenant
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Patients</h1>
          <p className="text-slate-500 text-sm">{total} patient(s) registered</p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
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
          Register Patient
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <svg
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
          />
        </div>
        <input
          type="text"
          placeholder="NHS Number"
          value={searchNhs}
          onChange={(e) => setSearchNhs(e.target.value)}
          className="w-48 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-colors"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                NHS Number
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date of Birth
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Gender
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Organisation
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                  Loading patients...
                </td>
              </tr>
            )}
            {!loading && patients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                  No patients found
                </td>
              </tr>
            )}
            {patients.map((p) => {
              const fullName = `${p.name?.[0]?.prefix?.[0] ? `${p.name[0].prefix[0]} ` : ''}${p.name?.[0]?.given?.[0] ?? ''} ${p.name?.[0]?.family ?? ''}`;
              const initials = `${p.name?.[0]?.given?.[0]?.[0] ?? ''}${p.name?.[0]?.family?.[0] ?? ''}`;
              const gender = p.gender?.toLowerCase() ?? 'unknown';
              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <Link to={`/patients/${p.id}`} className="flex items-center gap-3 no-underline">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-semibold shrink-0">
                        {initials}
                      </div>
                      <span className="text-sm font-medium text-slate-900 hover:text-accent transition-colors">
                        {fullName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-sm text-slate-600">
                    {getNhsNumber(p)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-slate-600">{p.birthDate}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${genderBadge[gender] ?? genderBadge.unknown}`}
                    >
                      {gender}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-slate-600">
                    {p.managingOrganization?.display ?? '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => doSearch(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => doSearch(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
