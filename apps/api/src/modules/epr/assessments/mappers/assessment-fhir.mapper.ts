import type { Assessment, Patient, User } from '@prisma/client';
import type { FhirAssessment, FhirBundle } from '@care/shared';

export type AssessmentWithRelations = Assessment & {
  patient: Pick<Patient, 'id' | 'givenName' | 'familyName'>;
  performedBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  reviewedBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
};

const STATUS_MAP: Record<string, FhirAssessment['status']> = {
  DRAFT: 'preliminary',
  COMPLETED: 'final',
  REVIEWED: 'final',
  CANCELLED: 'cancelled',
  ENTERED_IN_ERROR: 'entered-in-error',
};

const ASSESSMENT_TYPE_DISPLAY: Record<string, string> = {
  FALLS_RISK: 'Falls Risk Assessment',
  NUTRITION: 'Nutrition Assessment',
  PRESSURE_ULCER: 'Pressure Ulcer Risk Assessment',
  PAIN: 'Pain Assessment',
  MOBILITY: 'Mobility Assessment',
  MENTAL_HEALTH: 'Mental Health Assessment',
  GENERAL: 'General Assessment',
};

const RISK_LEVEL_DISPLAY: Record<string, string> = {
  NONE: 'No Risk',
  LOW: 'Low Risk',
  MEDIUM: 'Medium Risk',
  HIGH: 'High Risk',
  VERY_HIGH: 'Very High Risk',
};

export function toFhirAssessment(
  a: AssessmentWithRelations,
  typeDisplayName?: string,
): FhirAssessment {
  const recommendedActions = a.recommendedActions
    ? (() => {
        try {
          return JSON.parse(a.recommendedActions) as string[];
        } catch {
          return [a.recommendedActions];
        }
      })()
    : undefined;

  return {
    resourceType: 'Observation',
    id: a.id,
    meta: { lastUpdated: a.updatedAt.toISOString() },
    status: STATUS_MAP[a.status] ?? 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'survey',
            display: 'Survey',
          },
        ],
        text: 'Assessment',
      },
    ],
    code: {
      coding: [
        {
          system: 'http://care-solutions.local/assessment-type',
          code: a.assessmentType,
          display: typeDisplayName ?? ASSESSMENT_TYPE_DISPLAY[a.assessmentType] ?? a.assessmentType,
        },
      ],
      text: typeDisplayName ?? ASSESSMENT_TYPE_DISPLAY[a.assessmentType] ?? a.assessmentType,
    },
    subject: {
      reference: `Patient/${a.patient.id}`,
      display: `${a.patient.givenName} ${a.patient.familyName}`,
    },
    effectiveDateTime: a.performedAt.toISOString(),
    performer: [
      {
        reference: `User/${a.performedBy.id}`,
        display: `${a.performedBy.firstName} ${a.performedBy.lastName}`,
      },
    ],
    valueQuantity:
      a.score != null
        ? {
            value: a.score,
            unit: a.maxScore ? `/ ${a.maxScore}` : undefined,
          }
        : undefined,
    interpretation: a.riskLevel
      ? [
          {
            coding: [
              {
                system: 'http://care-solutions.local/risk-level',
                code: a.riskLevel,
                display: RISK_LEVEL_DISPLAY[a.riskLevel] ?? a.riskLevel,
              },
            ],
            text: RISK_LEVEL_DISPLAY[a.riskLevel] ?? a.riskLevel,
          },
        ]
      : undefined,
    note: a.notes ? [{ text: a.notes }] : undefined,
    title: a.title,
    description: a.description ?? undefined,
    toolName: a.toolName ?? undefined,
    maxScore: a.maxScore ?? undefined,
    scoreInterpretation: a.scoreInterpretation ?? undefined,
    recommendedActions,
    responses: a.responses ?? undefined,
    reviewedBy: a.reviewedBy
      ? {
          reference: `User/${a.reviewedBy.id}`,
          display: `${a.reviewedBy.firstName} ${a.reviewedBy.lastName}`,
        }
      : undefined,
    reviewedAt: a.reviewedAt?.toISOString(),
  };
}

export function toFhirAssessmentBundle(
  assessments: AssessmentWithRelations[],
  total: number,
  displayNames?: Map<string, string>,
): FhirBundle<FhirAssessment> {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total,
    entry: assessments.map((a) => ({
      fullUrl: `Observation/${a.id}`,
      resource: toFhirAssessment(a, displayNames?.get(a.assessmentType)),
      search: { mode: 'match' as const },
    })),
  };
}
