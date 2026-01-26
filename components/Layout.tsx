
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MosaicLogo } from './MosaicLogo';
import { 
  LayoutDashboard, FileText, Settings, 
  FileSpreadsheet, Lock, PanelLeftClose, PanelLeftOpen, 
  LogOut, User as UserIcon, Building2, AlertOctagon, ClipboardList
} from 'lucide-react';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // RBAC: Only show Admin Console if user is Super Admin or Admin
  const canAccessAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      
      {/* Sidebar - RESTORED INSURTECH BRANDING */}
      <aside 
        className={`bg-slate-900 text-white flex-shrink-0 flex flex-col z-30 transition-all duration-300 ease-in-out shadow-xl relative
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}`}
      >
        <div className="p-6 border-b border-slate-700 flex items-center gap-3 whitespace-nowrap overflow-hidden h-20">
          <div className="flex-shrink-0">
             <MosaicLogo className="w-10 h-10" variant="color" withText={false} />
          </div>
          <div className={`transition-opacity duration-200 ${!isSidebarOpen && 'opacity-0'}`}>
            <h1 className="text-lg font-bold tracking-tight leading-tight">InsurTech<br/><span className="text-blue-400 font-normal text-sm">Policy Manager</span></h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <NavLink 
            end
            to="/" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
            }
            title="Dashboard"
          >
            <LayoutDashboard size={20} className="flex-shrink-0" />
            <span>Dashboard (DB)</span>
          </NavLink>

          <NavLink 
            to="/agenda" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
            }
            title="My Agenda"
          >
            <ClipboardList size={20} className="flex-shrink-0" />
            <span>My Agenda</span>
          </NavLink>

          <NavLink 
            to="/slips" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
            }
             title="Reinsurance Slips"
          >
            <FileSpreadsheet size={20} className="flex-shrink-0" />
            <span>Reinsurance Slips</span>
          </NavLink>

          <NavLink 
            to="/claims" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
            }
             title="Claims Center"
          >
            <AlertOctagon size={20} className="flex-shrink-0" />
            <span>Claims Center</span>
          </NavLink>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Configuration
          </div>

          <NavLink 
            to="/entities" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
            }
             title="Legal Entities"
          >
            <Building2 size={20} className="flex-shrink-0" />
            <span>Legal Entities</span>
          </NavLink>

          <NavLink 
            to="/clauses" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
            }
             title="Clause Library"
          >
            <FileText size={20} className="flex-shrink-0" />
            <span>Clause Library</span>
          </NavLink>

          {canAccessAdmin && (
             <NavLink 
              to="/admin" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap mt-2 ${isActive ? 'bg-emerald-800 text-emerald-100' : 'text-emerald-400 hover:bg-emerald-900/50'}`
              }
              title="Admin Console"
            >
              <Lock size={18} className="flex-shrink-0" />
              <span className="font-semibold">Admin Console</span>
            </NavLink>
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
