import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PatientCensusData } from '../hooks/use-reports';

interface Props {
  data: PatientCensusData;
}

export function PatientCensusReport({ data }: Props): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active Patients" value={data.activePatients ?? 0} color="text-green-600" />
        <StatCard
          label="Inactive Patients"
          value={data.inactivePatients ?? 0}
          color="text-slate-500"
        />
        <StatCard
          label="Deceased Patients"
          value={data.deceasedPatients ?? 0}
          color="text-red-500"
        />
      </div>

      {(data.admissionsOverTime ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Admissions vs Discharges</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.admissionsOverTime}>
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
              <Legend />
              <Bar dataKey="admissions" fill="#6366f1" name="Admissions" radius={[4, 4, 0, 0]} />
              <Bar dataKey="discharges" fill="#f59e0b" name="Discharges" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}
