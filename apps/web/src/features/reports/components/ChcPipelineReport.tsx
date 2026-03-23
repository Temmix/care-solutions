import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChcPipelineData } from '../hooks/use-reports';

interface Props {
  data: ChcPipelineData;
}

export function ChcPipelineReport({ data }: Props): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Total Cases</p>
          <p className="text-3xl font-bold text-slate-900">{data.totalCases ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Fast Track</p>
          <p className="text-3xl font-bold text-amber-500">{data.fastTrackCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Approval Rate</p>
          <p className="text-3xl font-bold text-green-600">{data.approvalRate ?? 0}%</p>
        </div>
      </div>

      {(data.byStatus ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Cases by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" name="Cases" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
