import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api-client';
import { useAuth } from '../../hooks/use-auth';
import { ErrorAlert } from '../../components/ErrorAlert';

interface TrainingTypeConfig {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  category: string;
  sortOrder: string;
}

const EMPTY_FORM: FormState = { code: '', name: '', description: '', category: '', sortOrder: '0' };

export function TrainingTypesSettingsPage(): React.ReactElement {
  const { isSuperAdmin } = useAuth();
  const [types, setTypes] = useState<TrainingTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isSuperAdmin ? '/training-types/system' : '/training-types/tenant';
      const result = await api.get<TrainingTypeConfig[]>(endpoint);
      setTypes(result);
    } catch {
      setError('Failed to load training types');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
  };

  const handleEdit = (t: TrainingTypeConfig) => {
    setEditingId(t.id);
    setForm({
      code: t.code,
      name: t.name,
      description: t.description ?? '',
      category: t.category ?? '',
      sortOrder: String(t.sortOrder),
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
    if (!form.code.trim() || !form.name.trim()) return;

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.patch(`/training-types/${editingId}`, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          category: form.category.trim() || undefined,
          sortOrder: parseInt(form.sortOrder, 10) || 0,
        });
      } else {
        await api.post('/training-types', {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          category: form.category.trim() || undefined,
          sortOrder: parseInt(form.sortOrder, 10) || 0,
        });
      }
      handleCancel();
      fetchTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this training type?')) return;
    try {
      await api.delete(`/training-types/${id}`);
      fetchTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training Types</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Manage system-wide training types'
              : 'Manage custom training types for your organisation'}
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
          New Type
        </button>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit Training Type' : 'New Training Type'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FIRE_SAFETY"
                  disabled={!!editingId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Fire Safety"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Health & Safety"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  min="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y box-border"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!form.code.trim() || !form.name.trim() || saving}
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
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
        ) : types.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No custom training types yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Code</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Category</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Order</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {types.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                      {t.code}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-900 font-medium">{t.name}</td>
                  <td className="px-6 py-3 text-slate-500">{t.category ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-500">{t.sortOrder}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(t)}
                        className="text-xs text-accent hover:text-accent/80 bg-transparent border-none cursor-pointer"
                      >
                        Edit
                      </button>
                      {t.isActive && (
                        <button
                          onClick={() => handleDeactivate(t.id)}
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
