
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { AuthService } from '../services/auth';
import { UserService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { useProfiles, useUpdateProfile } from '../hooks/useUsers';
import { Policy, ReinsuranceSlip, Clause, PolicyTemplate, UserRole, ExchangeRate, Currency, Profile } from '../types';
import { formatDate } from '../utils/dateUtils';
import { 
  Trash2, RefreshCw, Users, 
  Lock, Table, Code, 
  Activity, ShieldCheck, FileText, Plus, Save, X, Edit, Loader2, Phone, AlertTriangle,
  Coins, LogOut
} from 'lucide-react';

type Section = 'dashboard' | 'database' | 'recycle' | 'users' | 'settings' | 'templates' | 'fx';
type RecycleType = 'policies' | 'slips' | 'clauses';
type DbViewType = 'policies' | 'slips' | 'clauses';

const AdminConsole: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('database');
  const [isSidebarOpen] = useState(true);
  
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
    const [p, s, c, t, fx] = await Promise.all([
        DB.getAllPolicies(), 
        DB.getAllSlips(), 
        DB.getAllClauses(), 
        DB.getTemplates(),
        DB.getExchangeRates()
    ]);
    setRawPolicies(p);
    setRawSlips(s);
    setRawClauses(c);
    setTemplates(t);
    setFxRates(fx);

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
      if (!currentUser.fullName || !currentUser.email || !currentUser.role) {
          alert("Name, Email and Role are required");
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

  const renderDatabaseBrowser = () => (
    <div className="flex flex-col h-full animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold text-gray-800">Database Browser</h2>
             <div className="flex bg-white rounded-lg shadow-sm border p-1">
                {(['policies', 'slips', 'clauses'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setDbViewType(type)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${dbViewType === type ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        {type}
                    </button>
                ))}
             </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                 <div className="text-xs text-gray-500 font-mono">
                    Showing {(dbViewType === 'policies' ? rawPolicies : dbViewType === 'slips' ? rawSlips : rawClauses).length} records
                 </div>
            </div>
            
            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-100 text-gray-600 border-b border-gray-300 sticky top-0 z-10 shadow-sm font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3 border-r w-16 text-center">Data</th>
                            <th className="px-4 py-3 border-r">ID</th>
                            {dbViewType === 'policies' && (
                                <>
                                    <th className="px-4 py-3 border-r">Reference</th>
                                    <th className="px-4 py-3 border-r">Record Type</th>
                                    <th className="px-4 py-3 border-r">Insured Name</th>
                                    <th className="px-4 py-3 border-r">Status</th>
                                </>
                            )}
                            {dbViewType === 'slips' && (
                                <>
                                    <th className="px-4 py-3 border-r">Slip Number</th>
                                    <th className="px-4 py-3 border-r">Date</th>
                                    <th className="px-4 py-3 border-r">Insured Name</th>
                                </>
                            )}
                            {dbViewType === 'clauses' && (
                                <>
                                    <th className="px-4 py-3 border-r">Title</th>
                                    <th className="px-4 py-3 border-r">Category</th>
                                    <th className="px-4 py-3 border-r">Std</th>
                                </>
                            )}
                            <th className="px-4 py-3 text-center w-24">State</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-gray-600">
                        {(dbViewType === 'policies' ? rawPolicies : dbViewType === 'slips' ? rawSlips : rawClauses).map((item: any) => (
                            <tr 
                                key={item.id} 
                                className={`hover:bg-blue-50 cursor-pointer transition-colors ${item.isDeleted ? 'bg-red-50 text-red-900' : ''}`}
                            >
                                <td className="px-4 py-2 border-r text-center">
                                    <div className="text-blue-600 hover:text-blue-800"><Code size={14}/></div>
                                </td>
                                <td className="px-4 py-2 border-r truncate max-w-[120px]">{item.id}</td>
                                {dbViewType === 'policies' && (
                                    <>
                                        <td className="px-4 py-2 border-r font-medium text-gray-900">{item.policyNumber}</td>
                                        <td className="px-4 py-2 border-r">{item.channel || item.recordType}</td>
                                        <td className="px-4 py-2 border-r truncate max-w-[200px]">{item.insuredName}</td>
                                        <td className="px-4 py-2 border-r">{item.status}</td>
                                    </>
                                )}
                                {dbViewType === 'slips' && (
                                    <>
                                        <td className="px-4 py-2 border-r font-medium text-gray-900">{item.slipNumber}</td>
                                        <td className="px-4 py-2 border-r">{formatDate(item.date)}</td>
                                        <td className="px-4 py-2 border-r">{item.insuredName}</td>
                                    </>
                                )}
                                {dbViewType === 'clauses' && (
                                    <>
                                        <td className="px-4 py-2 border-r font-medium text-gray-900 truncate max-w-[300px]">{item.title}</td>
                                        <td className="px-4 py-2 border-r">{item.category}</td>
                                        <td className="px-4 py-2 border-r">{item.isStandard ? 'Y' : 'N'}</td>
                                    </>
                                )}
                                <td className="px-4 py-2 text-center">
                                    {item.isDeleted ? <span className="text-red-600 font-bold text-[10px] uppercase border border-red-200 bg-red-100 px-1 rounded">Deleted</span> : <span className="text-green-600 text-[10px] uppercase">Active</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );

  const renderFxRates = () => (
      <div className="flex flex-col h-full animate-in fade-in zoom-in duration-200">
        <div className="mb-6">
             <h2 className="text-2xl font-bold text-gray-800">Exchange Rates</h2>
             <p className="text-sm text-gray-500">Manage daily FX rates for calculating totals in National Currency (UZS).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={18}/> Add New Rate</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Currency</label>
                        <select 
                            className="w-full bg-white border rounded p-2 text-gray-900" 
                            value={newRate.currency}
                            onChange={e => setNewRate({...newRate, currency: e.target.value as Currency})}
                        >
                            {Object.values(Currency).filter(c => c !== Currency.UZS).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Rate to UZS</label>
                        <input 
                            type="number"
                            className="w-full bg-white border rounded p-2 text-gray-900" 
                            value={newRate.rate || ''}
                            onChange={e => setNewRate({...newRate, rate: Number(e.target.value)})}
                            placeholder="e.g. 12500.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                        <input 
                            type="date"
                            className="w-full bg-white border rounded p-2 text-gray-900" 
                            value={newRate.date}
                            onChange={e => setNewRate({...newRate, date: e.target.value})}
                        />
                    </div>
                    <button 
                        onClick={handleAddFx}
                        className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 mt-2"
                    >
                        Save Rate
                    </button>
                </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                        <tr>
                            <th className="px-6 py-4">Currency</th>
                            <th className="px-6 py-4">Rate (to UZS)</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {fxRates.map(rate => (
                            <tr key={rate.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-bold">{rate.currency}</td>
                                <td className="px-6 py-4 font-mono">{rate.rate.toFixed(2)}</td>
                                <td className="px-6 py-4 text-gray-500">{formatDate(rate.date)}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDeleteFx(rate.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
      </div>
  );

  const renderTemplates = () => (
      <div className="flex flex-col h-full animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
             <div>
                <h2 className="text-2xl font-bold text-gray-800">Policy Templates</h2>
                <p className="text-sm text-gray-500">Manage agreement wordings and placeholders.</p>
             </div>
             <button onClick={() => handleEditTemplate()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                 <Plus size={18}/> New Template
             </button>
        </div>

        {isEditingTemplate ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h3 className="font-bold text-lg">Edit Template</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditingTemplate(false)} className="text-gray-500 hover:text-gray-700 px-3 py-1">Cancel</button>
                        <button onClick={handleSaveTemplate} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2"><Save size={16}/> Save</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                    <div className="md:col-span-2 flex flex-col gap-4 h-full overflow-y-auto pr-2">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Template Name</label>
                            <input 
                                className="w-full bg-white border rounded p-2 text-gray-900" 
                                value={currentTemplate.name} 
                                onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                                placeholder="e.g. Standard Commercial Property"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                            <input 
                                className="w-full bg-white border rounded p-2 text-gray-900" 
                                value={currentTemplate.description} 
                                onChange={e => setCurrentTemplate({...currentTemplate, description: e.target.value})}
                                placeholder="Description of use..."
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Content (HTML/Text)</label>
                            <textarea 
                                className="w-full bg-white border rounded p-4 font-mono text-sm flex-1 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" 
                                value={currentTemplate.content} 
                                onChange={e => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                                placeholder="<h1>Policy Schedule</h1>..."
                            />
                        </div>
                    </div>
                    
                    {/* Cheat Sheet */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-y-auto">
                        <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase">Available Variables</h4>
                        <p className="text-xs text-gray-500 mb-4">Use these placeholders in your content. They will be replaced by actual policy data.</p>
                        <div className="space-y-2 text-xs font-mono">
                            {['policyNumber', 'insuredName', 'insuredAddress', 'inceptionDate', 'expiryDate', 'sumInsured', 'currency', 'grossPremium', 'industry', 'territory', 'classOfInsurance', 'deductible', 'issueDate'].map(v => (
                                <div key={v} className="bg-white p-2 rounded border border-gray-200 cursor-pointer hover:bg-blue-50 flex justify-between group"
                                     onClick={() => setCurrentTemplate({...currentTemplate, content: currentTemplate.content + `{{${v}}}`})}>
                                    <span>{`{{${v}}}`}</span>
                                    <Plus size={12} className="opacity-0 group-hover:opacity-100 text-blue-500"/>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20}/></div>
                             <button onClick={() => handleDeleteTemplate(t.id)} className="text-gray-300 hover:text-red-500"><X size={16}/></button>
                        </div>
                        <h3 className="font-bold text-gray-800">{t.name}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{t.description}</p>
                        <button onClick={() => handleEditTemplate(t)} className="w-full py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Edit Template</button>
                    </div>
                ))}
            </div>
        )}
      </div>
  );

  const renderRecycleBin = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <h2 className="text-2xl font-bold text-gray-800">Recycle Bin</h2>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex gap-4">
                 {(['policies', 'slips', 'clauses'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setRecycleType(type)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${recycleType === type ? 'bg-white shadow text-red-600 border' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        {type} ({(type === 'policies' ? deletedPolicies : type === 'slips' ? deletedSlips : deletedClauses).length})
                    </button>
                ))}
            </div>

            <table className="w-full text-sm text-left">
                <thead className="bg-white text-gray-700 font-semibold border-b">
                    <tr>
                        <th className="px-6 py-4">Item Reference</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4 text-right">Recovery Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {((recycleType === 'policies' ? deletedPolicies : recycleType === 'slips' ? deletedSlips : deletedClauses) as any[]).map(item => (
                        <tr 
                            key={item.id} 
                            className="group hover:bg-gray-50"
                        >
                            <td className="px-6 py-4 font-mono text-gray-600">
                                {item.policyNumber || item.slipNumber || item.category + '-' + item.id.substring(0,4)}
                            </td>
                            <td className="px-6 py-4">
                                {item.insuredName || item.title || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-3">
                                <button 
                                    onClick={(e) => handleRestore(e, item.id)} 
                                    className="text-green-600 hover:text-green-800 font-medium text-xs flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-md border border-green-100 hover:border-green-300 transition-all"
                                >
                                    <RefreshCw size={12} /> Restore
                                </button>
                                <button 
                                    onClick={(e) => handleHardDelete(e, item.id)} 
                                    className="text-red-600 hover:text-red-800 font-medium text-xs flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-md border border-red-100 hover:border-red-300 transition-all"
                                >
                                    <Trash2 size={12} /> Shred
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
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
                                <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
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

                <div className="text-xs font-bold text-slate-600 uppercase mb-2 px-2 mt-6 whitespace-nowrap">Access Control</div>
                <button 
                    onClick={() => setActiveSection('users')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === 'users' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <Users size={18} className="flex-shrink-0" /> <span>User Management</span>
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
