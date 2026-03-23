import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    deviceId?: string;
    expiresAt?: string;
  }) => Promise<{ rawKey: string }>;
}

export function CreateApiKeyModal({ open, onClose, onCreate }: Props): React.ReactElement | null {
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const result = await onCreate({
        name: name.trim(),
        expiresAt: expiresAt || undefined,
      });
      setRawKey(result.rawKey);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (rawKey) {
      navigator.clipboard.writeText(rawKey).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName('');
    setExpiresAt('');
    setRawKey(null);
    setCopied(false);
    onClose();
  };

  // Show key after creation
  if (rawKey) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">API Key Created</h2>
          <p className="text-sm text-amber-600 mb-4">
            Copy this key now. It will not be shown again.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm break-all mb-4">
            {rawKey}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Create API Key</h2>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ward A Gateway"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expires At (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
