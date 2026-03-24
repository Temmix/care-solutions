import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, type Notification } from './hooks/use-notifications';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell(): React.ReactElement {
  const navigate = useNavigate();
  const { getNotifications, getUnreadCount, markRead } = useNotifications();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUnreadCount()
      .then(setUnread)
      .catch(() => {});
    const interval = setInterval(() => {
      getUnreadCount()
        .then(setUnread)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [getUnreadCount]);

  useEffect(() => {
    if (open) {
      getNotifications({ limit: 5 })
        .then((r) => setRecent(r.data))
        .catch(() => {});
    }
  }, [open, getNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await markRead(n.id).catch(() => {});
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">Notifications</span>
            {unread > 0 && <span className="text-xs text-slate-400">{unread} unread</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications</p>
            ) : (
              recent.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-25 cursor-pointer bg-transparent border-none ${
                    !n.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 m-0 truncate">{n.title}</p>
                      <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">{n.message}</p>
                      <p className="text-[10px] text-slate-400 m-0 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate('/app/notifications');
            }}
            className="w-full px-4 py-2.5 text-center text-sm text-accent hover:bg-slate-50 cursor-pointer bg-transparent border-none border-t border-slate-100"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
