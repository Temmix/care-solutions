import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/use-auth';
import {
  useTenantAdmins,
  type TenantAdmin,
  type CreateTenantAdminForm,
} from './hooks/use-tenant-admins';
import { ErrorAlert } from '../../components/ErrorAlert';

// -- Validation --

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Record<string, string>;

function validateForm(form: CreateTenantAdminForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.firstName.trim()) errors.firstName = 'First name is required';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required';
  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!form.password) {
    errors.password = 'Password is required';
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return errors;
}

// -- Field error component --

function FieldError({ message }: { message?: string }): React.ReactElement | null {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

// -- Create modal --

const emptyForm: CreateTenantAdminForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
};

interface CreateModalProps {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (form: CreateTenantAdminForm) => void;
}

function CreateTenantAdminModal({
  open,
  saving,
  onClose,
  onSave,
}: CreateModalProps): React.ReactElement | null {
  const [form, setForm] = useState<CreateTenantAdminForm>(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => validateForm(form), [form]);
  const isValid = Object.keys(errors).length === 0;

  const set = (field: keyof CreateTenantAdminForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const blur = (field: string) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const showError = (field: string): string | undefined =>
    touched[field] ? errors[field] : undefined;

  const inputClass = (field: string): string =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 ${
      showError(field) ? 'border-red-300 bg-red-50' : 'border-slate-200'
    }`;

  const handleSubmit = () => {
    setTouched({ firstName: true, lastName: true, email: true, password: true });
    if (isValid) onSave(form);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setTouched({});
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Tenant Admin</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
              <input
                className={inputClass('firstName')}
                value={form.firstName}
                onChange={set('firstName')}
                onBlur={blur('firstName')}
                placeholder="John"
              />
              <FieldError message={showError('firstName')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label>
              <input
                className={inputClass('lastName')}
                value={form.lastName}
                onChange={set('lastName')}
                onBlur={blur('lastName')}
                placeholder="Smith"
              />
              <FieldError message={showError('lastName')} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
            <input
              type="email"
              className={inputClass('email')}
              value={form.email}
              onChange={set('email')}
              onBlur={blur('email')}
              placeholder="admin@clinvara.com"
            />
            <FieldError message={showError('email')} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
            <input
              type="password"
              className={inputClass('password')}
              value={form.password}
              onChange={set('password')}
              onBlur={blur('password')}
              placeholder="Minimum 8 characters"
            />
            <FieldError message={showError('password')} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Main page --

export function TenantAdminsPage(): React.ReactElement {
  const { user } = useAuth();
  const { list, create, deactivate, reactivate, loading, error } = useTenantAdmins();
  const [admins, setAdmins] = useState<TenantAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadAdmins = useCallback(
    async (p = 1) => {
      try {
        const res = await list(p, 20);
        setAdmins(res.data);
        setTotal(res.total);
        setPage(p);
      } catch {
        // error is set in hook
      }
    },
    [list],
  );

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleCreate = async (form: CreateTenantAdminForm) => {
    setSaving(true);
    setActionError('');
    try {
      await create(form);
      setShowCreate(false);
      await loadAdmins(1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create tenant admin');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (admin: TenantAdmin) => {
    setActionError('');
    try {
      if (admin.isActive) {
        await deactivate(admin.id);
      } else {
        await reactivate(admin.id);
      }
      await loadAdmins(page);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenant Admins</h1>
          <p className="text-slate-500 text-sm mt-1">Manage multi-tenant administrator accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 cursor-pointer flex items-center gap-2"
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
          Add Tenant Admin
        </button>
      </div>

      {/* Error banners */}
      <ErrorAlert message={error} className="mb-4" />
      <ErrorAlert message={actionError} className="mb-4" />

      {/* Loading */}
      {loading && admins.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400 text-sm">Loading tenant admins...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && admins.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16">
          <div className="text-slate-400 text-sm">No tenant admins found</div>
        </div>
      )}

      {/* Table */}
      {admins.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-semibold">
                        {admin.firstName.charAt(0)}
                        {admin.lastName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-900">
                        {admin.firstName} {admin.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{admin.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        admin.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(admin.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {admin.id !== user?.id && (
                      <button
                        onClick={() => handleToggleActive(admin)}
                        className={`text-xs font-medium px-3 py-1 rounded-lg border cursor-pointer ${
                          admin.isActive
                            ? 'text-red-600 border-red-200 hover:bg-red-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {admin.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                    {admin.id === user?.id && <span className="text-xs text-slate-400">You</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
              <span>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadAdmins(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadAdmins(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <CreateTenantAdminModal
        open={showCreate}
        saving={saving}
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
      />
    </div>
  );
}
