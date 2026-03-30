import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';

export function ForgotPasswordPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Something went wrong');
      }

      setSubmitted(true);
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
            Reset your
            <br />
            password
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Enter your email address and we'll send you a link to reset your password.
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

          {submitted ? (
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
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Check your email</h2>
              <p className="text-slate-500 text-sm mb-6">
                If an account with <strong>{email}</strong> exists, we've sent a password reset
                link. Check your inbox and spam folder.
              </p>
              <Link
                to="/login"
                className="text-accent font-semibold text-sm hover:text-accent-dark no-underline"
              >
                &larr; Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Forgot password?</h2>
              <p className="text-slate-500 text-sm mb-8">
                Enter your email and we'll send you a reset link
              </p>

              <ErrorAlert message={error} className="mb-6" />

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@organisation.nhs.uk"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-accent hover:bg-accent-dark text-white border-none rounded-lg cursor-pointer text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="text-accent font-semibold hover:text-accent-dark no-underline"
                >
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
