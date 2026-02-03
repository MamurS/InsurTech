
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';
import { Lock, Loader2, CheckCircle, Mail, Key } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password Reset State
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Get the redirect path from location state, or default to home
  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    // Check if this is a password reset link
    // Supabase sends: #access_token=xxx&type=recovery
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

    if (newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
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
        window.location.hash = ''; // Clear the URL hash
    } catch (err: any) {
        toast.error('Error updating password: ' + err.message);
    } finally {
        setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("Invalid login")) {
          setError("Invalid email or password.");
      } else if (err.message.includes("Email not confirmed")) {
          setError("Your email is not confirmed. Please check your inbox or ask the administrator to verify your email manually.");
      } else if (err.message.includes("User already registered")) {
          setError("User already exists. Please sign in.");
      } else {
          setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isResetMode) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-200">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-blue-50 text-blue-600">
                        <Lock size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
                    <p className="text-gray-500 mt-2 text-sm">Create a new secure password for your account.</p>
                </div>
                <form onSubmit={handlePasswordReset} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                                placeholder="Enter new password"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                                placeholder="Confirm new password"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <div className="bg-red-50 text-red-600 p-2 rounded-lg text-sm text-center border border-red-100">
                            Passwords do not match
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={resetLoading || !newPassword || newPassword !== confirmPassword}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {resetLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsResetMode(false);
                            window.location.hash = '';
                        }}
                        className="w-full py-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel */}
        <div className="p-12 md:w-1/2 flex flex-col justify-center relative overflow-hidden bg-slate-900 transition-colors duration-500">
          <div className="relative z-10 flex flex-col items-center text-center text-white">
            <div className="w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-blue-500 via-emerald-500 to-amber-500 flex items-center justify-center">
              <Lock size={36} className="text-white" />
            </div>

            <h1 className="text-3xl font-bold tracking-wide mb-4">Policy Manager</h1>

            <div className="w-16 h-1 bg-gradient-to-r mb-8 from-blue-500 via-emerald-500 to-amber-500"></div>

            <p className="text-slate-400 text-lg font-light">
              Comprehensive policy management platform
            </p>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="p-12 md:w-1/2 flex flex-col justify-center bg-white relative">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-gray-50 text-gray-800">
              <Lock size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
                System Access
            </h2>
            <p className="text-gray-500 mt-2">
                Internal Policy Management Portal
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center animate-in fade-in slide-in-from-top-1 border border-red-100 flex flex-col gap-2">
              <span>{error}</span>
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                </label>
                <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input 
                        type="text" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                        placeholder="admin@company.com"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                    <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 bg-slate-900 hover:bg-slate-800"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-auto pt-8 flex justify-center gap-6 text-gray-300">
             <div className="flex items-center gap-1 text-xs"><CheckCircle size={12}/> Secure</div>
             <div className="flex items-center gap-1 text-xs"><CheckCircle size={12}/> Encrypted</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
