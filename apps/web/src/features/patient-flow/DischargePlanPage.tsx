import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatientFlow, DischargePlan } from './hooks/use-patient-flow';

const TASK_TYPES = [
  'MEDICATION_REVIEW',
  'CARE_PACKAGE',
  'TRANSPORT',
  'FOLLOW_UP_APPOINTMENT',
  'EQUIPMENT',
  'PATIENT_EDUCATION',
  'FAMILY_NOTIFICATION',
  'GP_LETTER',
] as const;

const taskTypeLabels: Record<string, string> = {
  MEDICATION_REVIEW: 'Medication Review',
  CARE_PACKAGE: 'Care Package',
  TRANSPORT: 'Transport',
  FOLLOW_UP_APPOINTMENT: 'Follow-up Appointment',
  EQUIPMENT: 'Equipment',
  PATIENT_EDUCATION: 'Patient Education',
  FAMILY_NOTIFICATION: 'Family Notification',
  GP_LETTER: 'GP Letter',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

const planStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  READY: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function DischargePlanPage(): React.ReactElement {
  const { id: encounterId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    loading,
    error,
    getDischargePlan,
    createDischargePlan,
    addDischargeTask,
    updateDischargeTask,
    completeDischargePlan,
  } = usePatientFlow();

  const [plan, setPlan] = useState<DischargePlan | null>(null);
  const [noPlan, setNoPlan] = useState(false);
  const [newTaskType, setNewTaskType] = useState<string>(TASK_TYPES[0]);
  const [showAddTask, setShowAddTask] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!encounterId) return;
    try {
      const p = await getDischargePlan(encounterId);
      setPlan(p);
      setNoPlan(false);
    } catch {
      setNoPlan(true);
    }
  }, [encounterId, getDischargePlan]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleCreate = async () => {
    if (!encounterId) return;
    await createDischargePlan(encounterId, {});
    loadPlan();
  };

  const handleAddTask = async () => {
    if (!encounterId) return;
    await addDischargeTask(encounterId, { type: newTaskType });
    setShowAddTask(false);
    loadPlan();
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    if (!encounterId) return;
    await updateDischargeTask(encounterId, taskId, { status });
    loadPlan();
  };

  const handleComplete = async () => {
    if (!encounterId) return;
    await completeDischargePlan(encounterId);
    loadPlan();
  };

  const completedCount = plan?.tasks.filter((t) => t.status === 'COMPLETED').length ?? 0;
  const totalCount = plan?.tasks.length ?? 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => navigate(`/app/encounters/${encounterId}`)}
            className="text-sm text-blue-600 hover:underline mb-1"
          >
            &larr; Back to Encounter
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Discharge Plan</h1>
        </div>
        {plan && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${planStatusColors[plan.status] || 'bg-gray-100'}`}
          >
            {plan.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}

      {noPlan && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No discharge plan exists for this encounter yet.</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Discharge Plan
          </button>
        </div>
      )}

      {plan && (
        <>
          {/* Progress bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                {completedCount} of {totalCount} tasks complete
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Tasks</h3>
              {plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
                <button
                  onClick={() => setShowAddTask(true)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Add Task
                </button>
              )}
            </div>

            {showAddTask && (
              <div className="p-4 bg-blue-50 border-b flex gap-3 items-center">
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {taskTypeLabels[t]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddTask}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-3 py-1 text-gray-600 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            {plan.tasks.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">
                No tasks added yet. Add tasks to track discharge readiness.
              </p>
            ) : (
              <ul className="divide-y">
                {plan.tasks.map((task) => (
                  <li key={task.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {task.status === 'COMPLETED' ? (
                        <span className="text-green-600 text-lg">&#10003;</span>
                      ) : (
                        <span className="text-gray-300 text-lg">&#9675;</span>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">
                          {taskTypeLabels[task.type] || task.type}
                        </p>
                        {task.assignedTo && (
                          <p className="text-xs text-gray-500">
                            Assigned to: {task.assignedTo.firstName} {task.assignedTo.lastName}
                          </p>
                        )}
                        {task.notes && <p className="text-xs text-gray-500">{task.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[task.status] || ''}`}
                      >
                        {task.status.replace(/_/g, ' ')}
                      </span>
                      {task.status !== 'COMPLETED' && plan.status !== 'COMPLETED' && (
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatus(task.id, e.target.value)}
                          className="border rounded text-xs px-1 py-0.5"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Complete button */}
          {(plan.status === 'READY' || plan.status === 'IN_PROGRESS') && (
            <div className="flex justify-end">
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Complete Discharge
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
