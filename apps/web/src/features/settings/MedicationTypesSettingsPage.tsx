import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMedications, type MedicationCatalogueItem } from '../medications/hooks/use-medications';
import { ErrorAlert } from '../../components/ErrorAlert';

const FORM_OPTIONS = [
  'TABLET',
  'CAPSULE',
  'LIQUID',
  'INJECTION',
  'CREAM',
  'OINTMENT',
  'INHALER',
  'PATCH',
  'DROPS',
  'SUPPOSITORY',
  'POWDER',
  'OTHER',
];

interface FormState {
  name: string;
  genericName: string;
  code: string;
  form: string;
  strength: string;
  manufacturer: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  genericName: '',
  code: '',
  form: 'TABLET',
  strength: '',
  manufacturer: '',
};

export function MedicationTypesSettingsPage(): React.ReactElement {
  const { getCatalogue, createMedication, updateMedication } = useMedications();
  const [medications, setMedications] = useState<MedicationCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchMedications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCatalogue();
      setMedications(result);
    } catch {
      setError('Failed to load medications');
    } finally {
      setLoading(false);
    }
  }, [getCatalogue]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
  };

  const handleEdit = (m: MedicationCatalogueItem) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      genericName: m.genericName ?? '',
      code: m.code ?? '',
      form: m.form,
      strength: m.strength ?? '',
      manufacturer: m.manufacturer ?? '',
    });
    setShowForm(true);
    setError('');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        form: form.form,
      };
      if (form.genericName.trim()) payload.genericName = form.genericName.trim();
      if (form.code.trim()) payload.code = form.code.trim().toUpperCase();
      if (form.strength.trim()) payload.strength = form.strength.trim();
      if (form.manufacturer.trim()) payload.manufacturer = form.manufacturer.trim();

      if (editingId) {
        await updateMedication(editingId, payload);
      } else {
        await createMedication(payload);
      }
      handleCancel();
      fetchMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this medication?')) return;
    try {
      await updateMedication(id, { isActive: false });
      fetchMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/app/settings"
          className="inline-flex items-center gap-1 text-slate-400 no-underline text-sm hover:text-slate-600 transition-colors mb-3"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Settings
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medication Types</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the medication catalogue used for prescriptions.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
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
          New Medication
        </button>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit Medication' : 'New Medication'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Paracetamol 500mg"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Generic Name
                </label>
                <input
                  type="text"
                  value={form.genericName}
                  onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                  placeholder="e.g. Paracetamol"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Form *</label>
                <select
                  value={form.form}
                  onChange={(e) => setForm({ ...form, form: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {FORM_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Strength</label>
                <input
                  type="text"
                  value={form.strength}
                  onChange={(e) => setForm({ ...form, strength: e.target.value })}
                  placeholder="e.g. 500mg"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. PARA500"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Manufacturer</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                placeholder="e.g. Generic Pharma Ltd"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!form.name.trim() || saving}
                className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
        ) : medications.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No medications in the catalogue yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">
                  Generic Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Form</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Strength</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Code</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {medications.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-900 font-medium">{m.name}</td>
                  <td className="px-6 py-3 text-slate-500">{m.genericName ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {m.form.charAt(0) + m.form.slice(1).toLowerCase()}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{m.strength ?? '—'}</td>
                  <td className="px-6 py-3">
                    {m.code ? (
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {m.code}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="text-xs text-accent hover:text-accent/80 bg-transparent border-none cursor-pointer"
                      >
                        Edit
                      </button>
                      {m.isActive && (
                        <button
                          onClick={() => handleDeactivate(m.id)}
                          className="text-xs text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
