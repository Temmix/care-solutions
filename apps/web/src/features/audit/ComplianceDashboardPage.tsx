import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useAuditLogs, type ComplianceSummary } from './hooks/use-audit-logs';
import { ErrorAlert } from '../../components/ErrorAlert';

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a78bfa',
  '#c4b5fd',
  '#818cf8',
  '#4f46e5',
  '#7c3aed',
  '#5b21b6',
];

const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
] as const;

export function ComplianceDashboardPage(): React.ReactElement {
  const { getComplianceSummary } = useAuditLogs();
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    setError('');
    const startDate = new Date(Date.now() - rangeDays * 86400000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    getComplianceSummary(startDate, endDate)
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [getComplianceSummary, rangeDays]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            to="/app/audit"
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
            Back to Audit Log
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Dashboard</h1>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer transition-colors ${
                rangeDays === r.days
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {loading && !summary ? (
        <p className="text-slate-400 text-center py-12">Loading...</p>
      ) : summary ? (
        <>
          {/* Stat card */}
          <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
            <p className="text-sm text-slate-400">Total Actions</p>
            <p className="text-3xl font-bold text-slate-900">
              {summary.totalActions.toLocaleString()}
            </p>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Actions per day */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="text-sm font-medium text-slate-700 mb-4">Actions Per Day</h2>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={summary.actionsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d: string) =>
                      new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    }
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(d) =>
                      new Date(String(d)).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.15}
                    name="Actions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Resource breakdown */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="text-sm font-medium text-slate-700 mb-4">By Resource</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={summary.resourceBreakdown}
                    dataKey="count"
                    nameKey="resource"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(props) => String(props.name ?? '')}
                    labelLine={false}
                  >
                    {summary.resourceBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top users */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="text-sm font-medium text-slate-700 mb-4">Top Users</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={summary.topUsers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" name="Actions" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Action type breakdown */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="text-sm font-medium text-slate-700 mb-4">By Action Type</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={summary.actionBreakdown}
                    dataKey="count"
                    nameKey="action"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(props) => String(props.name ?? '')}
                    labelLine={false}
                  >
                    {summary.actionBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
