import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import {
  useTraining,
  type TrainingRecord,
  type TrainingSummary,
  type TrainingType,
} from './hooks/use-training';
import { TrainingStatusBadge } from './components/TrainingStatusBadge';
import { TrainingPriorityBadge } from './components/TrainingPriorityBadge';
import { ErrorAlert } from '../../components/ErrorAlert';
import toast from 'react-hot-toast';

const statusOptions = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'OVERDUE'];
const priorityOptions = ['MANDATORY', 'RECOMMENDED', 'OPTIONAL'];

export function TrainingListPage(): React.ReactElement {
  const { isSuperAdmin, selectedTenant } = useAuth();
  const {
    listTrainingRecords,
    createTrainingRecord,
    deleteTrainingRecord,
    getTrainingSummary,
    getTrainingTypes,
    loading,
    error,
  } = useTraining();

  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('MANDATORY');
  const [userId, setUserId] = useState('');
  const [provider, setProvider] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [renewalPeriodMonths, setRenewalPeriodMonths] = useState('');

  // Staff list for dropdown
  const [staff, setStaff] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  // Build a lookup map from training types
  const typeLabels: Record<string, string> = {};
  for (const t of trainingTypes) {
    typeLabels[t.code] = t.name;
  }

  const load = async () => {
    try {
      const [result, summaryResult] = await Promise.all([
        listTrainingRecords({
          status: filterStatus || undefined,
          category: filterCategory || undefined,
          priority: filterPriority || undefined,
          search: search || undefined,
        }),
        getTrainingSummary(),
      ]);
      setRecords(result.data);
      setTotal(result.total);
      setSummary(summaryResult);

      // Extract unique staff from records for the dropdown
      const staffMap = new Map<string, { id: string; firstName: string; lastName: string }>();
      result.data.forEach((r) => staffMap.set(r.user.id, r.user));
      setStaff(Array.from(staffMap.values()));
    } catch {
      // error handled by hook
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    getTrainingTypes()
      .then((types) => {
        setTrainingTypes(types);
        if (types.length > 0) setCategory(types[0].code);
      })
      .catch(() => {});
  }, [selectedTenant]);

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    load();
  }, [filterStatus, filterCategory, filterPriority, search]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userId || !category) return;
    try {
      await createTrainingRecord({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        userId,
        provider: provider.trim() || undefined,
        scheduledDate: scheduledDate || undefined,
        expiryDate: expiryDate || undefined,
        renewalPeriodMonths: renewalPeriodMonths ? parseInt(renewalPeriodMonths, 10) : undefined,
      });
      toast.success('Training record created');
      setShowForm(false);
      setTitle('');
      setDescription('');
      setProvider('');
      setScheduledDate('');
      setExpiryDate('');
      setRenewalPeriodMonths('');
      setUserId('');
      load();
    } catch {
      toast.error('Failed to create training record');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrainingRecord(id);
      toast.success('Training record deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="mb-2">Select a tenant to manage training records.</p>
        <Link to="/app/tenants" className="text-accent hover:underline">
          Go to Tenants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Staff Training</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : '+ Add Training'}
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Records</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{summary.totalRecords}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Compliance</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {summary.compliancePercentage}%
            </p>
            <p className="text-xs text-slate-400">
              {summary.mandatoryCompleted}/{summary.mandatoryTotal} mandatory
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {summary.byStatus['COMPLETED'] ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Expiring Soon</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.expiringCount}</p>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Training Record</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Staff Member *</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="User ID"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
                {staff.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {staff.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setUserId(s.id)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${userId === s.id ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {s.firstName} {s.lastName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Type *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {trainingTypes.length === 0 && <option value="">No types configured</option>}
                    {trainingTypes.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Provider</label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Renewal Period (months)</label>
                <input
                  type="number"
                  value={renewalPeriodMonths}
                  onChange={(e) => setRenewalPeriodMonths(e.target.value)}
                  min={1}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !userId || !category}
                  className="px-4 py-2 text-sm text-white bg-[var(--color-accent)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-48"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All Types</option>
          {trainingTypes.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All Priorities</option>
          {priorityOptions.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Staff Member
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Title
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Type
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
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-700">
                  {r.user.firstName} {r.user.lastName}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    to={`/app/training/${r.id}`}
                    className="text-[var(--color-accent)] hover:underline font-medium"
                  >
                    {r.title}
                  </Link>
                </td>
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
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-slate-400 hover:text-red-500 text-sm"
                    aria-label="Delete training record"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  No training records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <p className="text-xs text-slate-400 mt-3">
          Showing {records.length} of {total} records
        </p>
      )}
    </div>
  );
}
