import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { ErrorAlert } from '../../components/ErrorAlert';

export function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
            Modern healthcare
            <br />
            management platform
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Unified electronic patient records, care coordination, and operational management for
            care homes, GP practices, and hospitals.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-accent-light">FHIR R4</div>
              <div className="text-slate-400 text-sm mt-1">Standards compliant</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent-light">Multi-tenant</div>
              <div className="text-slate-400 text-sm mt-1">Full data isolation</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent-light">RBAC</div>
              <div className="text-slate-400 text-sm mt-1">Role-based access</div>
            </div>
          </div>
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

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your account to continue</p>

          <ErrorAlert message={error} className="mb-6" />

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
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

            <div className="mb-6">
              <label className="block mb-1.5 text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-white border-none rounded-lg cursor-pointer text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-accent font-semibold hover:text-accent-dark no-underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
