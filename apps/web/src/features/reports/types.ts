export type ShiftReportCategory =
  | 'GENERAL_NOTE'
  | 'PERSONAL_CARE'
  | 'NUTRITION_HYDRATION'
  | 'CONTINENCE'
  | 'MOBILITY'
  | 'MOOD_BEHAVIOUR'
  | 'SLEEP'
  | 'INCIDENT'
  | 'SAFEGUARDING';

export type ShiftReportPriority = 'NORMAL' | 'CONCERN' | 'URGENT';

export const CATEGORY_OPTIONS: { value: ShiftReportCategory; label: string }[] = [
  { value: 'GENERAL_NOTE', label: 'General' },
  { value: 'PERSONAL_CARE', label: 'Personal care' },
  { value: 'NUTRITION_HYDRATION', label: 'Food & fluids' },
  { value: 'CONTINENCE', label: 'Continence' },
  { value: 'MOBILITY', label: 'Mobility' },
  { value: 'MOOD_BEHAVIOUR', label: 'Mood & behaviour' },
  { value: 'SLEEP', label: 'Sleep' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'SAFEGUARDING', label: 'Safeguarding' },
];

export const PRIORITY_OPTIONS: { value: ShiftReportPriority; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'CONCERN', label: 'Concern' },
  { value: 'URGENT', label: 'Urgent' },
];

export const CATEGORY_LABELS: Record<ShiftReportCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
) as Record<ShiftReportCategory, string>;

/** A patient the worker may report on, from GET /shift-reports/context. */
export interface ShiftContextPatient {
  patientId: string;
  name: string;
  encounterId: string | null;
  bedId: string | null;
  bed: string | null;
}

/** GET /shift-reports/context response. */
export interface ShiftContext {
  onShift: boolean;
  shiftAssignmentId?: string;
  shift?: {
    id: string;
    date: string;
    pattern: { name: string; startTime: string; endTime: string };
  };
  location?: { id: string; name: string; type: string } | null;
  reportingClosesAt?: string;
  patients?: ShiftContextPatient[];
}

/** A report row from GET /shift-reports. */
export interface ShiftReport {
  id: string;
  category: ShiftReportCategory;
  priority: ShiftReportPriority;
  content: string;
  patientId: string;
  recordedAt: string;
  patient?: { id: string; givenName: string; familyName: string } | null;
  location?: { id: string; name: string; type: string } | null;
  bed?: { id: string; identifier: string } | null;
  recordedBy?: { id: string; firstName: string; lastName: string; role: string } | null;
}

export interface ShiftReportListResponse {
  data: ShiftReport[];
  total: number;
  page: number;
  limit: number;
}

export interface NewShiftReport {
  patientId: string;
  category: ShiftReportCategory;
  priority: ShiftReportPriority;
  content: string;
}
