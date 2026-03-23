import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { CarePlanReviewsData } from '../hooks/use-reports';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5'];

interface Props {
  data: CarePlanReviewsData;
}

export function CarePlanReviewsReport({ data }: Props): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Active Plans</p>
          <p className="text-3xl font-bold text-slate-900">{data.totalActivePlans ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Overdue Reviews</p>
          <p className="text-3xl font-bold text-red-500">{(data.overdueReviews ?? []).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Upcoming (14 days)</p>
          <p className="text-3xl font-bold text-amber-500">{(data.upcomingReviews ?? []).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">By Category</h3>
          {(data.byCategory ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.byCategory}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ category }: any) => category}
                  labelLine={false}
                >
                  {(data.byCategory ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No data</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">By Status</h3>
          <div className="space-y-2">
            {(data.byStatus ?? []).map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{s.status}</span>
                <span className="text-sm font-medium text-slate-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(data.overdueReviews ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-red-600 mb-4">Overdue Reviews</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-500 font-medium">Plan</th>
                <th className="text-left py-2 text-slate-500 font-medium">Patient</th>
                <th className="text-left py-2 text-slate-500 font-medium">Due Date</th>
                <th className="text-right py-2 text-slate-500 font-medium">Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              {(data.overdueReviews ?? []).map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">{r.title}</td>
                  <td className="py-2 text-slate-700">{r.patientName}</td>
                  <td className="py-2 text-slate-700">{r.nextReviewDate}</td>
                  <td className="py-2 text-right text-red-500 font-medium">{r.daysOverdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
