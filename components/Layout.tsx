
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MosaicLogo } from './MosaicLogo';
import {
  LayoutDashboard, FileText, Settings,
  FileSpreadsheet, Lock, PanelLeftClose, PanelLeftOpen,
  LogOut, User as UserIcon, Building2, AlertOctagon, ClipboardList,
  ChevronDown, ChevronRight, ArrowDownRight, Globe, Home
} from 'lucide-react';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInwardReinsuranceOpen, setIsInwardReinsuranceOpen] = useState(
    location.pathname.includes('/inward-reinsurance')
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getLinkClass = (path: string, exact: boolean = false) => {
    const isActive = exact 
      ? location.pathname === path 
      : location.pathname.startsWith(path);
      
    return `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`;
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      
      {/* Sidebar */}
      <aside 
        className={`bg-slate-900 text-white flex-shrink-0 flex flex-col z-30 transition-all duration-300 ease-in-out shadow-xl relative
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}`}
      >
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <Link 
            to="/" 
            className={getLinkClass('/', true)}
            title="Dashboard"
          >
            <LayoutDashboard size={20} className="flex-shrink-0" />
            <span>Dashboard (DB)</span>
          </Link>

          <Link 
            to="/agenda" 
            className={getLinkClass('/agenda')}
            title="My Agenda"
          >
            <ClipboardList size={20} className="flex-shrink-0" />
            <span>My Agenda</span>
          </Link>

          <Link 
              to="/slips" 
              className={getLinkClass('/slips')}
              title="Reinsurance Slips"
          >
              <FileSpreadsheet size={20} className="flex-shrink-0" />
              <span>Reinsurance Slips</span>
          </Link>

          <Link
              to="/claims"
              className={getLinkClass('/claims')}
              title="Claims Center"
          >
              <AlertOctagon size={20} className="flex-shrink-0" />
              <span>Claims Center</span>
          </Link>

          {/* Inward Reinsurance Collapsible Section */}
          <div className="pt-2">
            <button
              onClick={() => setIsInwardReinsuranceOpen(!isInwardReinsuranceOpen)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                location.pathname.includes('/inward-reinsurance')
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Inward Reinsurance"
            >
              <ArrowDownRight size={20} className="flex-shrink-0" />
              <span className="flex-1 text-left">Inward Reinsurance</span>
              {isInwardReinsuranceOpen ? (
                <ChevronDown size={16} className="flex-shrink-0" />
              ) : (
                <ChevronRight size={16} className="flex-shrink-0" />
              )}
            </button>

            {/* Nested Links */}
            {isInwardReinsuranceOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700 pl-2">
                <Link
                  to="/inward-reinsurance/foreign"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm whitespace-nowrap ${
                    location.pathname.includes('/inward-reinsurance/foreign')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Foreign/Overseas"
                >
                  <Globe size={16} className="flex-shrink-0" />
                  <span>Foreign</span>
                </Link>
                <Link
                  to="/inward-reinsurance/domestic"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm whitespace-nowrap ${
                    location.pathname.includes('/inward-reinsurance/domestic')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Domestic"
                >
                  <Home size={16} className="flex-shrink-0" />
                  <span>Domestic</span>
                </Link>
              </div>
            )}
          </div>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Configuration
          </div>

          <Link 
              to="/entities" 
              className={getLinkClass('/entities')}
              title="Legal Entities"
          >
              <Building2 size={20} className="flex-shrink-0" />
              <span>Legal Entities</span>
          </Link>

          <Link 
              to="/clauses" 
              className={getLinkClass('/clauses')}
              title="Clause Library"
          >
              <FileText size={20} className="flex-shrink-0" />
              <span>Clause Library</span>
          </Link>

          {/* Admin Console - Restricted to Super Admin and Admin only */}
          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
             <Link 
              to="/admin" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap mt-2 ${location.pathname.startsWith('/admin') ? 'bg-emerald-800 text-emerald-100' : 'text-emerald-400 hover:bg-emerald-900/50'}`}
              title="Admin Console"
            >
              <Lock size={18} className="flex-shrink-0" />
              <span className="font-semibold">Admin Console</span>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-950/50">
           {/* User Profile Snippet */}
           <div className="flex items-center gap-3 mb-4 px-2 whitespace-nowrap overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user?.avatarUrl || <UserIcon size={14}/>}
              </div>
              <div className="overflow-hidden">
                  <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.role}</div>
              </div>
           </div>

           <div className="space-y-1 whitespace-nowrap overflow-hidden">
              <div 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                title="Settings"
              >
                  <Settings size={18} className="flex-shrink-0" />
                  <span className="text-sm">Settings</span>
              </div>
               <div 
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:text-red-100 hover:bg-red-900/30 cursor-pointer transition-colors"
                title="Sign Out"
              >
                  <LogOut size={18} className="flex-shrink-0" />
                  <span className="text-sm">Sign Out</span>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full min-w-0">
          
          {/* Global Header (Fixed at top of content area) */}
          <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-20 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 text-slate-500 hover:bg-gray-100 hover:text-slate-800 rounded-lg transition-colors focus:outline-none"
                        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        {isSidebarOpen ? <PanelLeftClose size={24} /> : <PanelLeftOpen size={24} />}
                    </button>
                </div>

                {/* TOP RIGHT MOSAIC LOGO */}
                <div className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
                    <MosaicLogo className="h-10 w-auto" variant="color" withText={true} />
                </div>
          </header>

          {/* Scrollable Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
             <div className="w-full mx-auto">
                {children}
             </div>
          </main>
      </div>
    </div>
  );
};

export default Layout;
