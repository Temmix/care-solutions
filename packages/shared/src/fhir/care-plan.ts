/**
 * FHIR R4 CarePlan Resource Type
 * See: https://hl7.org/fhir/R4/careplan.html
 */

import type { FhirResource, FhirCodeableConcept, FhirReference, FhirPeriod } from './base';

export interface FhirAnnotation {
  authorReference?: FhirReference;
  time?: string;
  text: string;
}

export interface FhirCarePlanActivityDetail {
  kind?: string;
  code?: FhirCodeableConcept;
  status:
    | 'not-started'
    | 'scheduled'
    | 'in-progress'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'stopped'
    | 'unknown'
    | 'entered-in-error';
  description?: string;
  scheduledString?: string;
  performer?: FhirReference[];
}

export interface FhirCarePlanActivity {
  id?: string;
  detail?: FhirCarePlanActivityDetail;
}

export interface FhirCarePlanGoal {
  id?: string;
  description: string;
  status: 'proposed' | 'accepted' | 'active' | 'completed' | 'cancelled';
  target?: {
    measure?: FhirCodeableConcept;
    dueDate?: string;
  };
  note?: string;
}

export interface FhirCarePlan extends FhirResource {
  resourceType: 'CarePlan';
  status: 'draft' | 'active' | 'completed' | 'revoked' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'option';
  category?: FhirCodeableConcept[];
  title?: string;
  description?: string;
  subject: FhirReference;
  period?: FhirPeriod;
  created?: string;
  author?: FhirReference;
  goal?: FhirCarePlanGoal[];
  activity?: FhirCarePlanActivity[];
  note?: FhirAnnotation[];
}
