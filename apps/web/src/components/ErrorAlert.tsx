interface ErrorAlertProps {
  message: string | null;
  variant?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  className?: string;
}

const variantStyles = {
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-400',
    dismiss: 'text-red-300 hover:text-red-500',
    iconPath:
      'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: 'text-amber-400',
    dismiss: 'text-amber-300 hover:text-amber-500',
    iconPath: 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'text-blue-400',
    dismiss: 'text-blue-300 hover:text-blue-500',
    iconPath:
      'm11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
  },
};

export function ErrorAlert({
  message,
  variant = 'error',
  onDismiss,
  className = '',
}: ErrorAlertProps): React.ReactElement | null {
  if (!message) return null;

  const styles = variantStyles[variant];

  return (
    <div
      className={`p-3 border rounded-lg text-sm flex items-start gap-2 ${styles.container} ${className}`}
      role="alert"
    >
      <svg
        className={`w-4 h-4 mt-0.5 shrink-0 ${styles.icon}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={styles.iconPath} />
      </svg>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`shrink-0 bg-transparent border-none cursor-pointer p-0 text-lg leading-none ${styles.dismiss}`}
          aria-label="Dismiss"
        >
          &times;
        </button>
      )}
    </div>
  );
}

interface WarningListProps {
  title: string;
  items: string[];
  onDismiss?: () => void;
  className?: string;
}

export function WarningList({
  title,
  items,
  onDismiss,
  className = '',
}: WarningListProps): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <div
      className={`p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 mt-0.5 shrink-0 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <div>
            <div className="font-medium mb-1">{title}</div>
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              {items.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-amber-300 hover:text-amber-500 bg-transparent border-none cursor-pointer p-0 text-lg shrink-0"
            aria-label="Dismiss"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
