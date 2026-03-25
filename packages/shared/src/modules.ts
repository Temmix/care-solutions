export const MODULE_CODES = [
  'PATIENTS',
  'CARE_PLANS',
  'MEDICATIONS',
  'ASSESSMENTS',
  'ROSTER',
  'COMPLIANCE',
  'TRAINING',
  'PATIENT_FLOW',
  'CHC',
  'VIRTUAL_WARDS',
  'IOT',
  'REPORTS',
  'BILLING',
] as const;

export type ModuleCode = (typeof MODULE_CODES)[number];

export interface ModuleDefinition {
  code: ModuleCode;
  label: string;
  description: string;
  defaultEnabledFor: string[];
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    code: 'PATIENTS',
    label: 'Patients',
    description: 'Patient records and demographics',
    defaultEnabledFor: ['ALL'],
  },
  {
    code: 'CARE_PLANS',
    label: 'Care Plans',
    description: 'Care planning, goals, and activities',
    defaultEnabledFor: ['ALL'],
  },
  {
    code: 'MEDICATIONS',
    label: 'Medications',
    description: 'Medication catalogue, prescriptions, and administration',
    defaultEnabledFor: ['ALL'],
  },
  {
    code: 'ASSESSMENTS',
    label: 'Assessments',
    description: 'Clinical assessments and risk evaluations',
    defaultEnabledFor: ['ALL'],
  },
  {
    code: 'ROSTER',
    label: 'Roster & Scheduling',
    description: 'Staff roster, shift patterns, availability, and shift swaps',
    defaultEnabledFor: ['ALL'],
  },
  {
    code: 'COMPLIANCE',
    label: 'Compliance',
    description: 'Working-time compliance and regulatory checks',
    defaultEnabledFor: ['ALL'],
  },
  {
    code: 'TRAINING',
    label: 'Training',
    description: 'Staff training records and certifications',
    defaultEnabledFor: ['ALL'],
  },
  {
    code: 'PATIENT_FLOW',
    label: 'Patient Flow',
    description: 'Admissions, discharges, transfers, and bed management',
    defaultEnabledFor: ['HOSPITAL', 'MENTAL_HEALTH_TRUST'],
  },
  {
    code: 'CHC',
    label: 'CHC',
    description: 'Continuing Healthcare assessments and case management',
    defaultEnabledFor: ['CARE_HOME', 'COMMUNITY_SERVICE'],
  },
  {
    code: 'VIRTUAL_WARDS',
    label: 'Virtual Wards',
    description: 'Remote patient monitoring and virtual ward enrolments',
    defaultEnabledFor: ['HOSPITAL', 'COMMUNITY_SERVICE'],
  },
  {
    code: 'IOT',
    label: 'IoT Devices',
    description: 'IoT device management, API keys, and telemetry',
    defaultEnabledFor: ['HOSPITAL', 'CARE_HOME'],
  },
  {
    code: 'REPORTS',
    label: 'Reports',
    description: 'Analytics dashboards and operational reports',
    defaultEnabledFor: ['ALL'],
  },
  {
    code: 'BILLING',
    label: 'Billing',
    description: 'Subscription management and billing',
    defaultEnabledFor: ['ALL'],
  },
];

export function getDefaultModules(orgType: string): ModuleCode[] {
  return MODULE_DEFINITIONS.filter(
    (m) => m.defaultEnabledFor.includes('ALL') || m.defaultEnabledFor.includes(orgType),
  ).map((m) => m.code);
}

export function resolveEnabledModules(
  enabledModules: string[] | null | undefined,
  orgType: string,
): ModuleCode[] {
  if (!enabledModules || enabledModules.length === 0) {
    return getDefaultModules(orgType);
  }
  return enabledModules.filter((code): code is ModuleCode =>
    MODULE_CODES.includes(code as ModuleCode),
  );
}
