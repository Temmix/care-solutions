import type {
  FhirResource,
  FhirIdentifier,
  FhirContactPoint,
  FhirAddress,
  FhirCodeableConcept,
  FhirReference,
} from './base';

export interface FhirOrganization extends FhirResource {
  resourceType: 'Organization';
  identifier?: FhirIdentifier[];
  active?: boolean;
  type?: FhirCodeableConcept[];
  name?: string;
  alias?: string[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  partOf?: FhirReference;
}
