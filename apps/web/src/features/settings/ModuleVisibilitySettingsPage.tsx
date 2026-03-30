import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api-client';
import { useAuth } from '../../hooks/use-auth';
import { ErrorAlert } from '../../components/ErrorAlert';
import { MODULE_DEFINITIONS, getDefaultModules, type ModuleCode } from '@care/shared';

export function ModuleVisibilitySettingsPage(): React.ReactElement {
  const { selectedTenant, selectTenant } = useAuth();
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const orgType = selectedTenant?.type ?? 'OTHER';
  const defaults = getDefaultModules(orgType);

  const fetchModules = useCallback(async () => {
    if (!selectedTenant) return;
    setLoading(true);
    try {
      const modules = await api.get<string[]>(`/organizations/${selectedTenant.id}/modules`);
      setEnabledModules(new Set(modules));
    } catch {
      setError('Failed to load module settings');
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleToggle = (code: ModuleCode) => {
    setEnabledModules((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
    setSuccess('');
  };

  const handleResetDefaults = () => {
    setEnabledModules(new Set(defaults));
    setSuccess('');
  };

  const handleSave = async () => {
    if (!selectedTenant) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.patch(`/organizations/${selectedTenant.id}`, {
        enabledModules: Array.from(enabledModules),
      });
      // Refresh tenant context so nav updates immediately
      await selectTenant({ ...selectedTenant, enabledModules: Array.from(enabledModules) });
      setSuccess('Module visibility updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const isDefault = (code: ModuleCode): boolean => defaults.includes(code);

  // Group modules by category for better organization
  const categories = [
    {
      label: 'Clinical',
      modules: MODULE_DEFINITIONS.filter((m) =>
        ['PATIENTS', 'CARE_PLANS', 'MEDICATIONS', 'ASSESSMENTS'].includes(m.code),
      ),
    },
    {
      label: 'Workforce',
      modules: MODULE_DEFINITIONS.filter((m) =>
        ['ROSTER', 'COMPLIANCE', 'TRAINING'].includes(m.code),
      ),
    },
    {
      label: 'Specialist',
      modules: MODULE_DEFINITIONS.filter((m) =>
        ['PATIENT_FLOW', 'CHC', 'VIRTUAL_WARDS'].includes(m.code),
      ),
    },
    {
      label: 'Operations',
      modules: MODULE_DEFINITIONS.filter((m) => ['REPORTS', 'BILLING'].includes(m.code)),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link to="/app/settings" className="text-sm text-accent hover:text-accent/80 no-underline">
          &larr; Back to Settings
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Module Visibility</h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose which features and modules are visible to your team
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      {success && (
        <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.label}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {category.label}
              </h2>
              <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                {category.modules.map((mod) => {
                  const enabled = enabledModules.has(mod.code);
                  const defaultForOrg = isDefault(mod.code);
                  return (
                    <div key={mod.code} className="flex items-center justify-between px-6 py-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{mod.label}</span>
                          {defaultForOrg && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                              Default
                            </span>
                          )}
                          {!defaultForOrg && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-400 font-medium">
                              Optional
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
                      </div>
                      <button
                        onClick={() => handleToggle(mod.code)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border-none ${
                          enabled ? 'bg-accent' : 'bg-slate-200'
                        }`}
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`Toggle ${mod.label}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
