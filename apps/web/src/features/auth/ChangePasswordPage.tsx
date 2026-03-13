import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { api } from '../../lib/api-client';

interface Props {
  forced?: boolean;
}

export function ChangePasswordPage({ forced }: Props): React.ReactElement {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    currentPassword !== newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    setError('');
    try {
      await api.patch('/users/change-password', { currentPassword, newPassword });
      await refreshProfile();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-slate-900">
              {forced ? 'Set Your New Password' : 'Change Password'}
            </h1>
            {forced && (
              <p className="text-sm text-slate-500 mt-2">
                For security, you must set a new password before continuing.
              </p>
            )}
            {!forced && (
              <p className="text-sm text-slate-500 mt-2">Update your password for {user?.email}</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Minimum 8 characters"
              />
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-red-500 text-xs mt-1">Password must be at least 8 characters</p>
              )}
              {currentPassword && newPassword && currentPassword === newPassword && (
                <p className="text-red-500 text-xs mt-1">
                  New password must be different from current password
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Re-enter new password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isValid || saving}
              className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>

            {!forced && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full py-2 text-sm text-slate-500 bg-transparent border-none cursor-pointer hover:text-slate-700"
              >
                Cancel
              </button>
            )}

            {forced && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full py-2 text-sm text-slate-500 bg-transparent border-none cursor-pointer hover:text-slate-700"
              >
                Sign out instead
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
