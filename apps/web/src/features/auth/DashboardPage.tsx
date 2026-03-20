import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api-client';
import { useAuth } from '../../hooks/use-auth';

interface DashboardStats {
  counts: {
    patients: number;
    users: number;
    practitioners: number;
    events: number;
    shifts: number;
    encounters: number;
    availableBeds: number;
  };
  recentPatients: {
    id: string;
    name: string;
    gender: string;
    birthDate: string;
    createdAt: string;
  }[];
  recentEvents: {
    id: string;
    eventType: string;
    summary: string;
    occurredAt: string;
    patientName: string;
    recordedBy: string;
  }[];
  genderBreakdown: { gender: string; count: number }[];
}

const eventTypeStyles: Record<string, string> = {
  CREATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATED: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMISSION: 'bg-orange-50 text-orange-700 border-orange-200',
  DISCHARGE: 'bg-purple-50 text-purple-700 border-purple-200',
  NOTE: 'bg-slate-50 text-slate-700 border-slate-200',
  ASSESSMENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DEMOGRAPHIC_CHANGE: 'bg-amber-50 text-amber-700 border-amber-200',
};

const genderColors: Record<string, string> = {
  MALE: 'bg-blue-500',
  FEMALE: 'bg-pink-500',
  OTHER: 'bg-purple-500',
  UNKNOWN: 'bg-slate-400',
};

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500 mb-1">{label}</div>
          <div className="text-3xl font-bold text-slate-900">{value}</div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage(): React.ReactElement {
  const { user, isSuperAdmin, selectedTenant } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) {
      setLoading(false);
      return;
    }
    api
      .get<DashboardStats>('/dashboard/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSuperAdmin, selectedTenant]);

  const tenantLabel = isSuperAdmin
    ? selectedTenant
      ? selectedTenant.name
      : null
    : user?.tenant?.name;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
        <p className="text-slate-500 text-sm">
          Welcome back, {user?.firstName}.
          {tenantLabel ? ` Managing ${tenantLabel}.` : ' Select a tenant to view stats.'}
        </p>
      </div>

      {/* Super admin no tenant */}
      {isSuperAdmin && !selectedTenant && (
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
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No tenant selected</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Select a tenant to view dashboard statistics and manage their data.
          </p>
          <Link
            to="/app/tenants"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
          >
            Select a Tenant
          </Link>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400 text-sm">Loading stats...</div>
        </div>
      )}

      {stats && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Active Patients"
              value={stats.counts.patients}
              icon={
                <svg
                  className="w-5 h-5"
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
              }
            />
            <StatCard
              label="Practitioners"
              value={stats.counts.practitioners}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Users"
              value={stats.counts.users}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Timeline Events"
              value={stats.counts.events}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              }
            />
          </div>

          {/* Phase 3 stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Shifts This Week"
              value={stats.counts.shifts}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  />
                </svg>
              }
            />
            <StatCard
              label="Active Encounters"
              value={stats.counts.encounters}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              }
            />
            <StatCard
              label="Available Beds"
              value={stats.counts.availableBeds}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                  />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent patients — 2 cols */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Recent Patients</h2>
                <Link
                  to="/app/patients"
                  className="text-xs text-accent font-medium no-underline hover:text-accent-dark transition-colors"
                >
                  View all
                </Link>
              </div>
              {stats.recentPatients.length === 0 && (
                <div className="px-6 py-10 text-center text-slate-400 text-sm">No patients yet</div>
              )}
              <div className="divide-y divide-slate-50">
                {stats.recentPatients.map((p) => (
                  <Link
                    key={p.id}
                    to={`/patients/${p.id}`}
                    className="flex items-center justify-between px-6 py-3.5 no-underline hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-semibold">
                        {p.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-400">
                          {p.gender.toLowerCase()} &middot; DOB {p.birthDate}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Demographics — 1 col */}
            <div className="bg-white rounded-xl border border-slate-100">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Patient Demographics</h2>
              </div>
              <div className="p-6">
                {stats.genderBreakdown.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-6">No data</div>
                )}
                <div className="space-y-4">
                  {stats.genderBreakdown.map((g) => {
                    const pct =
                      stats.counts.patients > 0
                        ? Math.round((g.count / stats.counts.patients) * 100)
                        : 0;
                    return (
                      <div key={g.gender}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-slate-600 capitalize">
                            {g.gender.toLowerCase()}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {g.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${genderColors[g.gender] ?? 'bg-slate-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-xl border border-slate-100 mb-8">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
            </div>
            {stats.recentEvents.length === 0 && (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">No activity yet</div>
            )}
            <div className="divide-y divide-slate-50">
              {stats.recentEvents.map((e) => (
                <div key={e.id} className="flex items-start gap-4 px-6 py-4">
                  <span
                    className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium border shrink-0 mt-0.5 ${eventTypeStyles[e.eventType] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    {e.eventType.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900 truncate">{e.summary}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {e.patientName} &middot; by {e.recordedBy} &middot;{' '}
                      {new Date(e.occurredAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase roadmap */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Platform Roadmap</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {[
                { title: 'EPR', status: 'Live', done: true },
                { title: 'Care Plans', status: 'Live', done: true },
                { title: 'EPMA', status: 'Live', done: true },
                { title: 'Workforce', status: 'Live', done: true },
                { title: 'Patient Flow', status: 'Live', done: true },
                { title: 'Analytics', status: 'Phase 6', done: false },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`p-4 rounded-xl border ${
                    item.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-900">{item.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
