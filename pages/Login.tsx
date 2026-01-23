
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DB } from '../services/db';
import { MosaicLogo } from '../components/MosaicLogo';
import { Lock, Loader2, CheckCircle, Mail, Key, User, ArrowRight, AlertTriangle, WifiOff, Wifi } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, register } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(DB.isOfflineMode());
  
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
        setSuccessMsg('Account created successfully! Check your email to confirm, or ask Admin to disable confirmation.');
        setTimeout(() => {
             navigate(from, { replace: true });
        }, 1500);
      } else {
        await signIn(email, password);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("Invalid login")) {
          setError("Invalid email or password.");
      } else if (err.message.includes("Email not confirmed")) {
          setError("Your email is not confirmed. Please check your inbox or switch to Offline Mode if you are the admin and cannot access email settings.");
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

  const toggleOfflineMode = () => {
      const newState = !isOfflineMode;
      setIsOfflineMode(newState);
      DB.setOfflineMode(newState);
      setError('');
      // If switching to offline mode, autofill default credentials for convenience
      if (newState) {
          setEmail('admin2026');
          setPassword('X7#k9@mP2$vL5nQ!');
          setSuccessMsg("Offline Mode Active: Using local browser storage. Default credentials applied.");
      } else {
          setEmail('');
          setPassword('');
          setSuccessMsg('');
      }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel: Branding */}
        <div className={`p-12 md:w-1/2 flex flex-col justify-center relative overflow-hidden transition-colors duration-500 ${isOfflineMode ? 'bg-gray-900' : 'bg-black'}`}>
          {/* Background Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-[0.05] pointer-events-none">
             <MosaicLogo className="w-full h-full" variant="monochrome" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center text-white">
            <MosaicLogo className="w-32 h-32 mb-8" variant="color" />
            
            <h1 className="text-4xl font-light tracking-wide mb-2">InsurTech</h1>
            <h1 className="text-4xl font-bold tracking-wide mb-8">Solutions</h1>
            
            <div className={`w-16 h-1 bg-gradient-to-r mb-8 ${isOfflineMode ? 'from-gray-500 to-gray-700' : 'from-blue-500 via-green-500 to-red-500'}`}></div>
            
            <p className="text-gray-400 text-lg font-light italic">
              {isOfflineMode ? "System Maintenance Mode" : "Look to the future with confidence"}
            </p>
          </div>

          <div className="relative z-10 mt-12 space-y-3 text-sm text-gray-500 text-center">
             <p>A comprehensive platform for modern policy management.</p>
          </div>
        </div>

        {/* Right Panel: Login/Signup Form */}
        <div className="p-12 md:w-1/2 flex flex-col justify-center bg-white relative">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${isOfflineMode ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-800'}`}>
              {isOfflineMode ? <WifiOff size={24}/> : <Lock size={24} />}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
                {isOfflineMode ? 'Emergency Offline Mode' : (isSignUp ? 'Create Account' : 'System Access')}
            </h2>
            <p className="text-gray-500 mt-2">
                {isOfflineMode 
                    ? 'Using Local Browser Storage (Disconnected from Server)' 
                    : (isSignUp ? 'Register a new administrator' : 'Internal Policy Management Portal')}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center animate-in fade-in slide-in-from-top-1 border border-red-100 flex flex-col gap-2">
              <span>{error}</span>
              {error.includes("Email not confirmed") && (
                   <button 
                     type="button" 
                     onClick={toggleOfflineMode}
                     className="text-xs font-bold underline hover:text-red-800"
                   >
                       Switch to Offline Mode to bypass check
                   </button>
              )}
            </div>
          )}
          
          {successMsg && (
             <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-6 text-center animate-in fade-in slide-in-from-top-1 border border-green-100">
              {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && !isOfflineMode && (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isOfflineMode ? 'Offline Username' : 'Email Address'}
                </label>
                <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input 
                        type="text" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                        placeholder={isOfflineMode ? "admin2026" : "admin@company.com"}
                        readOnly={isOfflineMode} // In offline mode, credentials are fixed or local only
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
                        readOnly={isOfflineMode}
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 ${isOfflineMode ? 'bg-amber-600 hover:bg-amber-700' : (isSignUp ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800')}`}
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isOfflineMode ? 'Enter Safe Mode' : (isSignUp ? 'Create Account' : 'Sign In'))}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
               {!isOfflineMode && (
                   <div className="mb-4">
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
               )}
               
               <button 
                  type="button"
                  onClick={toggleOfflineMode}
                  className={`text-xs font-bold flex items-center justify-center gap-1 mx-auto transition-colors border px-3 py-1 rounded-full ${isOfflineMode ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}
                >
                  {isOfflineMode ? <><Wifi size={12}/> Switch to Online Mode</> : <><WifiOff size={12}/> Trouble logging in? Use Offline Mode</>}
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
