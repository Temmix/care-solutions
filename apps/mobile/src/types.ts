/**
 * Client-side mirrors of the Clinvara API contracts the mobile app consumes.
 *
 * NOTE: these intentionally duplicate a subset of `@care/shared` /  the Prisma
 * models. Wiring the workspace package into Metro (watchFolders + transpile of
 * the TS source) is a follow-up; until then these keep the app self-contained.
 * Keep them in sync with apps/api when the corresponding endpoints change.
 */

export type Role =
  | 'TENANT_ADMIN'
  | 'ADMIN'
  | 'CLINICIAN'
  | 'NURSE'
  | 'CARER'
  | 'PATIENT'
  | 'SYSTEM';

export interface Membership {
  organizationId: string;
  role: Role;
  organization: { id: string; name: string; type: string };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  memberships: Membership[];
  mustChangePassword?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export type ClockRecordStatus = 'CLOCKED_IN' | 'CLOCKED_OUT' | 'AUTO_CLOCKED_OUT';

export interface ClockRecord {
  id: string;
  status: ClockRecordStatus;
  clockInAt: string;
  clockOutAt: string | null;
  clockInDistance: number | null;
  autoClockOut: boolean;
}

export interface ShiftLocation {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number | null;
}

export interface ShiftPattern {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
}

export interface Shift {
  id: string;
  date: string;
  status: string;
  shiftPattern: ShiftPattern;
  location: ShiftLocation | null;
}

/** Shape returned by GET /api/shifts/my-today (array of assignments). */
export interface TodayAssignment {
  id: string;
  userId: string;
  role: Role;
  shift: Shift;
  clockRecord: ClockRecord | null;
}

export interface ShiftAssignmentSummary {
  id: string;
  role: string | null;
  user: { id: string; firstName: string; lastName: string; role: Role };
}

/** A shift as returned by GET /api/shifts (includes all assignments). */
export interface RosterShift extends Shift {
  assignments: ShiftAssignmentSummary[];
}

/** Paginated envelope from GET /api/shifts. */
export interface ShiftListResponse {
  data: RosterShift[];
  total: number;
  page: number;
  limit: number;
}

export type TrainingPriority = 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
export type TrainingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'OVERDUE';

export interface TrainingCertificate {
  id: string;
  name: string;
  issuer: string;
  certificateNumber: string | null;
  issueDate: string;
  expiryDate: string | null;
}

/** A record from GET /api/training/me (the worker's own training). */
export interface TrainingRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: TrainingPriority;
  status: TrainingStatus;
  provider: string | null;
  completedDate: string | null;
  expiryDate: string | null;
  score: number | null;
  notes: string | null;
  certificates: TrainingCertificate[];
}

export type AvailabilityType =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'ANNUAL_LEAVE'
  | 'SICK_LEAVE'
  | 'TRAINING';

/** A record from GET /api/availability/me. */
export interface Availability {
  id: string;
  date: string;
  endDate: string | null;
  type: AvailabilityType;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
}

export type SwapStatus = 'PENDING' | 'ACCEPTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

interface SwapPerson {
  id: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

/** A shift assignment as embedded in a swap request. */
export interface SwapAssignmentRef {
  id: string;
  shift: {
    id: string;
    date: string;
    shiftPattern: { name: string; startTime: string; endTime: string };
    location: { name: string } | null;
  };
}

/** A swap request from GET /api/swaps (open) or /api/swaps/mine. */
export interface SwapRequest {
  id: string;
  status: SwapStatus;
  reason: string | null;
  requester: SwapPerson;
  responder?: SwapPerson | null;
  originalShiftAssignment: SwapAssignmentRef;
  targetShiftAssignment?: SwapAssignmentRef | null;
}

/** A minimal "one of my upcoming shifts" entry for swap pickers. */
export interface MyAssignmentOption {
  assignmentId: string;
  date: string;
  label: string;
}
