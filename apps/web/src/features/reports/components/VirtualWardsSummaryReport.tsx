import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { VirtualWardsSummaryData } from '../hooks/use-reports';

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

interface Props {
  data: VirtualWardsSummaryData;
}

export function VirtualWardsSummaryReport({ data }: Props): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Enrolled</p>
          <p className="text-3xl font-bold text-accent">{data.enrolledCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Discharged</p>
          <p className="text-3xl font-bold text-slate-500">{data.dischargedCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Total Alerts</p>
          <p className="text-3xl font-bold text-red-500">{data.alertsTotal ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Observations</p>
          <p className="text-3xl font-bold text-slate-900">
            {(data.totalObservations ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Alerts by Severity</h3>
          {(data.alertsBySeverity ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.alertsBySeverity}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ severity }: { severity: string }) => severity}
                  labelLine={false}
                >
                  {(data.alertsBySeverity ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No alerts</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Alerts by Status</h3>
          <div className="space-y-3">
            {(data.alertsByStatus ?? []).map((a) => (
              <div key={a.status} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{a.status}</span>
                <span className="text-sm font-medium text-slate-900">{a.count}</span>
              </div>
            ))}
            {(data.alertsByStatus ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No alerts</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
