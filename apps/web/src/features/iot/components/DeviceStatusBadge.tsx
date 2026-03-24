interface Props {
  status: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export function DeviceStatusBadge({ status, isOnline, lastSeenAt }: Props): React.ReactElement {
  if (status === 'DECOMMISSIONED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Decommissioned
      </span>
    );
  }

  if (!lastSeenAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        Never Connected
      </span>
    );
  }

  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Online
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Offline
    </span>
  );
}
