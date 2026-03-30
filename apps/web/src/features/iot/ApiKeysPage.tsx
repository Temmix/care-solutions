import { useState, useEffect, useCallback } from 'react';
import { useIot, type IotApiKey } from './hooks/use-iot';
import { CreateApiKeyModal } from './components/CreateApiKeyModal';

export function ApiKeysPage(): React.ReactElement {
  const { listApiKeys, createApiKey, revokeApiKey, error } = useIot();
  const [keys, setKeys] = useState<IotApiKey[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    listApiKeys()
      .then(setKeys)
      .catch(() => {});
  }, [listApiKeys]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? Devices using it will lose access.')) return;
    await revokeApiKey(id);
    load();
  };

  const handleCreate = async (data: { name: string; deviceId?: string; expiresAt?: string }) => {
    const result = await createApiKey(data);
    load();
    return result;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage authentication keys for IoT device gateways.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90"
        >
          Create API Key
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Key Prefix</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Device</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Last Used</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Expires</th>
              <th className="text-right py-3 px-4 text-slate-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-slate-50">
                <td className="py-3 px-4 text-slate-900 font-medium">{k.name}</td>
                <td className="py-3 px-4">
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {k.keyPrefix}...
                  </code>
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {k.device ? `${k.device.serialNumber} (${k.device.deviceType})` : 'Any'}
                </td>
                <td className="py-3 px-4">
                  {k.isActive ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                      Revoked
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {k.lastUsedAt
                    ? new Date(k.lastUsedAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('en-GB') : 'Never'}
                </td>
                <td className="py-3 px-4 text-right">
                  {k.isActive && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No API keys created yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateApiKeyModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
