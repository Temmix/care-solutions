import type {
  FhirResource,
  FhirIdentifier,
  FhirHumanName,
  FhirContactPoint,
  FhirAddress,
  FhirCodeableConcept,
  FhirPeriod,
} from './base';

export interface FhirPractitioner extends FhirResource {
  resourceType: 'Practitioner';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  qualification?: FhirPractitionerQualification[];
}

export interface FhirPractitionerQualification {
  identifier?: FhirIdentifier[];
  code: FhirCodeableConcept;
  period?: FhirPeriod;
  issuer?: { reference?: string; display?: string };
}
