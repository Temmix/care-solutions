import type { Practitioner, Organization } from '@prisma/client';
import type { FhirPractitioner } from '@care/shared';

type PractitionerWithOrg = Practitioner & { organization?: Organization | null };

export function toFhirPractitioner(p: PractitionerWithOrg): FhirPractitioner {
  return {
    resourceType: 'Practitioner',
    id: p.id,
    meta: { lastUpdated: p.updatedAt.toISOString() },
    active: p.active,
    name: [
      {
        use: 'official',
        family: p.familyName,
        given: [p.givenName],
      },
    ],
    gender: p.gender
      ? (p.gender.toLowerCase() as 'male' | 'female' | 'other' | 'unknown')
      : undefined,
    telecom: [
      p.phone ? { system: 'phone' as const, value: p.phone } : null,
      p.email ? { system: 'email' as const, value: p.email } : null,
    ].filter((t): t is NonNullable<typeof t> => t !== null),
    qualification: p.specialty
      ? [
          {
            code: { text: p.specialty },
            identifier: p.registrationNumber ? [{ value: p.registrationNumber }] : undefined,
          },
        ]
      : undefined,
  };
}
