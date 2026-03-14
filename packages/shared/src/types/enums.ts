export enum Role {
  TENANT_ADMIN = 'TENANT_ADMIN',
  ADMIN = 'ADMIN',
  CLINICIAN = 'CLINICIAN',
  NURSE = 'NURSE',
  CARER = 'CARER',
  PATIENT = 'PATIENT',
  SYSTEM = 'SYSTEM',
}

export enum CareSettingType {
  ACUTE = 'ACUTE',
  COMMUNITY = 'COMMUNITY',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  PRIMARY_CARE = 'PRIMARY_CARE',
  SOCIAL_CARE = 'SOCIAL_CARE',
  VIRTUAL_WARD = 'VIRTUAL_WARD',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  UNKNOWN = 'UNKNOWN',
}

export enum PatientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DECEASED = 'DECEASED',
}

export enum IdentifierType {
  NHS_NUMBER = 'NHS_NUMBER',
  MRN = 'MRN',
  PASSPORT = 'PASSPORT',
  OTHER = 'OTHER',
}

export enum ContactRelationship {
  NEXT_OF_KIN = 'NEXT_OF_KIN',
  EMERGENCY = 'EMERGENCY',
  CARER = 'CARER',
  GUARDIAN = 'GUARDIAN',
  OTHER = 'OTHER',
}

export enum PatientEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ADMISSION = 'ADMISSION',
  DISCHARGE = 'DISCHARGE',
  TRANSFER = 'TRANSFER',
  NOTE = 'NOTE',
  ASSESSMENT = 'ASSESSMENT',
  REFERRAL = 'REFERRAL',
  DEMOGRAPHIC_CHANGE = 'DEMOGRAPHIC_CHANGE',
}

export enum OrganizationType {
  HOSPITAL = 'HOSPITAL',
  GP_PRACTICE = 'GP_PRACTICE',
  CARE_HOME = 'CARE_HOME',
  COMMUNITY_SERVICE = 'COMMUNITY_SERVICE',
  MENTAL_HEALTH_TRUST = 'MENTAL_HEALTH_TRUST',
  OTHER = 'OTHER',
}

export enum EventType {
  PATIENT_CREATED = 'patient.created',
  PATIENT_UPDATED = 'patient.updated',
  CARE_PLAN_CREATED = 'care_plan.created',
  CARE_PLAN_UPDATED = 'care_plan.updated',
  ADMISSION = 'admission.created',
  DISCHARGE = 'discharge.created',
  MEDICATION_PRESCRIBED = 'medication.prescribed',
  MEDICATION_ADMINISTERED = 'medication.administered',
}
