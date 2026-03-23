import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { BedOccupancyData } from '../hooks/use-reports';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];

interface Props {
  data: BedOccupancyData;
}

export function BedOccupancyReport({ data }: Props): React.ReactElement {
  const locations = data.byLocation ?? [];
  const donutData = [
    { name: 'Occupied', value: data.occupiedBeds ?? 0 },
    { name: 'Available', value: data.availableBeds ?? 0 },
    { name: 'Maintenance', value: data.maintenanceBeds ?? 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Beds" value={data.totalBeds ?? 0} />
        <StatCard label="Occupied" value={data.occupiedBeds ?? 0} />
        <StatCard label="Available" value={data.availableBeds ?? 0} />
        <StatCard label="Avg Length of Stay" value={`${data.averageLengthOfStay ?? 0} days`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Occupancy Rate: {data.occupancyRate ?? 0}%
          </h3>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No bed data</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">By Location</h3>
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {locations.length > 0 ? (
              locations.map((loc) => (
                <div key={loc.locationName} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{loc.locationName}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${loc.rate}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500 w-16 text-right">
                      {loc.occupied}/{loc.total} ({loc.rate}%)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No locations</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
