export interface PatientSummary {
  id: string;
  nhsNumber?: string;
  givenName: string;
  middleName?: string;
  familyName: string;
  gender: string;
  birthDate: string;
  status: string;
  managingOrganization?: string;
}

export interface PatientTimelineEntry {
  id: string;
  eventType: string;
  summary: string;
  detail?: Record<string, unknown>;
  careSetting?: string;
  occurredAt: string;
  recordedBy: { id: string; firstName: string; lastName: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
