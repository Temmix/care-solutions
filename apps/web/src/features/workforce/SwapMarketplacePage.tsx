import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useWorkforce, type SwapRequest } from './hooks/use-workforce';
import { useAuth } from '../../hooks/use-auth';
import { useWebSocket } from '../../hooks/use-websocket';
import { ErrorAlert } from '../../components/ErrorAlert';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

type Tab = 'open' | 'mine' | 'approvals';

export function SwapMarketplacePage(): React.ReactElement {
  const { user } = useAuth();
  const {
    loading,
    error,
    getOpenSwaps,
    getMySwapRequests,
    getPendingApprovals,
    respondToSwap,
    approveSwap,
    rejectSwap,
    cancelSwapRequest,
    listShifts,
  } = useWorkforce();

  const [tab, setTab] = useState<Tab>('open');
  const [openSwaps, setOpenSwaps] = useState<SwapRequest[]>([]);
  const [mySwaps, setMySwaps] = useState<SwapRequest[]>([]);
  const [approvals, setApprovals] = useState<SwapRequest[]>([]);

  // Respond modal state
  const [respondingTo, setRespondingTo] = useState<SwapRequest | null>(null);
  const [myAssignments, setMyAssignments] = useState<
    { assignmentId: string; shiftLabel: string }[]
  >([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [respondError, setRespondError] = useState<string | null>(null);
  const [respondLoading, setRespondLoading] = useState(false);

  const isAdmin =
    user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  const loadData = useCallback(async () => {
    try {
      if (tab === 'open') setOpenSwaps(await getOpenSwaps());
      if (tab === 'mine') setMySwaps(await getMySwapRequests());
      if (tab === 'approvals' && isAdmin) setApprovals(await getPendingApprovals());
    } catch {
      /* handled by hook */
    }
  }, [tab, isAdmin, getOpenSwaps, getMySwapRequests, getPendingApprovals]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useWebSocket({
    'swap:created': () => {
      toast('New shift swap request posted', { icon: '🔄' });
      loadData();
    },
    'swap:updated': () => {
      toast('A shift swap was updated', { icon: '🔄' });
      loadData();
    },
  });

  const handleApprove = async (id: string) => {
    try {
      await approveSwap(id);
      toast.success('Swap approved successfully');
    } catch {
      toast.error('This swap has already been processed.');
    }
    loadData();
  };

  const handleReject = async (id: string) => {
    try {
      await rejectSwap(id);
      toast.success('Swap rejected');
    } catch {
      toast.error('This swap has already been processed.');
    }
    loadData();
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSwapRequest(id);
      toast.success('Swap request cancelled');
    } catch {
      toast.error('This swap has already been processed.');
    }
    loadData();
  };

  const handleOpenRespond = async (swap: SwapRequest) => {
    setRespondingTo(swap);
    setSelectedAssignmentId('');
    setRespondError(null);
    setRespondLoading(false);

    // Fetch upcoming shifts to find the current user's assignments
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      const result = await listShifts({
        from: today,
        to: futureDate.toISOString().split('T')[0],
        limit: 200,
      });
      const assignments: { assignmentId: string; shiftLabel: string }[] = [];
      for (const shift of result.data) {
        for (const a of shift.assignments) {
          if (a.user.id === user?.id) {
            const label = `${shift.shiftPattern.name} (${shift.shiftPattern.startTime}–${shift.shiftPattern.endTime}) on ${new Date(shift.date).toLocaleDateString()}`;
            assignments.push({ assignmentId: a.id, shiftLabel: label });
          }
        }
      }
      setMyAssignments(assignments);
    } catch {
      setMyAssignments([]);
    }
  };

  const handleRespond = async () => {
    if (!respondingTo || !selectedAssignmentId) return;
    setRespondLoading(true);
    setRespondError(null);
    try {
      await respondToSwap(respondingTo.id, { targetShiftAssignmentId: selectedAssignmentId });
      setRespondingTo(null);
      toast.success('You offered your shift in exchange. Waiting for manager approval.');
      loadData();
    } catch (err) {
      setRespondError(err instanceof Error ? err.message : 'Failed to respond to swap.');
    } finally {
      setRespondLoading(false);
    }
  };

  const formatShift = (swap: SwapRequest, which: 'original' | 'target') => {
    const assignment =
      which === 'original' ? swap.originalShiftAssignment : swap.targetShiftAssignment;
    if (!assignment) return 'N/A';
    const s = assignment.shift;
    return `${s.shiftPattern.name} (${s.shiftPattern.startTime}–${s.shiftPattern.endTime}) on ${new Date(s.date).toLocaleDateString()}`;
  };

  const renderSwapCard = (swap: SwapRequest, showActions: 'respond' | 'approve' | 'mine') => (
    <div key={swap.id} className="bg-white rounded-lg shadow p-4 mb-3 border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-gray-900">
            {swap.requester.firstName} {swap.requester.lastName}
          </p>
          <p className="text-sm text-gray-600 mt-1">Offering: {formatShift(swap, 'original')}</p>
          {swap.targetShiftAssignment && (
            <p className="text-sm text-gray-600">For: {formatShift(swap, 'target')}</p>
          )}
          {swap.responder && (
            <p className="text-sm text-blue-600 mt-1">
              Accepted by: {swap.responder.firstName} {swap.responder.lastName}
            </p>
          )}
          {swap.reason && <p className="text-sm text-gray-500 mt-1 italic">"{swap.reason}"</p>}
          {swap.managerNote && (
            <p className="text-sm text-red-600 mt-1">Manager: {swap.managerNote}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[swap.status] || 'bg-gray-100'}`}
        >
          {swap.status}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        {showActions === 'respond' &&
          swap.requester.id !== user?.id &&
          swap.status === 'PENDING' && (
            <button
              onClick={() => handleOpenRespond(swap)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Offer My Shift
            </button>
          )}
        {showActions === 'approve' && (
          <>
            <button
              onClick={() => handleApprove(swap.id)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={() => handleReject(swap.id)}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Reject
            </button>
          </>
        )}
        {showActions === 'mine' && swap.status === 'PENDING' && swap.requester.id === user?.id && (
          <button
            onClick={() => handleCancel(swap.id)}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'open', label: 'Open Offers', show: true },
    { key: 'mine', label: 'My Requests', show: true },
    { key: 'approvals', label: 'Pending Approval', show: isAdmin },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Shift Swap Marketplace</h1>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}

      <div className="flex gap-1 border-b">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}

      {tab === 'open' && (
        <div>
          {openSwaps.length === 0 && !loading && (
            <p className="text-gray-500">No open swap offers right now.</p>
          )}
          {openSwaps.map((s) => renderSwapCard(s, 'respond'))}
        </div>
      )}

      {tab === 'mine' && (
        <div>
          {mySwaps.length === 0 && !loading && (
            <p className="text-gray-500">You haven't made any swap requests yet.</p>
          )}
          {mySwaps.map((s) => renderSwapCard(s, 'mine'))}
        </div>
      )}

      {tab === 'approvals' && (
        <div>
          {approvals.length === 0 && !loading && (
            <p className="text-gray-500">No swaps pending approval.</p>
          )}
          {approvals.map((s) => renderSwapCard(s, 'approve'))}
        </div>
      )}

      {/* ── Respond modal ───────────────────────────────── */}
      {respondingTo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg max-h-[80vh] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Offer Your Shift</h3>
            <p className="text-sm text-slate-500 mb-1">
              <strong>{respondingTo.requester.firstName}</strong> is offering:
            </p>
            <p className="text-sm text-slate-700 mb-4 bg-slate-50 px-3 py-2 rounded-lg">
              {formatShift(respondingTo, 'original')}
            </p>
            <ErrorAlert
              message={respondError}
              onDismiss={() => setRespondError(null)}
              className="mb-4"
            />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Select one of your shifts to offer in exchange
            </p>
            {myAssignments.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                You have no upcoming shift assignments to offer.
              </p>
            ) : (
              <div className="overflow-y-auto -mx-6 px-6 flex-1 min-h-0 space-y-1 mb-4">
                {myAssignments.map((a) => (
                  <button
                    key={a.assignmentId}
                    onClick={() => setSelectedAssignmentId(a.assignmentId)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors text-sm ${
                      selectedAssignmentId === a.assignmentId
                        ? 'bg-accent/5 border-accent ring-1 ring-accent cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-accent/50 cursor-pointer'
                    }`}
                  >
                    {a.shiftLabel}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-auto pt-4 border-t border-slate-100">
              <button
                onClick={handleRespond}
                disabled={!selectedAssignmentId || respondLoading}
                className="flex-1 px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {respondLoading ? 'Submitting...' : 'Offer This Shift'}
              </button>
              <button
                onClick={() => {
                  setRespondingTo(null);
                  setSelectedAssignmentId('');
                  setRespondError(null);
                }}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
