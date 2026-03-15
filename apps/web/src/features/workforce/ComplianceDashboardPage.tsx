import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useWorkforce, ComplianceReport } from './hooks/use-workforce';

const COLORS = ['#22c55e', '#ef4444'];

export function ComplianceDashboardPage(): React.ReactElement {
  const { loading, error, getComplianceReport } = useWorkforce();
  const [report, setReport] = useState<ComplianceReport | null>(null);

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [from, setFrom] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [to, setTo] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    if (from && to) {
      getComplianceReport(from, to)
        .then(setReport)
        .catch(() => {});
    }
  }, [from, to, getComplianceReport]);

  if (loading && !report) return <p className="text-gray-500">Loading compliance data...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <div className="flex gap-3 items-center">
          <label className="text-sm text-gray-600">From:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <label className="text-sm text-gray-600">To:</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard label="Total Staff" value={report.summary.totalStaff} />
            <SummaryCard label="Total Shifts" value={report.summary.totalShifts} />
            <SummaryCard label="Hours Scheduled" value={report.summary.totalHoursScheduled} />
            <SummaryCard
              label="Violations"
              value={report.summary.violationCount}
              color={report.summary.violationCount > 0 ? 'text-red-600' : 'text-green-600'}
            />
            <SummaryCard
              label="Compliance Score"
              value={`${report.summary.complianceScore}%`}
              color={report.summary.complianceScore >= 80 ? 'text-green-600' : 'text-red-600'}
            />
          </div>

          {/* Compliance Score Pie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Compliance Score</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Compliant', value: report.summary.complianceScore },
                      { name: 'Violations', value: 100 - report.summary.complianceScore },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    <Cell fill={COLORS[0]} />
                    <Cell fill={COLORS[1]} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Staffing by Location */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Avg Staff per Shift by Location</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={report.staffingByLocation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="locationName" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgStaffPerShift" fill="#3b82f6" name="Avg Staff/Shift" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Violations */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Working Time Violations</h3>
            {report.summary.violationCount === 0 ? (
              <p className="text-green-600 text-sm">No violations found in this period.</p>
            ) : (
              <div className="space-y-4">
                {report.workingTimeViolations.weeklyHoursExceeded.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-1">
                      Weekly Hours Exceeded (max {48}h)
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {report.workingTimeViolations.weeklyHoursExceeded.map((v, i) => (
                        <li key={i}>
                          {v.name}: {v.hours}h in week of {v.weekStart}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.workingTimeViolations.insufficientRest.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-1">
                      Insufficient Rest (min 11h)
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {report.workingTimeViolations.insufficientRest.map((v, i) => (
                        <li key={i}>
                          {v.name}: only {v.restHours}h rest on {v.date}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.workingTimeViolations.consecutiveDaysExceeded.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-1">
                      Consecutive Days Exceeded (max {6})
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {report.workingTimeViolations.consecutiveDaysExceeded.map((v, i) => (
                        <li key={i}>
                          {v.name}: {v.days} consecutive days from {v.startDate}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Overtime */}
          {report.overtimeHours.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Overtime Hours</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={report.overtimeHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="scheduledHours" fill="#3b82f6" name="Scheduled" />
                  <Bar dataKey="overtimeHours" fill="#ef4444" name="Overtime" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}): React.ReactElement {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
