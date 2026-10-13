import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, User, Sprout, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, switchDemoUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      navigate(redirect);
    } else {
      setError(res.message || 'Login failed.');
    }
  };

  const handleQuickDemo = async (role: 'customer' | 'farmer' | 'admin', demoEmail: string) => {
    await switchDemoUser(role, demoEmail);
    navigate(redirect);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Sign in to Farm2Trust</h1>
        <p className="text-xs text-stone-500">Access direct farm orders, producer tools, or verification audit.</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Login Form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@farm2trust.com"
              className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-colors text-xs"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Testing Personas */}
        <div className="border-t border-stone-100 pt-4 space-y-2 text-xs">
          <span className="font-bold text-stone-700 block">Instant Demo Logins:</span>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('customer', 'customer@farm2trust.com')}
              className="p-2 bg-stone-50 hover:bg-emerald-50 rounded-lg text-left border border-stone-200 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-stone-900 block">Customer Sarah</span>
                <span className="text-[10px] text-stone-500">customer@farm2trust.com</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-stone-200 text-stone-700 rounded font-semibold">1-Click</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('farmer', 'rajesh@greenvalleyfarm.com')}
              className="p-2 bg-stone-50 hover:bg-emerald-50 rounded-lg text-left border border-stone-200 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-stone-900 block">Farmer Rajesh (Approved)</span>
                <span className="text-[10px] text-stone-500">rajesh@greenvalleyfarm.com</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded font-semibold">1-Click</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('admin', 'admin@farm2trust.org')}
              className="p-2 bg-stone-50 hover:bg-emerald-50 rounded-lg text-left border border-stone-200 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-stone-900 block">Platform Administrator</span>
                <span className="text-[10px] text-stone-500">admin@farm2trust.org</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-blue-200 text-blue-800 rounded font-semibold">1-Click</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-2 text-xs text-stone-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-emerald-800 hover:underline">
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'farmer' ? 'farmer' : 'customer';

  const [role, setRole] = useState<'customer' | 'farmer'>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [farmName, setFarmName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await register({
      name,
      email,
      password,
      role,
      phone,
      farmName: role === 'farmer' ? farmName : undefined
    });

    setSubmitting(false);

    if (res.success) {
      if (role === 'farmer') {
        navigate('/farmer/verification');
      } else {
        navigate('/catalog');
      }
    } else {
      setError(res.message || 'Registration failed.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Create a Farm2Trust Account</h1>
        <p className="text-xs text-stone-500">Choose your membership role to get started.</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Picker Segmented Control */}
      <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setRole('customer')}
          className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            role === 'customer' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Customer Account</span>
        </button>
        <button
          type="button"
          onClick={() => setRole('farmer')}
          className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            role === 'farmer' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Sprout className="w-3.5 h-3.5" />
          <span>Farmer / Producer</span>
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Elena Vance"
              className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. elena@suncrest.com"
              className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Password (min 8 chars)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
            />
          </div>

          {role === 'farmer' && (
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Farm Operation Name</label>
              <input
                type="text"
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Suncrest Berry Orchards"
                className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                You will be prompted to submit land records and certificates after registration.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-colors text-xs"
          >
            {submitting ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-stone-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-800 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
