import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { AuthService } from '../services/auth';
import { UserService } from '../services/userService';
import { PermissionService } from '../services/permissionService';
import { useAuth } from '../context/AuthContext';
import { useProfiles, useUpdateProfile } from '../hooks/useUsers';
import { Policy, ReinsuranceSlip, Clause, PolicyTemplate, UserRole, ExchangeRate, Currency, Profile, Role } from '../types';
import { formatDate } from '../utils/dateUtils';
import { RoleEditModal } from '../components/RoleEditModal';
import { 
  Trash2, RefreshCw, Users, 
  Lock, Table, Code, 
  Activity, ShieldCheck, FileText, Plus, Save, X, Edit, Loader2, Phone, AlertTriangle,
  Coins, LogOut, Key
} from 'lucide-react';

type Section = 'dashboard' | 'database' | 'recycle' | 'roles' | 'users' | 'settings' | 'templates' | 'fx';
type RecycleType = 'policies' | 'slips' | 'clauses';
type DbViewType = 'policies' | 'slips' | 'clauses';

const AdminConsole: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('roles'); // Default to roles for now
  const [isSidebarOpen] = useState(true);
  
  // Roles Management State
  const [roles, setRoles] = useState<Role[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined);

  // Recycle Bin State
  const [recycleType, setRecycleType] = useState<RecycleType>('policies');
  const [deletedPolicies, setDeletedPolicies] = useState<Policy[]>([]);
  const [deletedSlips, setDeletedSlips] = useState<ReinsuranceSlip[]>([]);
  const [deletedClauses, setDeletedClauses] = useState<Clause[]>([]);

  // Database Browser State
  const [dbViewType, setDbViewType] = useState<DbViewType>('policies');
  const [rawPolicies, setRawPolicies] = useState<Policy[]>([]);
  const [rawSlips, setRawSlips] = useState<ReinsuranceSlip[]>([]);
  const [rawClauses, setRawClauses] = useState<Clause[]>([]);

  // Templates State
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<PolicyTemplate>({
      id: '',
      name: '',
      description: '',
      content: ''
  });

  // FX Rates State
  const [fxRates, setFxRates] = useState<ExchangeRate[]>([]);
  const [newRate, setNewRate] = useState<Partial<ExchangeRate>>({
      currency: Currency.USD,
      rate: 1,
      date: new Date().toISOString().split('T')[0]
  });

  // User Management State (New Hook Implementation)
  const { data: profiles, isLoading: loadingProfiles, refetch: refetchProfiles } = useProfiles();
  const updateProfileMutation = useUpdateProfile();
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<Profile>>({
      fullName: '',
      email: '',
      role: 'Underwriter',
      department: '',
      phone: '',
      isActive: true
  });
  const [newUserPassword, setNewUserPassword] = useState(''); // Only for new users
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Stats for Dashboard
  const stats = {
    totalPolicies: rawPolicies.length,
    totalSlips: rawSlips.length,
    totalClauses: rawClauses.length,
    deletedItems: deletedPolicies.length + deletedSlips.length + deletedClauses.length
  };

  const loadAllData = async () => {
    setLoading(true);
    const [p, s, c, t, fx, r] = await Promise.all([
        DB.getAllPolicies(), 
        DB.getAllSlips(), 
        DB.getAllClauses(), 
        DB.getTemplates(),
        DB.getExchangeRates(),
        PermissionService.getRoles()
    ]);
    setRawPolicies(p);
    setRawSlips(s);
    setRawClauses(c);
    setTemplates(t);
    setFxRates(fx);
    setRoles(r);

    const [dp, ds, dc] = await Promise.all([DB.getDeletedPolicies(), DB.getDeletedSlips(), DB.getDeletedClauses()]);
    setDeletedPolicies(dp);
    setDeletedSlips(ds);
    setDeletedClauses(dc);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [activeSection, dbViewType, recycleType]);

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (recycleType === 'policies') await DB.restorePolicy(id);
    if (recycleType === 'slips') await DB.restoreSlip(id);
    if (recycleType === 'clauses') await DB.restoreClause(id);
    loadAllData();
  };

  const handleHardDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure? This action is irreversible.")) {
        if (recycleType === 'policies') await DB.hardDeletePolicy(id);
        if (recycleType === 'slips') await DB.hardDeleteSlip(id);
        if (recycleType === 'clauses') await DB.hardDeleteClause(id);
        loadAllData();
    }
  };

  // FX Handlers
  const handleAddFx = async () => {
      if (!newRate.rate || !newRate.currency) return;
      await DB.saveExchangeRate({
          id: crypto.randomUUID(),
          currency: newRate.currency!,
          rate: Number(newRate.rate),
          date: newRate.date || new Date().toISOString().split('T')[0]
      });
      loadAllData();
      setNewRate({ ...newRate, rate: 0 }); // Reset rate
  };

  const handleDeleteFx = async (id: string) => {
      if(confirm("Delete this exchange rate?")) {
          await DB.deleteExchangeRate(id);
          loadAllData();
      }
  };

  // Template Handlers
  const handleEditTemplate = (tpl?: PolicyTemplate) => {
      if (tpl) {
          setCurrentTemplate(tpl);
      } else {
          setCurrentTemplate({ id: crypto.randomUUID(), name: '', description: '', content: '' });
      }
      setIsEditingTemplate(true);
  };

  const handleSaveTemplate = async () => {
      if (!currentTemplate.name || !currentTemplate.content) {
          alert("Name and Content are required");
          return;
      }
      await DB.saveTemplate(currentTemplate);
      setIsEditingTemplate(false);
      loadAllData();
  };

  const handleDeleteTemplate = async (id: string) => {
      if(confirm("Delete this template?")) {
          await DB.deleteTemplate(id);
          loadAllData();
      }
  }

  // User Handlers
  const handleEditUser = (u?: Profile) => {
      setNewUserPassword('');
      if (u) {
          setCurrentUser(u);
      } else {
          setCurrentUser({
              fullName: '',
              email: '',
              role: 'Underwriter',
              department: '',
              phone: '',
              isActive: true,
              avatarUrl: 'NU'
          });
      }
      setShowUserModal(true);
  };

  const handleSaveUser = async () => {
      if (!currentUser.fullName || !currentUser.email) {
          alert("Name and Email are required");
          return;
      }

      setActionLoading(true);
      try {
        if (!currentUser.id) {
            // New Registration via Auth Service (if Supabase)
            if (!newUserPassword) {
                alert("Password required for new user");
                setActionLoading(false);
                return;
            }
            await AuthService.register(
                currentUser.email,
                newUserPassword,
                currentUser.fullName,
                currentUser.role as UserRole
            );
            // Additional profile updates if needed via separate call
        } else {
             // Update existing profile
             updateProfileMutation.mutate({
                 id: currentUser.id,
                 updates: currentUser
             });
        }
        setShowUserModal(false);
        refetchProfiles();
      } catch (error: any) {
          console.error("Save failed:", error);
          alert("Failed to save user: " + (error.message || "Unknown error"));
      } finally {
          setActionLoading(false);
      }
  };

  // Role Handlers
  const handleEditRole = (r?: Role) => {
      setSelectedRole(r);
      setShowRoleModal(true);
  };

  const handleRoleSaved = () => {
      loadAllData();
  };

  // --- SUB-COMPONENT RENDERERS ---

  const renderDashboardHome = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-800">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-gray-500 text-sm font-medium mb-2">Total Policies</div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalPolicies}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-gray-500 text-sm font-medium mb-2">Reinsurance Slips</div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalSlips}</div>
            </div>
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-gray-500 text-sm font-medium mb-2">Clause Library</div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalClauses}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-gray-500 text-sm font-medium mb-2">Deleted Items</div>
                <div className="text-3xl font-bold text-red-600">{stats.deletedItems}</div>
            </div>
        </div>
    </div>
  );

  const renderRoles = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold text-gray-800">RBAC Roles</h2>
                  <p className="text-sm text-gray-500">Manage hierarchical roles and permissions.</p>
              </div>
              <button 
                  onClick={() => handleEditRole()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                  <Plus size={18}/> Add Role
              </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-700">
                      <tr>
                          <th className="px-6 py-4 w-12">Lvl</th>
                          <th className="px-6 py-4">Role Name</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4 text-center">System</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {roles.map(role => (
                          <tr key={role.id} className="hover:bg-gray-50 group">
                              <td className="px-6 py-4 font-mono text-gray-500 font-bold">{role.level}</td>
                              <td className="px-6 py-4">
                                  <div className="font-bold text-gray-900">{role.name}</div>
                                  <div className="text-xs text-gray-500">{role.description}</div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{role.department || '-'}</td>
                              <td className="px-6 py-4 text-center">
                                  {role.isSystemRole && <Lock size={14} className="inline text-amber-500" title="System Role"/>}
                              </td>
                              <td className="px-6 py-4 text-center">
                                  {role.isActive 
                                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Active</span>
                                      : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">Inactive</span>
                                  }
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button onClick={() => handleEditRole(role)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Edit size={16}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          
          {showRoleModal && (
              <RoleEditModal 
                  role={selectedRole}
                  onClose={() => setShowRoleModal(false)}
                  onSave={handleRoleSaved}
              />
          )}
      </div>
  );

  const renderUsers = () => {
    return (
     <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
            <button 
                onClick={() => handleEditUser()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
                <Plus size={18}/> Add User
            </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
            <div className="p-4 border-b bg-blue-50 text-blue-800 text-sm flex items-center gap-2">
                <ShieldCheck size={16} />
                <span>Internal System Users ({profiles?.length || 0})</span>
            </div>
            {loadingProfiles ? (
                <div className="p-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24}/>
                    <p>Loading user directory...</p>
                </div>
            ) : (!profiles || profiles.length === 0) ? (
                <div className="p-12 text-center bg-gray-50 text-gray-500">
                    <Users className="mx-auto mb-4 opacity-20" size={48}/>
                    <h3 className="font-bold text-gray-700">No Users Found</h3>
                    <p className="text-sm mb-4">The public user directory appears empty. Check database permissions.</p>
                    <button onClick={() => refetchProfiles()} className="text-blue-600 hover:underline text-sm font-bold flex items-center justify-center gap-2">
                        <RefreshCw size={14}/> Retry Fetch
                    </button>
                </div>
            ) : (
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <th className="px-6 py-4">User Identity</th>
                            <th className="px-6 py-4">Role & Department</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {profiles.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                                            {u.avatarUrl || u.fullName.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{u.fullName}</div>
                                            <div className="text-sm text-gray-500">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        u.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' : 
                                        u.role === 'Admin' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {u.role}
                                    </span>
                                    <div className="text-xs text-gray-500 mt-1">{u.department || 'No Dept'}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {u.isActive 
                                        ? <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Active</span>
                                        : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">Inactive</span>
                                    }
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleEditUser(u)} 
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit User"
                                        >
                                            <Edit size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

        {/* User Modal */}
        {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0 bg-gray-50 z-10">
                        <h3 className="font-bold text-gray-800">{currentUser.id ? 'Edit User Profile' : 'Create New User'}</h3>
                        <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                            <input 
                                className="w-full bg-white border rounded p-2 text-gray-900" 
                                value={currentUser.fullName} 
                                onChange={e => setCurrentUser({...currentUser, fullName: e.target.value})}
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Email (Login)</label>
                            <input 
                                className="w-full bg-white border rounded p-2 text-gray-900" 
                                value={currentUser.email} 
                                onChange={e => setCurrentUser({...currentUser, email: e.target.value})}
                                placeholder="john@example.com"
                                disabled={!!currentUser.id} 
                            />
                        </div>
                        
                        {!currentUser.id && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                                <input 
                                    type="password"
                                    className="w-full bg-white border rounded p-2 text-gray-900" 
                                    value={newUserPassword} 
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    placeholder="Temp password..."
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Legacy Role</label>
                                <select 
                                    className="w-full bg-white border rounded p-2 text-gray-900"
                                    value={currentUser.role}
                                    onChange={e => setCurrentUser({...currentUser, role: e.target.value as UserRole})}
                                >
                                    <option value="Super Admin">Super Admin</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Underwriter">Underwriter</option>
                                    <option value="Viewer">Viewer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Department</label>
                                <input 
                                    className="w-full bg-white border rounded p-2 text-gray-900" 
                                    value={currentUser.department} 
                                    onChange={e => setCurrentUser({...currentUser, department: e.target.value})}
                                    placeholder="e.g. Marine"
                                />
                            </div>
                        </div>

                        {/* RBAC Role Selection */}
                        <div className="border-t pt-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1">RBAC Role Assignment</label>
                            <p className="text-xs text-gray-500 mb-2">This overrides the legacy role for permission checks.</p>
                            <select 
                                className="w-full bg-white border rounded p-2 text-gray-900"
                                value={currentUser.roleId || ''}
                                onChange={e => {
                                    const selectedId = e.target.value;
                                    const roleObj = roles.find(r => r.id === selectedId);
                                    // Optionally sync the legacy string if needed, or just set ID
                                    setCurrentUser({ ...currentUser, roleId: selectedId });
                                }}
                            >
                                <option value="">-- Select System Role --</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} (Lvl {r.level})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input 
                                    className="w-full pl-9 bg-white border rounded p-2 text-gray-900" 
                                    value={currentUser.phone} 
                                    onChange={e => setCurrentUser({...currentUser, phone: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <input 
                                type="checkbox" 
                                id="activeUser"
                                checked={currentUser.isActive !== false}
                                onChange={e => setCurrentUser({...currentUser, isActive: e.target.checked})}
                            />
                            <label htmlFor="activeUser" className="text-sm text-gray-700">User is Active (can login)</label>
                        </div>
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0 z-10">
                        <button 
                            onClick={() => setShowUserModal(false)} 
                            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg"
                            disabled={actionLoading}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveUser} 
                            disabled={actionLoading}
                            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:opacity-70"
                        >
                            {actionLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                            Save User
                        </button>
                    </div>
                </div>
            </div>
        )}
     </div>
    );
  };

  const renderSettings = () => (
     <div className="max-w-xl space-y-6 animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-800">System Maintenance</h2>
        
        {user?.role === 'Super Admin' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-red-500">
            <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2"><AlertTriangle size={20}/> Danger Zone</h3>
            <p className="text-sm text-gray-600 mb-6">Operations here are destructive and cannot be undone.</p>
            
            <button 
                onClick={() => {
                    if(confirm("CRITICAL: Wipe entire database?")) {
                        localStorage.clear();
                        window.location.reload();
                    }
                }}
                className="w-full py-3 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-100 transition-colors"
            >
                Factory Reset / Wipe Data
            </button>
        </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 text-gray-500">
                    <ShieldCheck size={24} />
                    <div>
                        <h3 className="font-bold text-gray-800">Restricted Area</h3>
                        <p className="text-sm">Only Super Administrators can access system reset functions.</p>
                    </div>
                </div>
            </div>
        )}
     </div>
  );

  const renderDatabaseBrowser = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Database Browser</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['policies', 'slips', 'clauses'] as const).map(view => (
            <button
              key={view}
              onClick={() => setDbViewType(view)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${dbViewType === view ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 sticky top-0">
              <tr>
                {dbViewType === 'policies' && <>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Policy No</th>
                  <th className="px-6 py-3">Insured</th>
                  <th className="px-6 py-3">Status</th>
                </>}
                {dbViewType === 'slips' && <>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Slip No</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Insured</th>
                </>}
                {dbViewType === 'clauses' && <>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Type</th>
                </>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {dbViewType === 'policies' && rawPolicies.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.id.substring(0, 8)}...</td>
                  <td className="px-6 py-3">{p.policyNumber}</td>
                  <td className="px-6 py-3">{p.insuredName}</td>
                  <td className="px-6 py-3">{p.status}</td>
                </tr>
              ))}
              {dbViewType === 'slips' && rawSlips.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{s.id.substring(0, 8)}...</td>
                  <td className="px-6 py-3">{s.slipNumber}</td>
                  <td className="px-6 py-3">{formatDate(s.date)}</td>
                  <td className="px-6 py-3">{s.insuredName}</td>
                </tr>
              ))}
              {dbViewType === 'clauses' && rawClauses.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{c.id.substring(0, 8)}...</td>
                  <td className="px-6 py-3">{c.title}</td>
                  <td className="px-6 py-3">{c.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRecycleBin = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Recycle Bin</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['policies', 'slips', 'clauses'] as const).map(type => (
            <button
              key={type}
              onClick={() => setRecycleType(type)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${recycleType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-red-50 text-red-900">
            <tr>
              <th className="px-6 py-3">Item Reference</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recycleType === 'policies' && deletedPolicies.map(p => (
              <tr key={p.id} className="hover:bg-red-50/30">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{p.policyNumber}</div>
                  <div className="text-xs text-gray-500">{p.insuredName}</div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={(e) => handleRestore(e, p.id)} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded border border-green-200 text-xs font-bold">Restore</button>
                  <button onClick={(e) => handleHardDelete(e, p.id)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded border border-red-200 text-xs font-bold">Delete Forever</button>
                </td>
              </tr>
            ))}
            {recycleType === 'slips' && deletedSlips.map(s => (
              <tr key={s.id} className="hover:bg-red-50/30">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{s.slipNumber}</div>
                  <div className="text-xs text-gray-500">{s.insuredName}</div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={(e) => handleRestore(e, s.id)} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded border border-green-200 text-xs font-bold">Restore</button>
                  <button onClick={(e) => handleHardDelete(e, s.id)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded border border-red-200 text-xs font-bold">Delete Forever</button>
                </td>
              </tr>
            ))}
            {recycleType === 'clauses' && deletedClauses.map(c => (
              <tr key={c.id} className="hover:bg-red-50/30">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{c.title}</div>
                  <div className="text-xs text-gray-500">{c.category}</div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={(e) => handleRestore(e, c.id)} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded border border-green-200 text-xs font-bold">Restore</button>
                  <button onClick={(e) => handleHardDelete(e, c.id)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded border border-red-200 text-xs font-bold">Delete Forever</button>
                </td>
              </tr>
            ))}
            {((recycleType === 'policies' && deletedPolicies.length === 0) ||
              (recycleType === 'slips' && deletedSlips.length === 0) ||
              (recycleType === 'clauses' && deletedClauses.length === 0)) && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-400">Bin is empty.</td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Policy Templates</h2>
        <button onClick={() => handleEditTemplate()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus size={18} /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-900 mb-1">{t.name}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{t.description || 'No description'}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => handleEditTemplate(t)} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium">Edit</button>
              <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {isEditingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Template Editor</h3>
              <button onClick={() => setIsEditingTemplate(false)}><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Template Name</label>
                <input className="w-full border rounded p-2" value={currentTemplate.name} onChange={e => setCurrentTemplate({ ...currentTemplate, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <input className="w-full border rounded p-2" value={currentTemplate.description} onChange={e => setCurrentTemplate({ ...currentTemplate, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">HTML Content</label>
                <div className="text-xs text-gray-500 mb-2">Supported Placeholders: {'{{policyNumber}}'}, {'{{insuredName}}'}, {'{{grossPremium}}'}, etc.</div>
                <textarea className="w-full border rounded p-2 h-64 font-mono text-sm" value={currentTemplate.content} onChange={e => setCurrentTemplate({ ...currentTemplate, content: e.target.value })} />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setIsEditingTemplate(false)} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
              <button onClick={handleSaveTemplate} className="px-4 py-2 bg-blue-600 text-white font-bold rounded">Save Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFxRates = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-gray-800">Exchange Rates</h2>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Plus size={18} /> Add New Rate</h3>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
            <select
              className="w-32 p-2 border rounded bg-white"
              value={newRate.currency}
              onChange={e => setNewRate({ ...newRate, currency: e.target.value as any })}
            >
              {Object.values(Currency).filter(c => c !== 'UZS').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rate (UZS)</label>
            <input
              type="number"
              className="w-40 p-2 border rounded"
              value={newRate.rate || ''}
              onChange={e => setNewRate({ ...newRate, rate: Number(e.target.value) })}
              placeholder="e.g. 12500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
            <input
              type="date"
              className="w-40 p-2 border rounded"
              value={newRate.date}
              onChange={e => setNewRate({ ...newRate, date: e.target.value })}
            />
          </div>
          <button onClick={handleAddFx} className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700">Add Rate</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-6 py-3">Currency</th>
              <th className="px-6 py-3">Rate (to UZS)</th>
              <th className="px-6 py-3">Effective Date</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fxRates.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-bold">{r.currency}</td>
                <td className="px-6 py-3">{r.rate.toLocaleString()}</td>
                <td className="px-6 py-3">{formatDate(r.date)}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => handleDeleteFx(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {fxRates.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-400">No rates defined.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-100 font-sans">
        
        {/* Admin Sidebar */}
        <aside 
            className={`bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 shadow-xl z-20 fixed h-full transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}`}
        >
            <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 whitespace-nowrap overflow-hidden">
                <div className="font-bold text-white tracking-wider flex items-center gap-2">
                    <Lock size={18} className="text-emerald-500 flex-shrink-0" /> 
                    <span className={`transition-opacity duration-200 ${!isSidebarOpen && 'opacity-0'}`}>ADMIN<span className="text-slate-600">PANEL</span></span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
                <div className="text-xs font-bold text-slate-600 uppercase mb-2 px-2 mt-2 whitespace-nowrap">Platform</div>
                <button 
                    onClick={() => setActiveSection('dashboard')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <Activity size={18} className="flex-shrink-0" /> <span>Dashboard</span>
                </button>

                <div className="text-xs font-bold text-slate-600 uppercase mb-2 px-2 mt-6 whitespace-nowrap">Access Control</div>
                <button 
                    onClick={() => setActiveSection('roles')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'roles' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <Key size={18} className="flex-shrink-0" /> <span>Roles & Permissions</span>
                </button>
                <button 
                    onClick={() => setActiveSection('users')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'users' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <Users size={18} className="flex-shrink-0" /> <span>User Management</span>
                </button>

                <div className="text-xs font-bold text-slate-600 uppercase mb-2 px-2 mt-6 whitespace-nowrap">Data Management</div>
                <button 
                    onClick={() => setActiveSection('database')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'database' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <Table size={18} className="flex-shrink-0" /> <span>Database Browser</span>
                </button>
                 <button 
                    onClick={() => setActiveSection('recycle')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'recycle' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <Trash2 size={18} className="flex-shrink-0" /> <span>Recycle Bin</span>
                </button>

                <div className="text-xs font-bold text-slate-600 uppercase mb-2 px-2 mt-6 whitespace-nowrap">Configuration</div>
                <button 
                    onClick={() => setActiveSection('templates')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'templates' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <FileText size={18} className="flex-shrink-0" /> <span>Policy Templates</span>
                </button>
                <button 
                    onClick={() => setActiveSection('fx')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'fx' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <Coins size={18} className="flex-shrink-0" /> <span>FX Rates</span>
                </button>

                <div className="text-xs font-bold text-slate-600 uppercase mb-2 px-2 mt-6 whitespace-nowrap">System</div>
                <button 
                    onClick={() => setActiveSection('settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'settings' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <AlertTriangle size={18} className="flex-shrink-0" /> <span>Maintenance</span>
                </button>
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                <button 
                    onClick={() => navigate('/')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                >
                    <LogOut size={16} /> Exit Console
                </button>
            </div>
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto p-8 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
            {activeSection === 'dashboard' && renderDashboardHome()}
            {activeSection === 'roles' && renderRoles()}
            {activeSection === 'database' && renderDatabaseBrowser()}
            {activeSection === 'recycle' && renderRecycleBin()}
            {activeSection === 'users' && renderUsers()}
            {activeSection === 'templates' && renderTemplates()}
            {activeSection === 'fx' && renderFxRates()}
            {activeSection === 'settings' && renderSettings()}
        </main>
    </div>
  );
};

export default AdminConsole;