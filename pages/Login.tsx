import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';
import { validatePassword } from '../utils/validation';
import { Lock, Loader2, CheckCircle, Mail, Key, Shield, AlertCircle } from 'lucide-react';

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in ms

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Password Reset State
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
      setIsResetMode(true);
    }
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.isValid) {
      toast.error(`Password requirements: ${passwordCheck.errors.join(', ')}`);
      return;
    }

    if (!supabase) {
      toast.error('Database connection not active.');
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully! Please login with your new password.');
      setIsResetMode(false);
      setNewPassword('');
      setConfirmPassword('');
      window.location.hash = '';
    } catch (err: any) {
      toast.error('Error updating password: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if account is locked
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
      setError(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      setFailedAttempts(0);
      setLockoutUntil(null);
      navigate(from, { replace: true });
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_DURATION);
        setError(`Account temporarily locked due to ${MAX_ATTEMPTS} failed attempts. Try again in 15 minutes.`);
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        if (err.message.includes("Invalid login") || err.message.includes("Invalid email")) {
          setError(`Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
        } else if (err.message.includes("Email not confirmed")) {
          setError("Your email is not confirmed. Please check your inbox.");
        } else {
          setError(err.message || 'Authentication failed. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Mode UI
  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Reset Password</h2>
            <p className="text-slate-500 text-sm mt-1">Create a new secure password</p>
          </div>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter new password"
                required
                minLength={12}
              />
              {newPassword && (
                <div className="mt-2 text-xs">
                  <p className="font-medium text-slate-600 mb-1">Password must have:</p>
                  <ul className="space-y-1">
                    {[
                      { test: newPassword.length >= 12, label: '12+ characters' },
                      { test: /[A-Z]/.test(newPassword), label: 'Uppercase letter' },
                      { test: /[a-z]/.test(newPassword), label: 'Lowercase letter' },
                      { test: /[0-9]/.test(newPassword), label: 'Number' },
                      { test: /[!@#$%^&*]/.test(newPassword), label: 'Special character' },
                    ].map(({ test, label }) => (
                      <li key={label} className={`flex items-center gap-1 ${test ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {test ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Confirm new password"
                required
                minLength={12}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div className="bg-red-50 text-red-600 p-2 rounded-lg text-sm text-center border border-red-100">
                Passwords do not match
              </div>
            )}
            <button
              type="submit"
              disabled={resetLoading || !newPassword || newPassword !== confirmPassword}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {resetLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                window.location.hash = '';
              }}
              className="w-full py-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Login UI
  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full"
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
               }}
          />
        </div>

        {/* Logo - Top Left */}
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <img
            src="/mig-logo-white.svg"
            alt="MIG"
            className="h-8"
          />
          <div className="border-l border-slate-700 pl-3">
            <span className="text-white font-semibold text-lg">Nexus</span>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center justify-center w-full px-12 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-emerald-500 to-amber-500 rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">MIG Nexus</h1>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 rounded-full mb-4"></div>
          <p className="text-slate-400 text-center max-w-xs">
            Enterprise insurance management platform for Mosaic Insurance Group
          </p>
        </div>

        {/* Bottom */}
        <div className="absolute bottom-8 left-8 right-8">
          <p className="text-slate-500 text-xs text-center">
            © {new Date().getFullYear()} Mosaic Insurance Group. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Mobile Logo - Only shows on small screens */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <img
              src="/mig-logo-black.svg"
              alt="MIG"
              className="h-8"
            />
            <span className="text-slate-800 font-semibold">Nexus</span>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              Insurance Management System
            </h2>
            <p className="text-slate-500 mt-2">Sign in to continue</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-slate-900/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-6 text-slate-400">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle size={14} className="text-emerald-500" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle size={14} className="text-emerald-500" />
              <span>Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
