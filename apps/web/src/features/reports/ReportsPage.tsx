import { useState, useEffect } from 'react';
import {
  useReports,
  type PatientCensusData,
  type BedOccupancyData,
  type WorkforceComplianceData,
  type CarePlanReviewsData,
  type ChcPipelineData,
  type VirtualWardsSummaryData,
} from './hooks/use-reports';
import { PatientCensusReport } from './components/PatientCensusReport';
import { BedOccupancyReport } from './components/BedOccupancyReport';
import { WorkforceComplianceReport } from './components/WorkforceComplianceReport';
import { CarePlanReviewsReport } from './components/CarePlanReviewsReport';
import { ChcPipelineReport } from './components/ChcPipelineReport';
import { VirtualWardsSummaryReport } from './components/VirtualWardsSummaryReport';
import { ErrorAlert } from '../../components/ErrorAlert';

type ReportType =
  | 'patient-census'
  | 'bed-occupancy'
  | 'workforce-compliance'
  | 'care-plan-reviews'
  | 'chc-pipeline'
  | 'virtual-wards-summary';

const REPORTS: { key: ReportType; label: string; hasDateRange: boolean }[] = [
  { key: 'patient-census', label: 'Patient Census', hasDateRange: true },
  { key: 'bed-occupancy', label: 'Bed Occupancy', hasDateRange: false },
  { key: 'workforce-compliance', label: 'Workforce Compliance', hasDateRange: true },
  { key: 'care-plan-reviews', label: 'Care Plan Reviews', hasDateRange: false },
  { key: 'chc-pipeline', label: 'CHC Pipeline', hasDateRange: false },
  { key: 'virtual-wards-summary', label: 'Virtual Wards', hasDateRange: false },
];

type ReportData =
  | PatientCensusData
  | BedOccupancyData
  | WorkforceComplianceData
  | CarePlanReviewsData
  | ChcPipelineData
  | VirtualWardsSummaryData;

export function ReportsPage(): React.ReactElement {
  const {
    getPatientCensus,
    getBedOccupancy,
    getWorkforceCompliance,
    getCarePlanReviews,
    getChcPipeline,
    getVirtualWardsSummary,
    downloadCsv,
  } = useReports();
  const [selected, setSelected] = useState<ReportType>('patient-census');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const selectedReport = REPORTS.find((r) => r.key === selected)!;

  useEffect(() => {
    setLoading(true);
    setError('');
    setData(null);

    const params = { startDate: startDate || undefined, endDate: endDate || undefined };

    const fetchers: Record<ReportType, () => Promise<ReportData>> = {
      'patient-census': () => getPatientCensus(params),
      'bed-occupancy': () => getBedOccupancy(),
      'workforce-compliance': () => getWorkforceCompliance(params),
      'care-plan-reviews': () => getCarePlanReviews(),
      'chc-pipeline': () => getChcPipeline(),
      'virtual-wards-summary': () => getVirtualWardsSummary(),
    };

    fetchers[selected]()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [
    selected,
    startDate,
    endDate,
    getPatientCensus,
    getBedOccupancy,
    getWorkforceCompliance,
    getCarePlanReviews,
    getChcPipeline,
    getVirtualWardsSummary,
  ]);

  const handleExport = () => {
    downloadCsv(selected, selected, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <button
          onClick={handleExport}
          disabled={!data}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm cursor-pointer hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none"
        >
          Export CSV
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {REPORTS.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelected(r.key)}
                className={`w-full text-left px-4 py-3 text-sm border-none cursor-pointer transition-colors ${
                  selected === r.key
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'bg-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {selectedReport.hasDateRange && (
            <div className="mt-4 bg-white rounded-xl border border-slate-100 p-4 space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <ErrorAlert message={error} className="mb-4" />

          {loading ? (
            <p className="text-slate-400 text-center py-12">Loading report...</p>
          ) : data ? (
            <>
              {selected === 'patient-census' && (
                <PatientCensusReport data={data as PatientCensusData} />
              )}
              {selected === 'bed-occupancy' && (
                <BedOccupancyReport data={data as BedOccupancyData} />
              )}
              {selected === 'workforce-compliance' && (
                <WorkforceComplianceReport data={data as WorkforceComplianceData} />
              )}
              {selected === 'care-plan-reviews' && (
                <CarePlanReviewsReport data={data as CarePlanReviewsData} />
              )}
              {selected === 'chc-pipeline' && <ChcPipelineReport data={data as ChcPipelineData} />}
              {selected === 'virtual-wards-summary' && (
                <VirtualWardsSummaryReport data={data as VirtualWardsSummaryData} />
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
