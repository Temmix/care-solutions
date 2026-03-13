/**
 * FHIR R4 Observation Resource Type (used for Clinical Assessments)
 * See: https://hl7.org/fhir/R4/observation.html
 */

import type { FhirResource, FhirCodeableConcept, FhirReference } from './base';

export interface FhirAssessmentValue {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirAssessment extends FhirResource {
  resourceType: 'Observation';
  status: 'preliminary' | 'final' | 'cancelled' | 'entered-in-error';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  effectiveDateTime?: string;
  performer?: FhirReference[];
  valueQuantity?: FhirAssessmentValue;
  interpretation?: FhirCodeableConcept[];
  note?: { text: string }[];
  // Extended fields for assessment detail
  title?: string;
  description?: string;
  toolName?: string;
  maxScore?: number;
  scoreInterpretation?: string;
  recommendedActions?: string[];
  responses?: unknown;
  reviewedBy?: FhirReference;
  reviewedAt?: string;
}
