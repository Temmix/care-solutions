import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';

export function ResetPasswordPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Something went wrong');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-primary via-primary-light to-slate-800 text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <span className="text-xl font-semibold tracking-tight">Clinvara</span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Choose a new
            <br />
            password
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Enter your new password below. Make sure it's at least 8 characters long.
          </p>
        </div>

        <div className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Clinvara Ltd. All rights reserved.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <span className="text-xl font-semibold text-primary tracking-tight">Clinvara</span>
          </div>

          {success ? (
            <div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Password reset</h2>
              <p className="text-slate-500 text-sm mb-6">
                Your password has been reset successfully. You can now sign in with your new
                password.
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-3 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-semibold no-underline transition-colors"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Reset password</h2>
              <p className="text-slate-500 text-sm mb-8">Enter your new password below</p>

              <ErrorAlert message={error} className="mb-6" />

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">
                    New password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Re-enter your new password"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-accent hover:bg-accent-dark text-white border-none rounded-lg cursor-pointer text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                <Link
                  to="/login"
                  className="text-accent font-semibold hover:text-accent-dark no-underline"
                >
                  &larr; Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
