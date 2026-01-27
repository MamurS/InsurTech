
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { AuthService } from '../services/auth';
import { UserService } from '../services/userService';
import { PermissionService } from '../services/permissionService';
import { useAuth } from '../context/AuthContext';
import { useProfiles, useUpdateProfile } from '../hooks/useUsers';
import { Policy, ReinsuranceSlip, Clause, PolicyTemplate, UserRole, ExchangeRate, Currency, Profile, Role, Department } from '../types';
import { formatDate } from '../utils/dateUtils';
import { RoleEditModal } from '../components/RoleEditModal';
import { supabase } from '../services/supabase'; // Import direct for custom save
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
  const [activeSection, setActiveSection] = useState<Section>('roles'); 
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

  // User Management State
  const { data: profiles, isLoading: loadingProfiles, refetch: refetchProfiles } = useProfiles();
  const updateProfileMutation = useUpdateProfile();
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<Profile>>({
      fullName: '',
      email: '',
      role: 'Underwriter',
      roleId: '',
      department: '',
      departmentId: '',
      phone: '',
      isActive: true
  });
  const [newUserPassword, setNewUserPassword] = useState(''); 
  const [departments, setDepartments] = useState<Department[]>([]);
  
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
    const [p, s, c, t, fx, r, d] = await Promise.all([
        DB.getAllPolicies(), 
        DB.getAllSlips(), 
        DB.getAllClauses(), 
        DB.getTemplates(),
        DB.getExchangeRates(),
        PermissionService.getRoles(),
        UserService.getDepartments()
    ]);
    setRawPolicies(p);
    setRawSlips(s);
    setRawClauses(c);
    setTemplates(t);
    setFxRates(fx);
    setRoles(r);
    setDepartments(d);

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
          setCurrentUser({
              ...u,
              roleId: u.roleId || '',
              departmentId: u.departmentId || '',
          });
      } else {
          setCurrentUser({
              fullName: '',
              email: '',
              role: 'Underwriter',
              roleId: '',
              department: '',
              departmentId: '',
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
            // NEW USER
            if (!newUserPassword) {
                alert("Password required for new user");
                setActionLoading(false);
                return;
            }
            
            // Register creates auth user and basic profile in 'profiles' via Auth Service
            const newUser = await AuthService.register(
                currentUser.email,
                newUserPassword,
                currentUser.fullName
            );
            
            // Update profile with additional fields - use 'profiles' table
            // Note: register returns User object, we access .id from it
            if (newUser && newUser.id && supabase) {
                const { error } = await supabase
                    .from('profiles')  // CORRECT TABLE
                    .update({
                        full_name: currentUser.fullName,
                        role_id: currentUser.roleId || null,
                        department: currentUser.department || null,
                        department_id: currentUser.departmentId || null,
                        phone: currentUser.phone || null,
                        is_active: currentUser.isActive !== false,
                        role: roles?.find(r => r.id === currentUser.roleId)?.name || 'Underwriter'
                    })
                    .eq('id', newUser.id);
                
                if (error) throw error;
            }
        } else {
            // EXISTING USER - use 'profiles' table
            if (!supabase) throw new Error('No database connection');
            
            const { error } = await supabase
                .from('profiles')  // CORRECT TABLE
                .update({
                    full_name: currentUser.fullName,
                    role_id: currentUser.roleId || null,
                    department: currentUser.department || null,
                    department_id: currentUser.departmentId || null,
                    phone: currentUser.phone || null,
                    is_active: currentUser.isActive !== false,
                    role: roles?.find(r => r.id === currentUser.roleId)?.name || currentUser.role
                })
                .eq('id', currentUser.id);
            
            if (error) throw error;
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

  const handleDeleteUser = async (id: string, name: string) => {
      if (confirm(`Are you sure you want to PERMANENTLY delete user "${name}"? This action cannot be undone and will remove login access.`)) {
          setActionLoading(true);
          try {
              await UserService.deleteUser(id);
              refetchProfiles();
          } catch (error: any) {
              alert("Failed to delete user: " + error.message);
          } finally {
              setActionLoading(false);
          }
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
                                        <button 
                                            onClick={() => handleDeleteUser(u.id, u.fullName)} 
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 size={16}/>
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
                                <label className="block text-sm font-bold text-gray-700 mb-1">Role Assignment</label>
                                <select 
                                    className="w-full bg-white border rounded p-2 text-gray-900"
                                    value={currentUser.roleId || ''}
                                    onChange={e => setCurrentUser({...currentUser, roleId: e.target.value})}
                                >
                                    <option value="">Select Role...</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} {r.department ? `(${r.department})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Department</label>
                                <select 
                                    className="w-full bg-white border rounded p-2 text-gray-900"
                                    value={currentUser.departmentId || ''}
                                    onChange={e => {
                                        const dept = departments.find(d => d.id === e.target.value);
                                        setCurrentUser({
                                            ...currentUser, 
                                            departmentId: e.target.value,
                                            department: dept?.name || ''
                                        });
                                    }}
                                >
                                    <option value="">Select Department...</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name} {dept.code ? `(${dept.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
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

  const renderDatabaseBrowser = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Database Browser</h2>
            <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                {(['policies', 'slips', 'clauses'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setDbViewType(type)}
                        className={`px-4 py-2 text-sm font-bold capitalize rounded-md transition-colors ${dbViewType === type ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0">
                        <tr>
                            <th className="px-6 py-3 border-b">ID</th>
                            <th className="px-6 py-3 border-b">Reference / Name</th>
                            <th className="px-6 py-3 border-b">Status / Details</th>
                            <th className="px-6 py-3 border-b text-right">Raw Data</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {dbViewType === 'policies' && rawPolicies.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.id.substring(0,8)}...</td>
                                <td className="px-6 py-3 font-medium">{p.policyNumber}</td>
                                <td className="px-6 py-3">{p.status} | {p.insuredName}</td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => console.log(p)} className="text-blue-600 hover:underline text-xs">Log to Console</button>
                                </td>
                            </tr>
                        ))}
                        {dbViewType === 'slips' && rawSlips.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-mono text-xs text-gray-500">{s.id.substring(0,8)}...</td>
                                <td className="px-6 py-3 font-medium">{s.slipNumber}</td>
                                <td className="px-6 py-3">{s.status || 'Active'} | {s.insuredName}</td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => console.log(s)} className="text-blue-600 hover:underline text-xs">Log to Console</button>
                                </td>
                            </tr>
                        ))}
                        {dbViewType === 'clauses' && rawClauses.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-mono text-xs text-gray-500">{c.id.substring(0,8)}...</td>
                                <td className="px-6 py-3 font-medium">{c.title}</td>
                                <td className="px-6 py-3">{c.category}</td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => console.log(c)} className="text-blue-600 hover:underline text-xs">Log to Console</button>
                                </td>
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
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Recycle Bin</h2>
                <p className="text-gray-500 text-sm">Recover deleted items or purge them permanently.</p>
            </div>
            <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                {(['policies', 'slips', 'clauses'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setRecycleType(type)}
                        className={`px-4 py-2 text-sm font-bold capitalize rounded-md transition-colors ${recycleType === type ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-700">
                    <tr>
                        <th className="px-6 py-4">Item Details</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {recycleType === 'policies' && deletedPolicies.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{p.policyNumber}</div>
                                <div className="text-sm text-gray-500">{p.insuredName}</div>
                            </td>
                            <td className="px-6 py-4 text-center flex justify-center gap-3">
                                <button onClick={(e) => handleRestore(e, p.id)} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded font-bold text-sm flex items-center gap-1"><RefreshCw size={14}/> Restore</button>
                                <button onClick={(e) => handleHardDelete(e, p.id)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded font-bold text-sm flex items-center gap-1"><Trash2 size={14}/> Purge</button>
                            </td>
                        </tr>
                    ))}
                    {recycleType === 'slips' && deletedSlips.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{s.slipNumber}</div>
                                <div className="text-sm text-gray-500">{s.insuredName}</div>
                            </td>
                            <td className="px-6 py-4 text-center flex justify-center gap-3">
                                <button onClick={(e) => handleRestore(e, s.id)} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded font-bold text-sm flex items-center gap-1"><RefreshCw size={14}/> Restore</button>
                                <button onClick={(e) => handleHardDelete(e, s.id)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded font-bold text-sm flex items-center gap-1"><Trash2 size={14}/> Purge</button>
                            </td>
                        </tr>
                    ))}
                    {recycleType === 'clauses' && deletedClauses.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{c.title}</div>
                                <div className="text-sm text-gray-500">{c.category}</div>
                            </td>
                            <td className="px-6 py-4 text-center flex justify-center gap-3">
                                <button onClick={(e) => handleRestore(e, c.id)} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded font-bold text-sm flex items-center gap-1"><RefreshCw size={14}/> Restore</button>
                                <button onClick={(e) => handleHardDelete(e, c.id)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded font-bold text-sm flex items-center gap-1"><Trash2 size={14}/> Purge</button>
                            </td>
                        </tr>
                    ))}
                    {((recycleType === 'policies' && deletedPolicies.length === 0) || 
                      (recycleType === 'slips' && deletedSlips.length === 0) ||
                      (recycleType === 'clauses' && deletedClauses.length === 0)) && (
                        <tr>
                            <td colSpan={2} className="px-6 py-8 text-center text-gray-400 italic">No deleted items found in this category.</td>
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
            <button onClick={() => handleEditTemplate()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                <Plus size={18}/> New Template
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(t => (
                <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-gray-800">{t.name}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => handleEditTemplate(t)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit size={16}/></button>
                            <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{t.description || 'No description provided.'}</p>
                    <div className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-500 truncate">
                        {t.id}
                    </div>
                </div>
            ))}
        </div>

        {/* Template Editor Modal */}
        {isEditingTemplate && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Edit Template</h3>
                        <button onClick={() => setIsEditingTemplate(false)}><X size={20}/></button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Template Name</label>
                            <input 
                                className="w-full p-2 border rounded" 
                                value={currentTemplate.name} 
                                onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                            <input 
                                className="w-full p-2 border rounded" 
                                value={currentTemplate.description} 
                                onChange={e => setCurrentTemplate({...currentTemplate, description: e.target.value})}
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-bold text-gray-700 mb-1">HTML Content</label>
                            <textarea 
                                className="w-full flex-1 p-2 border rounded font-mono text-xs min-h-[300px]" 
                                value={currentTemplate.content} 
                                onChange={e => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Available vars: {'{{policyNumber}}, {{insuredName}}, {{inceptionDate}}'}, etc.</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-bold text-gray-700 mb-4">Add New Rate</h3>
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
                    <select 
                        className="w-full p-2 border rounded"
                        value={newRate.currency}
                        onChange={e => setNewRate({...newRate, currency: e.target.value as Currency})}
                    >
                        {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rate (to UZS)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        className="w-full p-2 border rounded"
                        value={newRate.rate || ''}
                        onChange={e => setNewRate({...newRate, rate: parseFloat(e.target.value)})}
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                    <input 
                        type="date" 
                        className="w-full p-2 border rounded"
                        value={newRate.date}
                        onChange={e => setNewRate({...newRate, date: e.target.value})}
                    />
                </div>
                <button onClick={handleAddFx} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">Add Rate</button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-700">
                    <tr>
                        <th className="px-6 py-3">Currency</th>
                        <th className="px-6 py-3">Rate</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {fxRates.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-bold">{r.currency}</td>
                            <td className="px-6 py-3">{r.rate}</td>
                            <td className="px-6 py-3 text-gray-500">{formatDate(r.date)}</td>
                            <td className="px-6 py-3 text-right">
                                <button onClick={() => handleDeleteFx(r.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderSettings = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold text-gray-800">System Maintenance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Lock size={18}/> Cache & Session</h3>
                  <p className="text-sm text-gray-600 mb-4">Clear local storage and force logout for all sessions.</p>
                  <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200 text-sm">Clear Local Cache</button>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Code size={18}/> System Version</h3>
                  <div className="text-sm text-gray-600">
                      <div><span className="font-bold">Version:</span> 1.2.0 (Beta)</div>
                      <div><span className="font-bold">Build:</span> 2025-05-15</div>
                      <div><span className="font-bold">Environment:</span> {process.env.NODE_ENV}</div>
                  </div>
              </div>
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
