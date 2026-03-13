import type {
  Patient,
  PatientIdentifier,
  PatientContact,
  Organization,
  Practitioner,
} from '@prisma/client';
import type { FhirPatient, FhirBundle, FhirContactPoint } from '@care/shared';

export type PatientWithRelations = Patient & {
  identifiers: PatientIdentifier[];
  contacts: PatientContact[];
  managingOrganization?: Organization | null;
  gpPractitioner?: Practitioner | null;
};

function buildTelecom(phone?: string | null, email?: string | null): FhirContactPoint[] {
  const result: FhirContactPoint[] = [];
  if (phone) result.push({ system: 'phone', value: phone, use: 'home' });
  if (email) result.push({ system: 'email', value: email });
  return result;
}

export function toFhirPatient(patient: PatientWithRelations): FhirPatient {
  return {
    resourceType: 'Patient',
    id: patient.id,
    meta: { lastUpdated: patient.updatedAt.toISOString() },
    active: patient.active,
    identifier: patient.identifiers.map((id) => ({
      system: id.system,
      value: id.value,
      use: id.isPrimary ? ('official' as const) : ('usual' as const),
    })),
    name: [
      {
        use: 'official' as const,
        family: patient.familyName,
        given: patient.middleName ? [patient.givenName, patient.middleName] : [patient.givenName],
        prefix: patient.prefix ? [patient.prefix] : undefined,
      },
    ],
    gender: patient.gender.toLowerCase() as 'male' | 'female' | 'other' | 'unknown',
    birthDate: patient.birthDate.toISOString().split('T')[0],
    deceasedDateTime: patient.deceasedDate?.toISOString(),
    telecom: buildTelecom(patient.phone, patient.email),
    address: patient.addressLine1
      ? [
          {
            use: 'home' as const,
            line: [patient.addressLine1, patient.addressLine2].filter(
              (l): l is string => l !== null && l !== undefined,
            ),
            city: patient.city ?? undefined,
            district: patient.district ?? undefined,
            postalCode: patient.postalCode ?? undefined,
            country: patient.country ?? undefined,
          },
        ]
      : undefined,
    contact: patient.contacts.length
      ? patient.contacts.map((c) => ({
          relationship: [{ text: c.relationship }],
          name: { family: c.familyName, given: [c.givenName] },
          telecom: buildTelecom(c.phone, c.email),
        }))
      : undefined,
    managingOrganization: patient.managingOrganization
      ? {
          reference: `Organization/${patient.managingOrganization.id}`,
          display: patient.managingOrganization.name,
        }
      : undefined,
    generalPractitioner: patient.gpPractitioner
      ? [
          {
            reference: `Practitioner/${patient.gpPractitioner.id}`,
            display: `${patient.gpPractitioner.givenName} ${patient.gpPractitioner.familyName}`,
          },
        ]
      : undefined,
  };
}

export function toFhirPatientBundle(
  patients: PatientWithRelations[],
  total: number,
): FhirBundle<FhirPatient> {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total,
    entry: patients.map((p) => ({
      fullUrl: `Patient/${p.id}`,
      resource: toFhirPatient(p),
      search: { mode: 'match' as const },
    })),
  };
}
