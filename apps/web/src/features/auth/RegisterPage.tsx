import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { ErrorAlert } from '../../components/ErrorAlert';

const ORG_TYPES = [
  { value: 'CARE_HOME', label: 'Care Home' },
  { value: 'GP_PRACTICE', label: 'GP Practice' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'COMMUNITY_SERVICE', label: 'Community Service' },
  { value: 'MENTAL_HEALTH_TRUST', label: 'Mental Health Trust' },
  { value: 'OTHER', label: 'Other' },
];

export function RegisterPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [organizationType, setOrganizationType] = useState('CARE_HOME');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        tenantName: tenantName || undefined,
        organizationType: tenantName ? organizationType : undefined,
        orgPhone: tenantName && orgPhone ? orgPhone : undefined,
        orgEmail: tenantName && orgEmail ? orgEmail : undefined,
        addressLine1: tenantName && addressLine1 ? addressLine1 : undefined,
        city: tenantName && city ? city : undefined,
        postalCode: tenantName && postalCode ? postalCode : undefined,
      });
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
            Start managing
            <br />
            your organisation
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Set up your care home, GP practice, or hospital in minutes. Full EPR, multi-tenant data
            isolation, and role-based access out of the box.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { step: '1', text: 'Create your account' },
              { step: '2', text: 'Name your organisation' },
              { step: '3', text: 'Invite your team & start managing patients' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 text-accent-light flex items-center justify-center text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <span className="text-slate-300">{item.text}</span>
              </div>
            ))}
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

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
          <p className="text-slate-500 text-sm mb-8">Get started with Clinvara in minutes</p>

          <ErrorAlert message={error} className="mb-6" />

          <form onSubmit={handleSubmit}>
            <div className="flex gap-3 mb-5">
              <div className="flex-1">
                <label className="block mb-1.5 text-sm font-medium text-slate-700">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="Jane"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block mb-1.5 text-sm font-medium text-slate-700">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Smith"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                />
              </div>
            </div>

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

            <div className="mb-5">
              <label className="block mb-1.5 text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
              />
            </div>

            <div className="border-t border-slate-200 pt-5 mb-5">
              <label className="block mb-1.5 text-sm font-medium text-slate-700">
                Organisation name
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="e.g. Sunrise Care Home"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Creates a new organisation with you as administrator
              </p>
            </div>

            {tenantName && (
              <>
                <div className="mb-5">
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">
                    Organisation type
                  </label>
                  <select
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white transition-colors appearance-none"
                  >
                    {ORG_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 mb-5">
                  <div className="flex-1">
                    <label className="block mb-1.5 text-sm font-medium text-slate-700">Phone</label>
                    <input
                      type="tel"
                      value={orgPhone}
                      onChange={(e) => setOrgPhone(e.target.value)}
                      placeholder="0123 456 7890"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1.5 text-sm font-medium text-slate-700">
                      Organisation email
                    </label>
                    <input
                      type="email"
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      placeholder="info@organisation.nhs.uk"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block mb-1.5 text-sm font-medium text-slate-700">Address</label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street address"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                  />
                </div>

                <div className="flex gap-3 mb-6">
                  <div className="flex-1">
                    <label className="block mb-1.5 text-sm font-medium text-slate-700">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. London"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1.5 text-sm font-medium text-slate-700">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. SW1A 1AA"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-white border-none rounded-lg cursor-pointer text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-accent font-semibold hover:text-accent-dark no-underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
