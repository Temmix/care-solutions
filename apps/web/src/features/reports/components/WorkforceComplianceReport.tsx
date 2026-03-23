import type { WorkforceComplianceData } from '../hooks/use-reports';

interface Props {
  data: WorkforceComplianceData;
}

export function WorkforceComplianceReport({ data }: Props): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Fill Rate</p>
          <p className="text-3xl font-bold text-slate-900">{data.fillRate ?? 0}%</p>
          <div className="mt-2 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${(data.fillRate ?? 0) >= 80 ? 'bg-green-500' : (data.fillRate ?? 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${data.fillRate ?? 0}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Shifts Filled</p>
          <p className="text-3xl font-bold text-slate-900">
            {data.filledShifts ?? 0}/{data.totalShifts ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400">Avg Assignments/Shift</p>
          <p className="text-3xl font-bold text-slate-900">
            {data.averageAssignmentsPerShift ?? 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Upcoming Gaps (Next 7 Days)</h3>
        {(data.upcomingGaps ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No upcoming gaps</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-500 font-medium">Date</th>
                <th className="text-left py-2 text-slate-500 font-medium">Shift Type</th>
              </tr>
            </thead>
            <tbody>
              {(data.upcomingGaps ?? []).map((gap, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">
                    {new Date(gap.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td className="py-2 text-slate-700">{gap.shiftType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
