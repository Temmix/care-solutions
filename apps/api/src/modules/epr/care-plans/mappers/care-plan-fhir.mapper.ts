import type {
  CarePlan,
  CarePlanGoal,
  CarePlanActivity,
  CarePlanNote,
  Patient,
  User,
  Practitioner,
} from '@prisma/client';
import type {
  FhirCarePlan,
  FhirCarePlanActivity,
  FhirCarePlanGoal,
  FhirAnnotation,
  FhirBundle,
} from '@care/shared';

export type CarePlanWithRelations = CarePlan & {
  patient: Pick<Patient, 'id' | 'givenName' | 'familyName'>;
  author: Pick<User, 'id' | 'firstName' | 'lastName'>;
  goals: CarePlanGoal[];
  activities: (CarePlanActivity & {
    assignee?: Pick<Practitioner, 'id' | 'givenName' | 'familyName'> | null;
  })[];
  notes: (CarePlanNote & {
    author: Pick<User, 'id' | 'firstName' | 'lastName'>;
  })[];
};

const STATUS_MAP: Record<string, FhirCarePlan['status']> = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'revoked',
  ENTERED_IN_ERROR: 'entered-in-error',
};

const GOAL_STATUS_MAP: Record<string, FhirCarePlanGoal['status']> = {
  PROPOSED: 'proposed',
  ACCEPTED: 'accepted',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const ACTIVITY_STATUS_MAP: Record<
  string,
  FhirCarePlanActivity['detail'] extends undefined ? never : string
> = {
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export function toFhirCarePlan(cp: CarePlanWithRelations): FhirCarePlan {
  const goals: FhirCarePlanGoal[] = cp.goals.map((g) => ({
    id: g.id,
    description: g.description,
    status: GOAL_STATUS_MAP[g.status] ?? 'proposed',
    target:
      g.targetDate || g.measure
        ? {
            measure: g.measure ? { text: g.measure } : undefined,
            dueDate: g.targetDate?.toISOString().split('T')[0],
          }
        : undefined,
    note: g.notes ?? undefined,
  }));

  const activities: FhirCarePlanActivity[] = cp.activities.map((a) => ({
    id: a.id,
    detail: {
      kind: a.type.toLowerCase(),
      status: (ACTIVITY_STATUS_MAP[a.status] ??
        'not-started') as FhirCarePlanActivity['detail'] extends { status: infer S } ? S : never,
      description: a.description,
      scheduledString: a.scheduledAt?.toISOString(),
      performer: a.assignee
        ? [
            {
              reference: `Practitioner/${a.assignee.id}`,
              display: `${a.assignee.givenName} ${a.assignee.familyName}`,
            },
          ]
        : undefined,
    },
  }));

  const notes: FhirAnnotation[] = cp.notes.map((n) => ({
    authorReference: {
      reference: `User/${n.author.id}`,
      display: `${n.author.firstName} ${n.author.lastName}`,
    },
    time: n.createdAt.toISOString(),
    text: n.content,
  }));

  return {
    resourceType: 'CarePlan',
    id: cp.id,
    meta: { lastUpdated: cp.updatedAt.toISOString() },
    status: STATUS_MAP[cp.status] ?? 'draft',
    intent: 'plan',
    category: [{ text: cp.category }],
    title: cp.title,
    description: cp.description ?? undefined,
    subject: {
      reference: `Patient/${cp.patient.id}`,
      display: `${cp.patient.givenName} ${cp.patient.familyName}`,
    },
    period: {
      start: cp.startDate.toISOString().split('T')[0],
      end: cp.endDate?.toISOString().split('T')[0],
    },
    created: cp.createdAt.toISOString(),
    author: {
      reference: `User/${cp.author.id}`,
      display: `${cp.author.firstName} ${cp.author.lastName}`,
    },
    goal: goals.length ? goals : undefined,
    activity: activities.length ? activities : undefined,
    note: notes.length ? notes : undefined,
  };
}

export function toFhirCarePlanBundle(
  carePlans: CarePlanWithRelations[],
  total: number,
): FhirBundle<FhirCarePlan> {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total,
    entry: carePlans.map((cp) => ({
      fullUrl: `CarePlan/${cp.id}`,
      resource: toFhirCarePlan(cp),
      search: { mode: 'match' as const },
    })),
  };
}
