import type { FhirResource, FhirCodeableConcept, FhirReference, FhirPeriod } from './base';

export interface FhirDosage {
  text?: string;
  timing?: {
    code?: FhirCodeableConcept;
    repeat?: {
      frequency?: number;
      period?: number;
      periodUnit?: string;
    };
  };
  route?: FhirCodeableConcept;
  doseAndRate?: {
    doseQuantity?: {
      value?: number;
      unit?: string;
    };
  }[];
  asNeededBoolean?: boolean;
  maxDosePerPeriod?: {
    numerator?: { value?: number; unit?: string };
    denominator?: { value?: number; unit?: string };
  };
}

export interface FhirMedication extends FhirResource {
  resourceType: 'Medication';
  code?: FhirCodeableConcept;
  status?: 'active' | 'inactive' | 'entered-in-error';
  form?: FhirCodeableConcept;
  ingredient?: {
    itemCodeableConcept?: FhirCodeableConcept;
    strength?: {
      numerator?: { value?: number; unit?: string };
      denominator?: { value?: number; unit?: string };
    };
  }[];
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status:
    | 'draft'
    | 'active'
    | 'on-hold'
    | 'completed'
    | 'stopped'
    | 'cancelled'
    | 'entered-in-error';
  intent:
    | 'proposal'
    | 'plan'
    | 'order'
    | 'original-order'
    | 'reflex-order'
    | 'filler-order'
    | 'instance-order'
    | 'option';
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  medicationReference?: FhirReference;
  subject: FhirReference;
  requester?: FhirReference;
  reasonCode?: FhirCodeableConcept[];
  dosageInstruction?: FhirDosage[];
  dispenseRequest?: {
    validityPeriod?: FhirPeriod;
  };
  note?: string;
}

export interface FhirMedicationAdministration extends FhirResource {
  resourceType: 'MedicationAdministration';
  status: 'in-progress' | 'completed' | 'not-done' | 'entered-in-error';
  medicationReference?: FhirReference;
  subject: FhirReference;
  effectiveDateTime?: string;
  performer?: {
    actor: FhirReference;
  }[];
  request?: FhirReference;
  dosage?: {
    text?: string;
    route?: FhirCodeableConcept;
    dose?: {
      value?: number;
      unit?: string;
    };
    site?: FhirCodeableConcept;
  };
  note?: string;
  statusReason?: FhirCodeableConcept[];
}
