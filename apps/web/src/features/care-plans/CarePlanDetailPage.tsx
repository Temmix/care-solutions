import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCarePlans, type FhirCarePlan } from './hooks/use-care-plans';
import { CarePlanStatusBadge } from './components/CarePlanStatusBadge';
import { GoalCard } from './components/GoalCard';
import { ActivityCard } from './components/ActivityCard';
import { NoteThread } from './components/NoteThread';
import { ErrorAlert } from '../../components/ErrorAlert';

const STATUS_TRANSITIONS: Record<string, { label: string; value: string }[]> = {
  draft: [{ label: 'Activate', value: 'ACTIVE' }],
  active: [
    { label: 'Complete', value: 'COMPLETED' },
    { label: 'Cancel', value: 'CANCELLED' },
  ],
  completed: [],
  revoked: [],
};

export function CarePlanDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { getCarePlan, updateCarePlan, addGoal, removeGoal, addActivity, removeActivity, addNote } =
    useCarePlans();
  const [carePlan, setCarePlan] = useState<FhirCarePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'goals' | 'activities' | 'notes'>('goals');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalMeasure, setGoalMeasure] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityType, setActivityType] = useState('OTHER');
  const [activityScheduledAt, setActivityScheduledAt] = useState('');

  useEffect(() => {
    if (!id) return;
    getCarePlan(id)
      .then(setCarePlan)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id, getCarePlan]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const updated = await updateCarePlan(id, { status: newStatus });
      setCarePlan(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const refresh = async () => {
    if (!id) return;
    const updated = await getCarePlan(id);
    setCarePlan(updated);
  };

  const handleAddNote = async (content: string) => {
    if (!id) return;
    await addNote(id, content);
    await refresh();
  };

  const handleAddGoal = async () => {
    if (!id || !goalDesc.trim()) return;
    try {
      const data: Record<string, unknown> = { description: goalDesc.trim() };
      if (goalTargetDate) data.targetDate = goalTargetDate;
      if (goalMeasure.trim()) data.measure = goalMeasure.trim();
      await addGoal(id, data);
      setGoalDesc('');
      setGoalTargetDate('');
      setGoalMeasure('');
      setShowGoalForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add goal');
    }
  };

  const handleRemoveGoal = async (goalId: string) => {
    if (!id) return;
    try {
      await removeGoal(id, goalId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove goal');
    }
  };

  const handleAddActivity = async () => {
    if (!id || !activityDesc.trim()) return;
    try {
      const data: Record<string, unknown> = {
        description: activityDesc.trim(),
        type: activityType,
      };
      if (activityScheduledAt) data.scheduledAt = new Date(activityScheduledAt).toISOString();
      await addActivity(id, data);
      setActivityDesc('');
      setActivityType('OTHER');
      setActivityScheduledAt('');
      setShowActivityForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add activity');
    }
  };

  const handleRemoveActivity = async (activityId: string) => {
    if (!id) return;
    try {
      await removeActivity(id, activityId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove activity');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">Loading care plan...</div>
      </div>
    );
  }

  if (error && !carePlan) {
    return <ErrorAlert message={error} className="mb-4" />;
  }

  if (!carePlan) {
    return <div className="text-slate-500 text-center py-20">Care plan not found</div>;
  }

  const transitions = STATUS_TRANSITIONS[carePlan.status] ?? [];
  const categoryLabel =
    (carePlan.category?.[0]?.text ?? 'General').charAt(0) +
    (carePlan.category?.[0]?.text ?? 'General').slice(1).toLowerCase().replace(/_/g, ' ');

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          to="/care-plans"
          className="inline-flex items-center gap-1 text-slate-400 no-underline text-sm hover:text-slate-600 transition-colors mb-3"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Care Plans
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{carePlan.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <CarePlanStatusBadge status={carePlan.status} />
              <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full">
                {categoryLabel}
              </span>
              <span>Patient: {carePlan.subject?.display ?? '-'}</span>
            </div>
          </div>
          {transitions.length > 0 && (
            <div className="flex gap-2">
              {transitions.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleStatusChange(t.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors border-none ${
                    t.value === 'ACTIVE'
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : t.value === 'COMPLETED'
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-red-50 hover:bg-red-100 text-red-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      {/* Info bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Author</div>
            <div className="text-slate-900">{carePlan.author?.display ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Start Date</div>
            <div className="text-slate-900">
              {carePlan.period?.start ? new Date(carePlan.period.start).toLocaleDateString() : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">End Date</div>
            <div className="text-slate-900">
              {carePlan.period?.end ? new Date(carePlan.period.end).toLocaleDateString() : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Created</div>
            <div className="text-slate-900">
              {carePlan.created ? new Date(carePlan.created).toLocaleDateString() : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Last Updated</div>
            <div className="text-slate-900">
              {carePlan.meta?.lastUpdated
                ? new Date(carePlan.meta.lastUpdated).toLocaleDateString()
                : '-'}
            </div>
          </div>
        </div>
        {carePlan.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-400 mb-1">Description</div>
            <p className="text-sm text-slate-600 m-0">{carePlan.description}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100">
        <div className="flex border-b border-slate-100">
          {(['goals', 'activities', 'notes'] as const).map((tab) => {
            const count =
              tab === 'goals'
                ? (carePlan.goal?.length ?? 0)
                : tab === 'activities'
                  ? (carePlan.activity?.length ?? 0)
                  : (carePlan.note?.length ?? 0);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-none bg-transparent cursor-pointer transition-colors ${
                  activeTab === tab
                    ? 'text-accent border-b-2 border-accent -mb-px'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'goals' && (
            <div className="space-y-3">
              {(carePlan.goal ?? []).length === 0 && !showGoalForm && (
                <p className="text-slate-400 text-sm text-center py-6 m-0">No goals defined</p>
              )}
              {(carePlan.goal ?? []).map((goal, i) => (
                <GoalCard
                  key={i}
                  goal={goal}
                  onRemove={goal.id ? () => handleRemoveGoal(goal.id!) : undefined}
                />
              ))}
              {showGoalForm ? (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Goal description *"
                    value={goalDesc}
                    onChange={(e) => setGoalDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-3">
                    <input
                      type="date"
                      placeholder="Target date"
                      value={goalTargetDate}
                      onChange={(e) => setGoalTargetDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Success measure"
                      value={goalMeasure}
                      onChange={(e) => setGoalMeasure(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowGoalForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddGoal}
                      disabled={!goalDesc.trim()}
                      className="px-3 py-1.5 text-xs text-white bg-accent rounded-lg cursor-pointer hover:bg-accent-dark disabled:opacity-50 border-none"
                    >
                      Add Goal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="w-full py-2 text-xs text-accent bg-transparent border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  + Add Goal
                </button>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-3">
              {(carePlan.activity ?? []).length === 0 && !showActivityForm && (
                <p className="text-slate-400 text-sm text-center py-6 m-0">No activities defined</p>
              )}
              {(carePlan.activity ?? []).map((activity, i) => (
                <ActivityCard
                  key={i}
                  activity={activity}
                  onRemove={activity.id ? () => handleRemoveActivity(activity.id!) : undefined}
                />
              ))}
              {showActivityForm ? (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Activity description *"
                    value={activityDesc}
                    onChange={(e) => setActivityDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-3">
                    <select
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {[
                        'MEDICATION',
                        'EXERCISE',
                        'APPOINTMENT',
                        'OBSERVATION',
                        'EDUCATION',
                        'REFERRAL',
                        'OTHER',
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      value={activityScheduledAt}
                      onChange={(e) => setActivityScheduledAt(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowActivityForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddActivity}
                      disabled={!activityDesc.trim()}
                      className="px-3 py-1.5 text-xs text-white bg-accent rounded-lg cursor-pointer hover:bg-accent-dark disabled:opacity-50 border-none"
                    >
                      Add Activity
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowActivityForm(true)}
                  className="w-full py-2 text-xs text-accent bg-transparent border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  + Add Activity
                </button>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <NoteThread notes={carePlan.note ?? []} onAddNote={handleAddNote} />
          )}
        </div>
      </div>
    </div>
  );
}
