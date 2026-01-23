
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MosaicLogo } from '../components/MosaicLogo';
import { Lock, Loader2, CheckCircle, Mail, Key, User, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, register } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Get the redirect path from location state, or default to home
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        await register(email, password, name);
        // If we reach here, check if we were auto-logged in (Supabase setting dependent)
        setSuccessMsg('Account created successfully! Attempting to log in...');
        
        // Short delay to show success before redirecting or asking for email confirm
        setTimeout(() => {
             // If email confirm is ON in Supabase, the auth context might not have a user yet.
             // But we try to redirect anyway, AuthContext will handle state.
             navigate(from, { replace: true });
        }, 1500);
      } else {
        await signIn(email, password);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("Invalid login")) {
          setError("Invalid email or password. If you recently connected a database, your local admin account does not exist here. Please create a new account.");
      } else if (err.message.includes("User already registered")) {
          setError("User already exists. Please sign in.");
      } else {
          setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
      setIsSignUp(!isSignUp);
      setError('');
      setSuccessMsg('');
      setPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel: Branding */}
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

        {/* Right Panel: Login/Signup Form */}
        <div className="p-12 md:w-1/2 flex flex-col justify-center bg-white relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-800 mb-4">
              <Lock size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{isSignUp ? 'Create Account' : 'System Access'}</h2>
            <p className="text-gray-500 mt-2">{isSignUp ? 'Register a new administrator' : 'Internal Policy Management Portal'}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center animate-in fade-in slide-in-from-top-1 border border-red-100">
              {error}
            </div>
          )}
          
          {successMsg && (
             <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-6 text-center animate-in fade-in slide-in-from-top-1 border border-green-100">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input 
                            type="text" 
                            required={isSignUp}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                            placeholder="John Doe"
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input 
                        type="email" 
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
                        minLength={6}
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 ${isSignUp ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
               <p className="text-sm text-gray-600 mb-3">
                   {isSignUp ? "Already have an account?" : "Using a new database?"}
               </p>
               <button 
                  type="button"
                  onClick={toggleMode}
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
                >
                  {isSignUp ? "Back to Login" : "Create Admin Account"} <ArrowRight size={14}/>
               </button>
          </div>

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
