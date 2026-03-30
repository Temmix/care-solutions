import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, type NotificationPreference } from './hooks/use-notifications';
import { ErrorAlert } from '../../components/ErrorAlert';

const EVENT_GROUPS = [
  {
    label: 'Workforce',
    types: [
      { key: 'SHIFT_SWAP_REQUEST', label: 'Shift Swap Request' },
      { key: 'SHIFT_SWAP_RESPONSE', label: 'Shift Swap Response' },
      { key: 'SHIFT_SWAP_APPROVED', label: 'Shift Swap Approved' },
      { key: 'SHIFT_SWAP_REJECTED', label: 'Shift Swap Rejected' },
      { key: 'SHIFT_SWAP_CANCELLED', label: 'Shift Swap Cancelled' },
      { key: 'SHIFT_SWAP_NEEDS_APPROVAL', label: 'Shift Swap Needs Approval' },
      { key: 'SHIFT_GAP_DETECTED', label: 'Shift Gap Detected' },
    ],
  },
  {
    label: 'Patient Flow',
    types: [
      { key: 'PATIENT_ADMITTED', label: 'Patient Admitted' },
      { key: 'PATIENT_DISCHARGED', label: 'Patient Discharged' },
      { key: 'PATIENT_TRANSFERRED', label: 'Patient Transferred' },
      { key: 'DISCHARGE_PLAN_READY', label: 'Discharge Plan Ready' },
    ],
  },
  {
    label: 'Training',
    types: [
      { key: 'TRAINING_ASSIGNED', label: 'Training Assigned' },
      { key: 'TRAINING_EXPIRING', label: 'Training Expiring' },
    ],
  },
  {
    label: 'Billing',
    types: [
      { key: 'TRIAL_EXPIRING', label: 'Trial Expiring' },
      { key: 'SUBSCRIPTION_CHANGED', label: 'Subscription Changed' },
    ],
  },
  {
    label: 'Virtual Wards',
    types: [
      { key: 'VW_THRESHOLD_BREACH', label: 'Threshold Breach' },
      { key: 'VW_ALERT_ESCALATED', label: 'Alert Escalated' },
    ],
  },
  {
    label: 'CHC',
    types: [
      { key: 'CHC_STATUS_CHANGE', label: 'Status Change' },
      { key: 'CHC_REVIEW_DUE', label: 'Review Due' },
    ],
  },
  {
    label: 'Care Plans',
    types: [{ key: 'CARE_PLAN_REVIEW_DUE', label: 'Review Due' }],
  },
  {
    label: 'IoT',
    types: [{ key: 'DEVICE_BATTERY_LOW', label: 'Device Battery Low' }],
  },
];

const ALL_EVENT_TYPES = EVENT_GROUPS.flatMap((g) => g.types);

const CHANNELS = ['IN_APP', 'EMAIL'] as const;

type PreferenceMap = Record<string, boolean>;

function buildKey(eventType: string, channel: string): string {
  return `${eventType}:${channel}`;
}

export function NotificationPreferencesPage(): React.ReactElement {
  const { getPreferences, updatePreferences } = useNotifications();
  const [prefs, setPrefs] = useState<PreferenceMap>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPreferences()
      .then((data: NotificationPreference[]) => {
        const map: PreferenceMap = {};
        // Default everything to enabled
        for (const et of ALL_EVENT_TYPES) {
          for (const ch of CHANNELS) {
            map[buildKey(et.key, ch)] = true;
          }
        }
        // Override with saved preferences
        for (const p of data) {
          map[buildKey(p.eventType, p.channel)] = p.enabled;
        }
        setPrefs(map);
      })
      .catch(() => {});
  }, [getPreferences]);

  const toggle = (eventType: string, channel: string) => {
    const key = buildKey(eventType, channel);
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const preferences = Object.entries(prefs).map(([key, enabled]) => {
        const [eventType, channel] = key.split(':');
        return { eventType, channel, enabled };
      });
      await updatePreferences(preferences);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          to="/app/notifications"
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
          Back to Notifications
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Notification Preferences</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose which notifications you receive and how.
        </p>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 font-medium text-slate-400">Event Type</th>
              {CHANNELS.map((ch) => (
                <th key={ch} className="px-4 py-3 font-medium text-slate-400 text-center w-24">
                  {ch === 'IN_APP' ? 'In-App' : 'Email'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENT_GROUPS.map((group) => (
              <>
                <tr key={group.label} className="border-b border-slate-100 bg-slate-50/50">
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {group.label}
                  </td>
                </tr>
                {group.types.map((et) => (
                  <tr key={et.key} className="border-b border-slate-50">
                    <td className="px-4 py-3 text-slate-700 pl-6">{et.label}</td>
                    {CHANNELS.map((ch) => {
                      const key = buildKey(et.key, ch);
                      const enabled = prefs[key] ?? true;
                      return (
                        <td key={ch} className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggle(et.key, ch)}
                            className={`w-10 h-5 rounded-full relative cursor-pointer border-none transition-colors ${
                              enabled ? 'bg-accent' : 'bg-slate-200'
                            }`}
                            aria-label={`${et.label} ${ch}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                enabled ? 'left-5' : 'left-0.5'
                              }`}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved successfully</span>}
      </div>
    </div>
  );
}
