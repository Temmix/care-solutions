import type { Organization } from '@prisma/client';
import type { FhirOrganization, FhirBundle } from '@care/shared';

export function toFhirOrganization(org: Organization): FhirOrganization {
  return {
    resourceType: 'Organization',
    id: org.id,
    meta: { lastUpdated: org.updatedAt.toISOString() },
    active: org.active,
    name: org.name,
    type: [{ coding: [{ code: org.type, display: org.type }] }],
    identifier: org.odsCode
      ? [{ system: 'https://fhir.nhs.uk/Id/ods-organization-code', value: org.odsCode }]
      : undefined,
    telecom: [
      org.phone ? { system: 'phone' as const, value: org.phone } : null,
      org.email ? { system: 'email' as const, value: org.email } : null,
    ].filter((t): t is NonNullable<typeof t> => t !== null),
    address: org.addressLine1
      ? [
          {
            line: [org.addressLine1],
            city: org.city ?? undefined,
            postalCode: org.postalCode ?? undefined,
            country: org.country ?? undefined,
          },
        ]
      : undefined,
    partOf: org.parentId ? { reference: `Organization/${org.parentId}` } : undefined,
  };
}

export function toFhirOrgBundle(orgs: Organization[], total: number): FhirBundle<FhirOrganization> {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total,
    entry: orgs.map((o) => ({
      fullUrl: `Organization/${o.id}`,
      resource: toFhirOrganization(o),
      search: { mode: 'match' as const },
    })),
  };
}
