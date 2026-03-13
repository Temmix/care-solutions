import type {
  FhirResource,
  FhirIdentifier,
  FhirHumanName,
  FhirContactPoint,
  FhirAddress,
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
} from './base';

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FhirAddress[];
  maritalStatus?: FhirCodeableConcept;
  generalPractitioner?: FhirReference[];
  managingOrganization?: FhirReference;
  contact?: FhirPatientContact[];
}

export interface FhirPatientContact {
  relationship?: FhirCodeableConcept[];
  name?: FhirHumanName;
  telecom?: FhirContactPoint[];
  address?: FhirAddress;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  organization?: FhirReference;
  period?: FhirPeriod;
}
