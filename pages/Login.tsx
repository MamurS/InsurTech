
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MosaicLogo } from '../components/MosaicLogo';
import { Lock, Loader2, CheckCircle, Mail, Key } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Get the redirect path from location state, or default to home
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel: Branding (Black Background like Presentation Cover) */}
        <div className="bg-black text-white p-12 md:w-1/2 flex flex-col justify-center relative overflow-hidden">
          
          {/* Background Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-[0.05] pointer-events-none">
             <MosaicLogo className="w-full h-full" variant="monochrome" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <MosaicLogo className="w-32 h-32 mb-8" variant="color" />
            
            <h1 className="text-4xl font-light tracking-wide mb-2">InsurTech</h1>
            <h1 className="text-4xl font-bold tracking-wide mb-8">Solutions</h1>
            
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 mb-8"></div>
            
            <p className="text-gray-400 text-lg font-light italic">
              "Look to the future with confidence"
            </p>
          </div>

          <div className="relative z-10 mt-12 space-y-3 text-sm text-gray-500 text-center">
             <p>A comprehensive platform for modern policy management.</p>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="p-12 md:w-1/2 flex flex-col justify-center bg-white relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-800 mb-4">
              <Lock size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">System Access</h2>
            <p className="text-gray-500 mt-2">Internal Policy Management Portal</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input 
                        type="text" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                        placeholder="admin2026"
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
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center bg-gray-50 p-4 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Default Credentials</p>
              <div className="text-xs text-gray-600 font-mono space-y-1">
                  <div>User: admin2026</div>
                  <div>Pass: X7#k9@mP2$vL5nQ!</div>
              </div>
          </div>

          <div className="mt-auto pt-8 flex justify-center gap-6 text-gray-300">
             <div className="flex items-center gap-1 text-xs"><CheckCircle size={12}/> Secure</div>
             <div className="flex items-center gap-1 text-xs"><CheckCircle size={12}/> Encrypted</div>
             <div className="flex items-center gap-1 text-xs"><CheckCircle size={12}/> Private</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
