import type {
  Medication,
  MedicationRequest,
  MedicationAdministration,
  Patient,
  User,
} from '@prisma/client';
import type { FhirMedicationRequest, FhirMedicationAdministration, FhirBundle } from '@care/shared';

export type PrescriptionWithRelations = MedicationRequest & {
  medication: Pick<Medication, 'id' | 'name' | 'form' | 'strength'>;
  patient: Pick<Patient, 'id' | 'givenName' | 'familyName'>;
  prescriber: Pick<User, 'id' | 'firstName' | 'lastName'>;
  administrations?: (MedicationAdministration & {
    performer: Pick<User, 'id' | 'firstName' | 'lastName'>;
  })[];
};

const STATUS_MAP: Record<string, FhirMedicationRequest['status']> = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ON_HOLD: 'on-hold',
  COMPLETED: 'completed',
  STOPPED: 'stopped',
  CANCELLED: 'cancelled',
  ENTERED_IN_ERROR: 'entered-in-error',
};

const ADMIN_STATUS_MAP: Record<string, FhirMedicationAdministration['status']> = {
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  NOT_DONE: 'not-done',
  ENTERED_IN_ERROR: 'entered-in-error',
};

export function toFhirMedicationRequest(rx: PrescriptionWithRelations): FhirMedicationRequest {
  const administrations: FhirMedicationAdministration[] | undefined = rx.administrations?.map(
    (admin) => ({
      resourceType: 'MedicationAdministration' as const,
      id: admin.id,
      status: ADMIN_STATUS_MAP[admin.status] ?? 'completed',
      medicationReference: {
        reference: `Medication/${rx.medication.id}`,
        display: rx.medication.name,
      },
      subject: {
        reference: `Patient/${rx.patient.id}`,
        display: `${rx.patient.givenName} ${rx.patient.familyName}`,
      },
      effectiveDateTime: admin.occurredAt.toISOString(),
      performer: [
        {
          actor: {
            reference: `User/${admin.performer.id}`,
            display: `${admin.performer.firstName} ${admin.performer.lastName}`,
          },
        },
      ],
      request: { reference: `MedicationRequest/${rx.id}` },
      dosage: admin.doseGiven
        ? {
            text: admin.doseGiven,
            route: admin.route ? { text: admin.route } : undefined,
            site: admin.site ? { text: admin.site } : undefined,
          }
        : undefined,
      note: admin.notes ?? undefined,
      statusReason: admin.notGivenReason ? [{ text: admin.notGivenReason }] : undefined,
    }),
  );

  return {
    resourceType: 'MedicationRequest',
    id: rx.id,
    meta: { lastUpdated: rx.updatedAt.toISOString() },
    status: STATUS_MAP[rx.status] ?? 'draft',
    intent: 'order',
    priority: rx.priority as FhirMedicationRequest['priority'],
    medicationReference: {
      reference: `Medication/${rx.medication.id}`,
      display: `${rx.medication.name}${rx.medication.strength ? ` ${rx.medication.strength}` : ''}`,
    },
    subject: {
      reference: `Patient/${rx.patient.id}`,
      display: `${rx.patient.givenName} ${rx.patient.familyName}`,
    },
    requester: {
      reference: `User/${rx.prescriber.id}`,
      display: `${rx.prescriber.firstName} ${rx.prescriber.lastName}`,
    },
    reasonCode: rx.reasonText ? [{ text: rx.reasonText }] : undefined,
    dosageInstruction: [
      {
        text: rx.dosageText,
        route: { text: rx.route },
        doseAndRate: rx.dose ? [{ doseQuantity: { unit: rx.dose } }] : undefined,
        asNeededBoolean: rx.asNeeded || undefined,
        timing: rx.frequency ? { code: { text: rx.frequency } } : undefined,
        maxDosePerPeriod: rx.maxDosePerDay
          ? {
              numerator: { unit: rx.maxDosePerDay },
              denominator: { value: 1, unit: 'day' },
            }
          : undefined,
      },
    ],
    dispenseRequest: {
      validityPeriod: {
        start: rx.startDate.toISOString().split('T')[0],
        end: rx.endDate?.toISOString().split('T')[0],
      },
    },
    note: rx.instructions ?? undefined,
    // Attach administrations as extension-like data
    ...(administrations?.length ? { contained: administrations } : {}),
  } as FhirMedicationRequest & { contained?: FhirMedicationAdministration[] };
}

export function toFhirMedicationRequestBundle(
  requests: PrescriptionWithRelations[],
  total: number,
): FhirBundle<FhirMedicationRequest> {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total,
    entry: requests.map((rx) => ({
      fullUrl: `MedicationRequest/${rx.id}`,
      resource: toFhirMedicationRequest(rx),
      search: { mode: 'match' as const },
    })),
  };
}
