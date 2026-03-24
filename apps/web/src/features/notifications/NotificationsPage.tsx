import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications, type Notification } from './hooks/use-notifications';
import { ErrorAlert } from '../../components/ErrorAlert';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

const typeLabels: Record<string, string> = {
  VW_THRESHOLD_BREACH: 'Virtual Ward Alert',
  VW_ALERT_ESCALATED: 'Alert Escalated',
  CHC_STATUS_CHANGE: 'CHC Update',
  CHC_REVIEW_DUE: 'CHC Review Due',
  CARE_PLAN_REVIEW_DUE: 'Care Plan Review',
  SHIFT_SWAP_REQUEST: 'Shift Swap Request',
  SHIFT_SWAP_RESPONSE: 'Shift Swap Response',
  SHIFT_GAP_DETECTED: 'Shift Gap',
  DISCHARGE_PLAN_READY: 'Discharge Ready',
  SYSTEM: 'System',
};

export function NotificationsPage(): React.ReactElement {
  const navigate = useNavigate();
  const { getNotifications, markRead, markAllRead } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    getNotifications({ page, limit, unreadOnly })
      .then((r) => {
        setNotifications(r.data);
        setTotal(r.total);
        setUnreadCount(r.unreadCount);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [getNotifications, page, unreadOnly]);

  const handleMarkAllRead = async () => {
    await markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await markRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.link) navigate(n.link);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">{unreadCount} unread</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/app/settings/notifications"
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium no-underline hover:bg-slate-50 transition-colors"
          >
            Preferences
          </Link>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer transition-colors ${
            !unreadOnly
              ? 'bg-accent text-white border-accent'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer transition-colors ${
            unreadOnly
              ? 'bg-accent text-white border-accent'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Unread only
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading && !notifications.length ? (
          <p className="px-4 py-8 text-center text-slate-400">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-400">No notifications</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-25 cursor-pointer bg-transparent border-x-0 border-t-0 ${
                !n.read ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {!n.read && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      {typeLabels[n.type] ?? n.type}
                    </span>
                    <span className="text-[10px] text-slate-300">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 m-0">{n.title}</p>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">{n.message}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
