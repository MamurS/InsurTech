
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { Policy, Currency, PolicyStatus, LegalEntity, Installment } from '../types';
import { ExcelService } from '../services/excel';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DetailModal } from '../components/DetailModal';
import { EntityDetailModal } from '../components/EntityDetailModal'; // Import New Modal
import { Search, Edit, Trash2, Plus, Download, ArrowUpDown, ArrowUp, ArrowDown, FileText, CheckCircle, XCircle, AlertCircle, AlertTriangle, RefreshCw, Lock, Filter, Columns, List } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Cancelled' | 'Deleted'>('All');
  
  // View Mode State - Persistent
  const [viewMode, setViewMode] = useState<'compact' | 'extended'>(() => {
      const savedMode = localStorage.getItem('insurtech_dashboard_view');
      return (savedMode === 'extended' ? 'extended' : 'compact');
  });

  const handleViewModeChange = (mode: 'compact' | 'extended') => {
      setViewMode(mode);
      localStorage.setItem('insurtech_dashboard_view', mode);
  };

  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<LegalEntity | null>(null); // State for Entity Modal

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Policy | string; direction: 'asc' | 'desc' }>({
    key: 'inceptionDate',
    direction: 'desc'
  });

  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch everything, filtering happens client side for this demo
      const data = await DB.getAllPolicies();
      setPolicies(data);
    } catch (e) {
      console.error("Failed to fetch policies", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const initiateDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/edit/${id}`);
  };

  const handleWording = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/wording/${id}`);
  };

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.role !== 'Super Admin') {
        alert("Only Super Admins can restore deleted records.");
        return;
    }
    try {
        setPolicies(prev => prev.map(p => p.id === id ? { ...p, isDeleted: false } : p));
        await DB.restorePolicy(id);
    } catch (err) {
        console.error("Restore failed", err);
        fetchData();
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        setPolicies(prev => prev.map(p => p.id === deleteId ? { ...p, isDeleted: true } : p));
        await DB.deletePolicy(deleteId);
      } catch (err) {
        console.error("Delete failed", err);
        fetchData();
      } finally {
        setDeleteId(null);
      }
    }
  };

  // Helper to find and open entity
  const handleEntityClick = async (e: React.MouseEvent, name?: string) => {
      e.stopPropagation();
      if (!name) return;
      const entity = await DB.findLegalEntityByName(name);
      if (entity) {
          setSelectedEntity(entity);
      } else {
          // Optional: Prompt to create?
          if(confirm(`Entity "${name}" not found in database. Create it?`)) {
              navigate('/entities/new');
          }
      }
  };

  const handleSort = (key: keyof Policy | string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedPolicies = (filtered: Policy[]) => {
    return [...filtered].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredPolicies = policies.filter(p => {
    // 1. Status/Deleted Filter
    if (statusFilter === 'Deleted') {
        if (!p.isDeleted) return false;
    } else {
        if (p.isDeleted) return false;
        
        if (statusFilter === 'Active' && p.status !== PolicyStatus.ACTIVE) return false;
        if (statusFilter === 'Pending' && p.status !== PolicyStatus.PENDING) return false;
        if (statusFilter === 'Cancelled' && (p.status !== PolicyStatus.CANCELLED && p.status !== PolicyStatus.NTU && p.status !== PolicyStatus.EARLY_TERMINATION)) return false;
    }

    // 2. Search Filter
    const searchLower = searchTerm.toLowerCase();
    return (
        p.policyNumber.toLowerCase().includes(searchLower) ||
        p.insuredName.toLowerCase().includes(searchLower) ||
        (p.cedantName && p.cedantName.toLowerCase().includes(searchLower)) ||
        ((p as any).brokerName && (p as any).brokerName.toLowerCase().includes(searchLower)) ||
        (p.intermediaryName && p.intermediaryName.toLowerCase().includes(searchLower)) ||
        (p.classOfInsurance && p.classOfInsurance.toLowerCase().includes(searchLower))
    );
  });

  const sortedPolicies = getSortedPolicies(filteredPolicies);

  const formatMoney = (amount: number | undefined, currency: Currency | string) => {
    if (amount === undefined || amount === null) return '-';
    // Handle potential undefined currency for format (default to USD or display without symbol if unknown)
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${amount}`;
    }
  };

  const formatNumber = (val: number | undefined) => {
      if (val === undefined || val === null) return '-';
      return new Intl.NumberFormat('en-US').format(val);
  }

  // --- DATE FORMATTER (dd.mm.yyyy) ---
  const formatDate = (dateStr: string | undefined) => {
      if (!dateStr) return '-';
      // Attempt to handle both ISO strings and YYYY-MM-DD
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
  };

  // --- OVERDUE CHECK LOGIC ---
  const getOverdueStatus = (policy: Policy) => {
      if (policy.status !== PolicyStatus.ACTIVE) return { isOverdue: false, details: '' };
      
      const today = new Date();
      // Reset time for accurate date comparison
      today.setHours(0,0,0,0);

      // Check installments first
      if (policy.installments && policy.installments.length > 0) {
          let totalOverdue = 0;
          let maxDaysOverdue = 0;
          
          policy.installments.forEach(inst => {
              if (!inst.dueDate) return;
              const due = new Date(inst.dueDate);
              const paidAmt = inst.paidAmount || 0;
              const dueAmt = inst.dueAmount || 0;
              
              if (due < today && paidAmt < dueAmt) {
                  const diffTime = Math.abs(today.getTime() - due.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                  totalOverdue += (dueAmt - paidAmt);
                  if (diffDays > maxDaysOverdue) maxDaysOverdue = diffDays;
              }
          });

          if (totalOverdue > 0) {
              return {
                  isOverdue: true,
                  details: `OVERDUE: ${formatMoney(totalOverdue, policy.currency)} (${maxDaysOverdue} days late)`
              };
          }
      } 
      // Legacy Check (Single Payment Date)
      else if (policy.paymentDate) {
          const due = new Date(policy.paymentDate);
          if (due < today && policy.paymentStatus !== 'Paid') {
               const diffTime = Math.abs(today.getTime() - due.getTime());
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               return {
                  isOverdue: true,
                  details: `OVERDUE: ${formatMoney(policy.grossPremium, policy.currency)} (${diffDays} days late)`
               }
          }
      }

      return { isOverdue: false, details: '' };
  };

  // --- PAYMENT INFO HELPER ---
  const getPaymentInfo = (policy: Policy) => {
      const installments = policy.installments || [];
      
      // If no installments, use policy level fields as fallback single installment
      if (installments.length === 0) {
          const isPaid = policy.paymentStatus === 'Paid';
          return {
              nextDueDate: isPaid ? '-' : (policy.paymentDate || '-'),
              nextDueAmount: isPaid ? 0 : policy.grossPremium,
              lastPaidDate: isPaid ? (policy.paymentDate || 'Paid') : '-',
              lastPaidAmount: isPaid ? policy.grossPremium : 0
          };
      }

      // Sort by Due Date
      const sortedByDue = [...installments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      
      // Next Due (First one not fully paid)
      const nextDue = sortedByDue.find(i => (i.paidAmount || 0) < (i.dueAmount || 0));
      
      // Sort by Paid Date for Last Paid
      const paidItems = installments.filter(i => i.paidDate && (i.paidAmount || 0) > 0);
      paidItems.sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime());
      const lastPaid = paidItems[0];

      return {
          nextDueDate: nextDue ? nextDue.dueDate : 'Fully Paid',
          nextDueAmount: nextDue ? ((nextDue.dueAmount || 0) - (nextDue.paidAmount || 0)) : 0, // Outstanding
          lastPaidDate: lastPaid ? lastPaid.paidDate : '-',
          lastPaidAmount: lastPaid ? lastPaid.paidAmount : 0
      };
  };

  const handleExport = async () => {
    await ExcelService.exportPolicies(sortedPolicies); 
  };

  // Helper for sorting headers
  const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: string, className?: string }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className={`px-3 py-3 border-b border-gray-200 font-semibold text-gray-600 text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none whitespace-nowrap ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          <div className="text-gray-400 group-hover:text-gray-600">
             {isActive ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-50"/>}
          </div>
        </div>
      </th>
    );
  };

  // Status Indicator Component
  const StatusBadge = ({ status, isDeleted }: { status: PolicyStatus, isDeleted?: boolean }) => {
    if (isDeleted) {
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200"><Trash2 size={10}/> DELETED</span>
    }
    switch (status) {
        case PolicyStatus.ACTIVE:
            return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={10}/> ACTIVE</span>
        case PolicyStatus.PENDING:
            return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><AlertCircle size={10}/> PENDING</span>
        case PolicyStatus.NTU:
            return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">NTU</span>
        case PolicyStatus.CANCELLED:
            return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={10}/> CANC</span>
        case PolicyStatus.EARLY_TERMINATION:
            return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full"><AlertTriangle size={10}/> TERM</span>
        default:
            return <span className="text-[10px] text-gray-500">{status}</span>
    }
  };

  const ChannelBadge = ({ channel }: { channel: string }) => {
      if (channel === 'Direct') return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">DIRECT</span>
      return <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">INWARD</span>
  };

  const IntermediaryBadge = ({ type, name }: { type: string, name?: string }) => {
      if (type === 'Direct') return <span className="text-gray-400 text-[10px] italic">Direct Client</span>
      return (
          <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-700 uppercase">{type}</span>
              <span 
                className="text-[10px] text-blue-600 truncate max-w-[100px] hover:underline cursor-pointer" 
                title={name}
                onClick={(e) => { e.stopPropagation(); handleEntityClick(e, name); }} // Clickable
              >
                  {name}
              </span>
          </div>
      )
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Policy Dashboard</h2>
          <p className="text-gray-500 text-sm">Unified view of all Direct Insurance and Inward Reinsurance business.</p>
        </div>
        <div className="flex gap-2">
            <button 
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-all shadow-sm cursor-pointer text-sm"
            >
            <Download size={16} /> Export Excel
            </button>
            <button 
            type="button"
            onClick={() => navigate('/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-sm hover:shadow-md cursor-pointer text-sm"
            >
            <Plus size={18} /> New Policy
            </button>
        </div>
      </div>

      {/* Filters & Search & View Toggle */}
      <div className="flex flex-col xl:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          
          {/* Status Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 overflow-x-auto max-w-full">
             {(['All', 'Active', 'Pending', 'Cancelled', 'Deleted'] as const).map(status => (
                 <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                        statusFilter === status 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                 >
                     {status}
                 </button>
             ))}
          </div>

          <div className="flex-1 w-full relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
            type="text" 
            placeholder="Search by Policy No, Insured, Cedant, Broker..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
             <button
                onClick={() => handleViewModeChange('compact')}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'compact' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
             >
                 <List size={14}/> Compact
             </button>
             <button
                onClick={() => handleViewModeChange('extended')}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all flex items-center gap-1 ${
                    viewMode === 'extended' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
             >
                 <Columns size={14}/> Extended
             </button>
          </div>
      </div>

      {/* Unified Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    {viewMode === 'compact' ? (
                        <tr>
                            <th className="px-3 py-3 border-b border-gray-200 w-24 text-center font-semibold text-gray-600 text-xs">STATUS</th>
                            <SortableHeader label="Channel" sortKey="channel" />
                            <SortableHeader label="Policy Ref" sortKey="policyNumber" />
                            <SortableHeader label="Insured / Cedant" sortKey="insuredName" />
                            <SortableHeader label="Intermediary" sortKey="intermediaryType" />
                            <SortableHeader label="Class" sortKey="classOfInsurance" />
                            <SortableHeader label="Sum Insured" sortKey="sumInsured" className="text-right" />
                            <SortableHeader label="Gross Prem" sortKey="grossPremium" className="text-right" />
                            
                            {/* New Payment Columns for Compact View */}
                            <th className="px-3 py-3 border-b border-gray-200 text-right font-semibold text-gray-600 text-xs">Due</th>
                            <th className="px-3 py-3 border-b border-gray-200 text-right font-semibold text-gray-600 text-xs">Paid</th>

                            <SortableHeader label="Our %" sortKey="ourShare" className="text-right" />
                            <th className="px-3 py-3 border-b border-gray-200 w-20 text-center font-semibold text-gray-600 text-xs">Actions</th>
                        </tr>
                    ) : (
                        <tr>
                            {/* STATUS Sticky Left */}
                            <th className="px-3 py-3 border-b border-gray-200 w-24 text-center font-semibold text-gray-600 text-xs bg-gray-50 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">STATUS</th>
                            
                            <SortableHeader label="Channel" sortKey="channel" />
                            <SortableHeader label="Ref No" sortKey="policyNumber" />
                            <SortableHeader label="Sec Ref" sortKey="secondaryPolicyNumber" />
                            <SortableHeader label="Agreement No" sortKey="agreementNumber" />
                            <SortableHeader label="Bordereau No" sortKey="bordereauNo" />
                            <SortableHeader label="Insured Name" sortKey="insuredName" />
                            <SortableHeader label="Insured Address" sortKey="insuredAddress" />
                            <SortableHeader label="Cedant" sortKey="cedantName" />
                            <SortableHeader label="Intermed Type" sortKey="intermediaryType" />
                            <SortableHeader label="Intermed Name" sortKey="intermediaryName" />
                            <SortableHeader label="Borrower" sortKey="borrower" />
                            <SortableHeader label="Retrocedent" sortKey="retrocedent" />
                            <SortableHeader label="Performer" sortKey="performer" />
                            <SortableHeader label="Class" sortKey="classOfInsurance" />
                            <SortableHeader label="Risk Code" sortKey="riskCode" />
                            <SortableHeader label="Country" sortKey="territory" />
                            <SortableHeader label="City" sortKey="city" />
                            <SortableHeader label="Insured Risk" sortKey="insuredRisk" />
                            <SortableHeader label="Currency" sortKey="currency" />
                            <SortableHeader label="Sum Insured" sortKey="sumInsured" className="text-right" />
                            <SortableHeader label="Sum Insured (Nat)" sortKey="sumInsuredNational" className="text-right" />
                            <SortableHeader label="Gross Prem" sortKey="grossPremium" className="text-right" />
                            <SortableHeader label="Prem (Nat)" sortKey="premiumNationalCurrency" className="text-right" />
                            <SortableHeader label="Exch Rate" sortKey="exchangeRate" />
                            <SortableHeader label="Equiv USD" sortKey="equivalentUSD" className="text-right" />
                            <SortableHeader label="Limit (FC)" sortKey="limitForeignCurrency" className="text-right" />
                            <SortableHeader label="Excess (FC)" sortKey="excessForeignCurrency" className="text-right" />
                            <SortableHeader label="Inception" sortKey="inceptionDate" />
                            <SortableHeader label="Expiry" sortKey="expiryDate" />
                            <SortableHeader label="Date of Slip" sortKey="dateOfSlip" />
                            <SortableHeader label="Acc Date" sortKey="accountingDate" />
                            <SortableHeader label="Pay Date" sortKey="paymentDate" />
                            <SortableHeader label="Warranty" sortKey="warrantyPeriod" />
                            <SortableHeader label="Our %" sortKey="ourShare" className="text-right" />
                            <SortableHeader label="Net Prem" sortKey="netPremium" className="text-right" />
                            
                            {/* Detailed Payment Columns for Extended View */}
                            <th className="px-3 py-3 border-b border-gray-200 text-xs font-semibold text-gray-600 bg-red-50/50">Next Due Date</th>
                            <th className="px-3 py-3 border-b border-gray-200 text-xs font-semibold text-gray-600 text-right bg-red-50/50">Next Due Amt</th>
                            <th className="px-3 py-3 border-b border-gray-200 text-xs font-semibold text-gray-600 bg-green-50/50">Last Paid Date</th>
                            <th className="px-3 py-3 border-b border-gray-200 text-xs font-semibold text-gray-600 text-right bg-green-50/50">Last Paid Amt</th>

                            <SortableHeader label="Comm %" sortKey="commissionPercent" className="text-right" />
                            <SortableHeader label="Reinsured?" sortKey="hasOutwardReinsurance" />
                            <SortableHeader label="Reinsurer" sortKey="reinsurerName" />
                            <SortableHeader label="Ceded %" sortKey="cededShare" className="text-right" />
                            <SortableHeader label="Ceded Prem" sortKey="cededPremiumForeign" className="text-right" />
                            <SortableHeader label="Reins Comm %" sortKey="reinsuranceCommission" className="text-right" />
                            <SortableHeader label="Net Payable" sortKey="netReinsurancePremium" className="text-right" />
                            <SortableHeader label="Treaty Place" sortKey="treatyPlacement" />
                            <SortableHeader label="Treaty Prem" sortKey="treatyPremium" className="text-right" />
                            <SortableHeader label="AIC Comm" sortKey="aicCommission" className="text-right" />
                            
                            {/* Actions Sticky Right */}
                            <th className="px-3 py-3 border-b border-gray-200 w-24 text-center font-semibold text-gray-600 text-xs bg-gray-100 sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</th>
                        </tr>
                    )}
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {sortedPolicies.map(p => {
                        const overdueStatus = getOverdueStatus(p);
                        const paymentInfo = getPaymentInfo(p);
                        
                        const rowClass = overdueStatus.isOverdue 
                            ? 'bg-red-100 text-red-900 font-bold hover:bg-red-200' 
                            : (p.isDeleted ? 'bg-gray-50 opacity-75' : 'hover:bg-blue-50/30');

                        return (
                        <tr 
                            key={p.id} 
                            onClick={() => setSelectedPolicy(p)}
                            className={`group transition-colors cursor-pointer ${rowClass}`}
                            title={overdueStatus.details} // Tooltip for overdue
                        >
                            {viewMode === 'compact' ? (
                                <>
                                    <td className="px-3 py-3 text-center">
                                        <StatusBadge status={p.status} isDeleted={p.isDeleted} />
                                        {overdueStatus.isOverdue && <div className="text-[10px] text-red-700 font-black mt-1 animate-pulse">OVERDUE</div>}
                                    </td>
                                    <td className="px-3 py-3">
                                        <ChannelBadge channel={p.channel} />
                                    </td>
                                    <td className="px-3 py-3 font-mono text-xs text-blue-600 font-medium">
                                        {p.policyNumber}
                                    </td>
                                    <td className="px-3 py-3 font-medium text-gray-900">
                                        {p.channel === 'Inward' ? (
                                            <div className="flex flex-col">
                                                <span 
                                                    className="hover:text-blue-600 hover:underline cursor-pointer"
                                                    onClick={(e) => handleEntityClick(e, p.cedantName)}
                                                >
                                                    {p.cedantName}
                                                </span>
                                                <span className="text-[10px] text-gray-500 flex gap-1">
                                                    Orig: 
                                                    <span 
                                                        className="hover:text-blue-600 hover:underline cursor-pointer"
                                                        onClick={(e) => handleEntityClick(e, p.insuredName)}
                                                    >
                                                        {p.insuredName}
                                                    </span>
                                                </span>
                                            </div>
                                        ) : (
                                            <span 
                                                className="hover:text-blue-600 hover:underline cursor-pointer"
                                                onClick={(e) => handleEntityClick(e, p.insuredName)}
                                            >
                                                {p.insuredName}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        <IntermediaryBadge type={p.intermediaryType} name={p.intermediaryName || (p as any).brokerName} />
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 text-xs">
                                        {p.classOfInsurance}
                                    </td>
                                    <td className="px-3 py-3 text-right font-medium text-gray-700">
                                        {formatMoney(p.sumInsured, p.currency)}
                                    </td>
                                    <td className="px-3 py-3 text-right font-bold text-gray-900 bg-gray-50/50">
                                        {formatMoney(p.grossPremium, p.currency)}
                                    </td>
                                    
                                    {/* Compact Payment Info */}
                                    <td className="px-3 py-3 text-right text-xs">
                                        <div className="flex flex-col">
                                            <span className={paymentInfo.nextDueDate !== 'Fully Paid' ? 'text-red-600 font-bold' : 'text-green-600'}>{formatDate(paymentInfo.nextDueDate)}</span>
                                            {paymentInfo.nextDueAmount > 0 && <span className={paymentInfo.nextDueDate !== 'Fully Paid' ? 'text-red-600' : 'text-gray-500'}>{formatNumber(paymentInfo.nextDueAmount)}</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-right text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-gray-900">{formatDate(paymentInfo.lastPaidDate)}</span>
                                            {paymentInfo.lastPaidAmount > 0 && <span className="text-gray-500">{formatNumber(paymentInfo.lastPaidAmount)}</span>}
                                        </div>
                                    </td>

                                    <td className="px-3 py-3 text-right text-xs">
                                        {p.ourShare}%
                                    </td>
                                    
                                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-1">
                                            {p.isDeleted ? (
                                                user?.role === 'Super Admin' && (
                                                    <button onClick={(e) => handleRestore(e, p.id)} title="Restore" className="p-1.5 text-green-600 hover:bg-green-100 rounded">
                                                        <RefreshCw size={14}/>
                                                    </button>
                                                )
                                            ) : (
                                                <>
                                                    <button onClick={(e) => handleWording(e, p.id)} title="Wording" className="p-1.5 text-purple-600 hover:bg-purple-100 rounded">
                                                        <FileText size={14}/>
                                                    </button>
                                                    <button onClick={(e) => handleEdit(e, p.id)} title="Edit" className="p-1.5 text-blue-600 hover:bg-blue-100 rounded">
                                                        <Edit size={14}/>
                                                    </button>
                                                    <button onClick={(e) => initiateDelete(e, p.id)} title="Delete" className="p-1.5 text-red-600 hover:bg-red-100 rounded">
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </>
                            ) : (
                                <>
                                    {/* EXTENDED VIEW - STATUS (Sticky Left) */}
                                    <td className={`px-3 py-2 text-center sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors ${overdueStatus.isOverdue ? 'bg-red-100' : 'bg-white group-hover:bg-blue-50/30'}`}>
                                        <StatusBadge status={p.status} isDeleted={p.isDeleted} />
                                        {overdueStatus.isOverdue && <div className="text-[9px] text-red-700 font-black mt-1 uppercase tracking-tight">Overdue</div>}
                                    </td>
                                    
                                    {/* REST OF COLUMNS */}
                                    <td className="px-3 py-2 whitespace-nowrap"><ChannelBadge channel={p.channel} /></td>
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{p.policyNumber}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{p.secondaryPolicyNumber}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{p.agreementNumber}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{p.bordereauNo}</td>
                                    
                                    <td 
                                        className="px-3 py-2 whitespace-nowrap font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                                        onClick={(e) => handleEntityClick(e, p.insuredName)}
                                    >
                                        {p.insuredName}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 truncate max-w-[150px]" title={p.insuredAddress}>{p.insuredAddress}</td>
                                    <td 
                                        className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 hover:text-blue-600 hover:underline cursor-pointer"
                                        onClick={(e) => handleEntityClick(e, p.cedantName)}
                                    >
                                        {p.cedantName}
                                    </td>
                                    
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{p.intermediaryType}</td>
                                    <td 
                                        className="px-3 py-2 whitespace-nowrap text-xs hover:text-blue-600 hover:underline cursor-pointer"
                                        onClick={(e) => handleEntityClick(e, p.intermediaryName)}
                                    >
                                        {p.intermediaryName}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{p.borrower}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{p.retrocedent}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{p.performer}</td>
                                    
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{p.classOfInsurance}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{p.riskCode}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{p.territory}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{p.city}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs truncate max-w-[150px]" title={p.insuredRisk}>{p.insuredRisk}</td>
                                    
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-center font-bold">{p.currency}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-blue-50/30">{formatNumber(p.sumInsured)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-blue-50/30">{formatNumber(p.sumInsuredNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-green-50/30 font-bold">{formatNumber(p.grossPremium)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-green-50/30">{formatNumber(p.premiumNationalCurrency)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-center">{p.exchangeRate}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatMoney(p.equivalentUSD, 'USD')}</td>
                                    
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(p.limitForeignCurrency)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(p.excessForeignCurrency)}</td>
                                    
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(p.inceptionDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(p.expiryDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(p.dateOfSlip)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(p.accountingDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(p.paymentDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-center">{p.warrantyPeriod}</td>
                                    
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-bold text-blue-700">{p.ourShare}%</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-medium">{formatNumber(p.netPremium)}</td>
                                    
                                    {/* Extended Payment Info */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-red-600 bg-red-50/50">{formatDate(paymentInfo.nextDueDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-mono bg-red-50/50 text-red-600 font-bold">{formatNumber(paymentInfo.nextDueAmount)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-green-700 bg-green-50/50">{formatDate(paymentInfo.lastPaidDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-mono bg-green-50/50 text-green-700 font-bold">{formatNumber(paymentInfo.lastPaidAmount)}</td>

                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{p.commissionPercent}%</td>
                                    
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-center">{p.hasOutwardReinsurance ? 'Yes' : 'No'}</td>
                                    <td 
                                        className="px-3 py-2 whitespace-nowrap text-xs bg-amber-50/30 hover:text-blue-600 hover:underline cursor-pointer"
                                        onClick={(e) => handleEntityClick(e, p.reinsurerName)}
                                    >
                                        {p.reinsurerName}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-amber-50/30">{p.cededShare ? `${p.cededShare}%` : '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-amber-50/30">{formatNumber(p.cededPremiumForeign)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-amber-50/30">{p.reinsuranceCommission ? `${p.reinsuranceCommission}%` : '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-amber-50/30">{formatNumber(p.netReinsurancePremium)}</td>
                                    
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{p.treatyPlacement}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(p.treatyPremium)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(p.aicCommission)}</td>

                                    {/* EXTENDED VIEW ACTIONS - Sticky Right */}
                                    <td className={`px-3 py-2 text-center sticky right-0 z-20 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors ${overdueStatus.isOverdue ? 'bg-red-100' : 'bg-white group-hover:bg-blue-50/30'}`} onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-1">
                                            {!p.isDeleted && (
                                                <>
                                                    <button onClick={(e) => handleWording(e, p.id)} title="Wording" className="p-1 text-purple-600 hover:bg-purple-100 rounded">
                                                        <FileText size={14}/>
                                                    </button>
                                                    <button onClick={(e) => handleEdit(e, p.id)} title="Edit" className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit size={14}/></button>
                                                    <button onClick={(e) => initiateDelete(e, p.id)} title="Delete" className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 size={14}/></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </>
                            )}
                        </tr>
                    )})}
                    
                    {!loading && sortedPolicies.length === 0 && (
                        <tr>
                            <td colSpan={viewMode === 'compact' ? 14 : 51} className="py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <Filter size={32} className="opacity-20"/>
                                    <p>No policies found matching your criteria.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Delete Policy?"
        message="Are you sure you want to delete this policy? It will be moved to the Deleted Records bin."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Detail Modal */}
      {selectedPolicy && (
          <DetailModal 
            item={selectedPolicy} 
            onClose={() => setSelectedPolicy(null)} 
            onRefresh={fetchData} 
            title="Policy Details"
          />
      )}

      {/* New Entity Detail Modal */}
      <EntityDetailModal 
        entity={selectedEntity} 
        onClose={() => setSelectedEntity(null)} 
        onEdit={(id) => { setSelectedEntity(null); navigate(`/entities/edit/${id}`); }}
      />
    </div>
  );
};

export default Dashboard;
