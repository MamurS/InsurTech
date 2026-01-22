
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { Policy, Currency, RecordType, PolicyStatus } from '../types';
import { ExcelService } from '../services/excel';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DetailModal } from '../components/DetailModal';
import { Search, Edit, Trash2, Plus, ArrowRightLeft, ShieldCheck, Shield, Download, ArrowUpDown, ArrowUp, ArrowDown, FileText, AlertCircle, CheckCircle, XCircle, Ban, RefreshCw, Lock, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Expanded state type to include 'Cancelled' and 'Deleted'
  const [activeTab, setActiveTab] = useState<RecordType | 'Cancelled' | 'Deleted'>('Direct');
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Policy | string; direction: 'asc' | 'desc' }>({
    key: 'accountingDate',
    direction: 'asc'
  });

  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await DB.getPolicies();
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
        // Optimistic update: un-delete locally
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
        // Optimistic update: Mark as deleted in local state so it moves to Deleted tab immediately
        setPolicies(prev => prev.map(p => p.id === deleteId ? { ...p, isDeleted: true } : p));
        await DB.deletePolicy(deleteId);
      } catch (err) {
        console.error("Delete failed", err);
        // Revert by fetching again
        fetchData();
      } finally {
        setDeleteId(null);
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
      // Handle nested or undefined properties safely
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      if (aValue === bValue) return 0;
      
      // Handle null/undefined (push to bottom)
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
    // 1. Basic Search Filter
    const matchesSearch = p.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.insuredName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.classOfInsurance && p.classOfInsurance.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Tab Logic
    if (activeTab === 'Deleted') {
        return p.isDeleted; // Only deleted items go here
    }

    if (p.isDeleted) return false; // Hide deleted items from all other tabs

    if (activeTab === 'Cancelled') {
        // Only show Cancelled, NTU, or Early Termination policies
        return p.status === PolicyStatus.CANCELLED || p.status === PolicyStatus.NTU || p.status === PolicyStatus.EARLY_TERMINATION;
    } else {
        // Show policies matching the type, BUT EXCLUDE Cancelled/NTU/Early Termination (they have their own tab)
        return p.recordType === activeTab && p.status !== PolicyStatus.CANCELLED && p.status !== PolicyStatus.NTU && p.status !== PolicyStatus.EARLY_TERMINATION;
    }
  });

  const sortedPolicies = getSortedPolicies(filteredPolicies);

  const formatMoney = (amount: number | undefined, currency: Currency) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const handleExport = async () => {
    // For export, if activeTab is Cancelled, we might need to adjust logic, but passing sortedPolicies works.
    await ExcelService.exportPolicies(sortedPolicies, activeTab as RecordType); 
  };

  // Helper for sorting headers
  const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: string, className?: string }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className={`px-3 py-2 border-r whitespace-nowrap cursor-pointer hover:bg-gray-300 transition-colors group select-none ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center justify-between gap-1">
          {label}
          <div className="text-gray-400 group-hover:text-gray-600">
             {isActive ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-50"/>}
          </div>
        </div>
      </th>
    );
  };

  const Tabs = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit overflow-x-auto">
      <button
        onClick={() => setActiveTab('Direct')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
          activeTab === 'Direct' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <ShieldCheck size={16} /> Direct Insurance
      </button>
      <button
        onClick={() => setActiveTab('Inward')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
          activeTab === 'Inward' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <ArrowRightLeft size={16} /> Inward Reinsurance
      </button>
      <button
        onClick={() => setActiveTab('Outward')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
          activeTab === 'Outward' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Shield size={16} /> Outward Reinsurance
      </button>
      <button
        onClick={() => setActiveTab('Cancelled')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
          activeTab === 'Cancelled' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Ban size={16} /> Cancelled / NTU
      </button>
      <div className="w-px bg-gray-300 mx-1"></div>
      <button
        onClick={() => setActiveTab('Deleted')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
          activeTab === 'Deleted' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-red-600'
        }`}
      >
        <Trash2 size={16} /> Deleted Records
      </button>
    </div>
  );

  // Status Indicator Component
  const StatusBadge = ({ status, isDeleted }: { status: PolicyStatus, isDeleted?: boolean }) => {
    if (isDeleted) {
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200"><Trash2 size={10}/> DELETED</span>
    }
    if (status === PolicyStatus.ACTIVE) {
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full"><CheckCircle size={10}/> ACT</span>
    }
    if (status === PolicyStatus.PENDING) {
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full"><AlertCircle size={10}/> PEND</span>
    }
    if (status === PolicyStatus.NTU) {
         return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200">NTU</span>
    }
    if (status === PolicyStatus.CANCELLED) {
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full"><XCircle size={10}/> CANC</span>
   }
   if (status === PolicyStatus.EARLY_TERMINATION) {
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full"><AlertTriangle size={10}/> TERM</span>
   }
    return <span className="text-[10px] text-gray-500">{status}</span>
  };

  const getRowClass = (p: Policy) => {
    // Logic for Deleted tab items - Make them bleak (gray, opacity) but NO grayscale filter to allow colored buttons
    if (activeTab === 'Deleted') return "bg-gray-100/80 text-gray-400 opacity-80 hover:opacity-100 hover:bg-gray-100 cursor-pointer border-b border-gray-200 transition-all group";

    // Logic for other tabs
    if (p.isDeleted) return "hidden"; // Should be filtered out, but just in case
    if (p.status === PolicyStatus.NTU) return "opacity-50 hover:bg-gray-50 group";
    if (p.status === PolicyStatus.EARLY_TERMINATION) return "bg-orange-50/20 hover:bg-orange-50 group border-l-2 border-orange-200";
    if (activeTab === 'Direct') return "hover:bg-blue-50/50 cursor-pointer transition-colors group";
    if (activeTab === 'Inward') return "hover:bg-purple-50 cursor-pointer transition-colors group";
    if (activeTab === 'Outward') return "hover:bg-amber-50 cursor-pointer transition-colors group";
    if (activeTab === 'Cancelled') return "hover:bg-red-50 cursor-pointer transition-colors group";
    return "group";
  };

  // --- 1. DIRECT TABLE (Detailed) ---
  const renderDirectTable = () => (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300">
           <tr>
             <SortableHeader label="Insured" sortKey="insuredName" className="bg-gray-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" />
             <th className="px-3 py-2 border-r bg-white w-10 text-center">St</th>
             <SortableHeader label="Industry" sortKey="industry" />
             <SortableHeader label="Broker" sortKey="brokerName" />
             <SortableHeader label="Policy No / Ref" sortKey="policyNumber" />
             <SortableHeader label="Acc Date" sortKey="accountingDate" />
             <SortableHeader label="Class (Code)" sortKey="classOfInsurance" />
             <SortableHeader label="Type" sortKey="typeOfInsurance" />
             <SortableHeader label="Policy #" sortKey="secondaryPolicyNumber" />
             <SortableHeader label="Code" sortKey="riskCode" />
             <SortableHeader label="Country" sortKey="territory" />
             <SortableHeader label="City" sortKey="city" />
             <SortableHeader label="Currency" sortKey="currency" />
             <SortableHeader label="Exch Rate" sortKey="exchangeRate" />
             
             {/* Financials */}
             <SortableHeader label="Sum Insured (FC)" sortKey="sumInsured" className="bg-blue-50 text-right" />
             <SortableHeader label="Sum Insured (Sums)" sortKey="sumInsuredNational" className="bg-blue-50 text-right" />
             <SortableHeader label="Rate %" sortKey="premiumRate" className="text-right" />
             <SortableHeader label="Premium (FC)" sortKey="grossPremium" className="bg-green-50 text-right" />
             <SortableHeader label="Premium (Sums)" sortKey="premiumNationalCurrency" className="bg-green-50 text-right" />
             
             <SortableHeader label="Inception" sortKey="inceptionDate" className="text-center" />
             <SortableHeader label="Expiry" sortKey="expiryDate" className="text-center" />
             <SortableHeader label="Warranty Days" sortKey="warrantyPeriod" className="text-center" />
             
             {/* Payment / Installments */}
             <SortableHeader label="Paid (FC)" sortKey="receivedPremiumForeign" className="bg-amber-50 text-right" />
             <SortableHeader label="Pay Currency" sortKey="currency" className="bg-amber-50" />
             <SortableHeader label="Paid (Sums)" sortKey="receivedPremiumNational" className="bg-amber-50 text-right" />
             <SortableHeader label="Pay Date" sortKey="paymentDate" className="bg-amber-50" />
             
             <th className="px-3 py-2 bg-gray-200 sticky right-0 z-40 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] border-l">Actions</th>
           </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white text-gray-900">
            {sortedPolicies.map((p) => (
              <tr 
                key={p.id} 
                onClick={() => setSelectedPolicy(p)}
                className={getRowClass(p)}
              >
                <td className="px-3 py-2 border-r font-medium sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-inherit">{p.insuredName}</td>
                <td className="px-1 py-2 border-r text-center"><StatusBadge status={p.status} isDeleted={p.isDeleted}/></td>
                <td className="px-3 py-2 border-r">{p.industry}</td>
                <td className="px-3 py-2 border-r">{p.brokerName}</td>
                <td className="px-3 py-2 border-r text-blue-600">{p.policyNumber || p.agreementNumber}</td>
                <td className="px-3 py-2 border-r">{p.accountingDate}</td>
                <td className="px-3 py-2 border-r text-center">{p.classOfInsurance}</td>
                <td className="px-3 py-2 border-r">{p.typeOfInsurance}</td>
                <td className="px-3 py-2 border-r">{p.secondaryPolicyNumber || '-'}</td>
                <td className="px-3 py-2 border-r text-center">{p.riskCode}</td>
                <td className="px-3 py-2 border-r">{p.territory}</td>
                <td className="px-3 py-2 border-r">{p.city}</td>
                <td className="px-3 py-2 border-r font-bold">{p.currency}</td>
                <td className="px-3 py-2 border-r text-right">{p.exchangeRate}</td>
                
                <td className="px-3 py-2 border-r text-right bg-blue-50/30">{formatMoney(p.sumInsured, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right bg-blue-50/30">{p.sumInsuredNational?.toLocaleString()}</td>
                <td className="px-3 py-2 border-r text-right">{p.premiumRate}%</td>
                <td className="px-3 py-2 border-r text-right font-bold bg-green-50/30">{formatMoney(p.grossPremium, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right font-bold bg-green-50/30">{p.premiumNationalCurrency?.toLocaleString()}</td>
                
                <td className="px-3 py-2 border-r text-center">{p.inceptionDate}</td>
                <td className="px-3 py-2 border-r text-center">{p.expiryDate}</td>
                <td className="px-3 py-2 border-r text-center">{p.warrantyPeriod}</td>
                
                <td className="px-3 py-2 border-r text-right text-green-700">{formatMoney(p.receivedPremiumForeign, p.currency)}</td>
                <td className="px-3 py-2 border-r text-center">{p.currency}</td>
                <td className="px-3 py-2 border-r text-right">{p.receivedPremiumNational?.toLocaleString()}</td>
                <td className="px-3 py-2 border-r">{p.paymentDate}</td>
                
                <td className="px-3 py-2 text-center sticky right-0 z-40 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-white group-hover:bg-blue-50 transition-colors">
                  <div className="flex justify-center gap-1">
                     <button type="button" title="PDF / Wording" onClick={(e) => handleWording(e, p.id)} className="p-1.5 rounded hover:bg-purple-100 text-purple-600 hover:text-purple-800 transition-colors cursor-pointer"><FileText size={16} /></button>
                     <button type="button" title="Edit" onClick={(e) => handleEdit(e, p.id)} className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"><Edit size={16} /></button>
                     {!p.isDeleted && <button type="button" title="Delete" onClick={(e) => initiateDelete(e, p.id)} className="p-1.5 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors cursor-pointer"><Trash2 size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  // --- 2. INWARD TABLE (Detailed) ---
  const renderInwardTable = () => (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300">
          <tr>
            <SortableHeader label="Insured" sortKey="insuredName" className="bg-gray-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" />
            <th className="px-3 py-2 border-r bg-white w-10 text-center">St</th>
            <SortableHeader label="Borrower" sortKey="borrower" />
            <SortableHeader label="Broker" sortKey="brokerName" />
            <SortableHeader label="Cedent" sortKey="cedantName" className="bg-purple-50" />
            <SortableHeader label="Retrocedent" sortKey="retrocedent" />
            <SortableHeader label="Slip No" sortKey="slipNumber" />
            <SortableHeader label="Ref Link" sortKey="policyNumber" />
            <SortableHeader label="Date of Slip" sortKey="dateOfSlip" />
            <SortableHeader label="Acc Date" sortKey="accountingDate" />
            <SortableHeader label="Type" sortKey="typeOfInsurance" />
            <SortableHeader label="Class" sortKey="classOfInsurance" />
            <SortableHeader label="Risk" sortKey="insuredRisk" />
            <SortableHeader label="Industry" sortKey="industry" />
            <SortableHeader label="Territory" sortKey="territory" />
            <SortableHeader label="Agreement No" sortKey="agreementNumber" />
            <SortableHeader label="Currency" sortKey="currency" />
            
            <SortableHeader label="Sum Insured (FC)" sortKey="sumInsured" className="bg-blue-50 text-right" />
            <SortableHeader label="Ins Period" sortKey="inceptionDate" className="text-right" />
            <SortableHeader label="Reins Period" sortKey="reinsuranceInceptionDate" className="text-right" />
            <SortableHeader label="Limit (FC)" sortKey="limitForeignCurrency" />
            <SortableHeader label="Limit (Sums)" sortKey="limitNationalCurrency" />
            <SortableHeader label="Excess (FC)" sortKey="excessForeignCurrency" />
            
            <SortableHeader label="Gross Prem (FC)" sortKey="grossPremium" className="bg-green-50 text-right" />
            <SortableHeader label="Gross Prem (Sums)" sortKey="premiumNationalCurrency" className="bg-green-50 text-right" />
            <SortableHeader label="Our Share %" sortKey="ourShare" />
            <SortableHeader label="Sum Reins (FC)" sortKey="sumReinsuredForeign" className="text-right" />
            <SortableHeader label="Reins Comm %" sortKey="reinsuranceCommission" className="text-right" />
            <SortableHeader label="Net Reins Prem" sortKey="netReinsurancePremium" className="text-right" />
            
            <SortableHeader label="Exch Rate" sortKey="exchangeRate" />
            <SortableHeader label="USD Equiv" sortKey="equivalentUSD" />
            <SortableHeader label="Received Prem" sortKey="receivedPremiumForeign" />
            <SortableHeader label="Pay Date" sortKey="paymentDate" />
            <SortableHeader label="No Slips" sortKey="numberOfSlips" />
            
            <SortableHeader label="Performer" sortKey="performer" className="bg-amber-50" />
            <SortableHeader label="Treaty Place" sortKey="treatyPlacement" className="bg-amber-50" />
            <SortableHeader label="Treaty Prem" sortKey="treatyPremium" className="bg-amber-50" />
            <SortableHeader label="AIC Comm" sortKey="aicCommission" className="bg-amber-50" />
            <SortableHeader label="AIC Retention" sortKey="aicRetention" className="bg-amber-50" />
            <SortableHeader label="AIC Prem" sortKey="aicPremium" className="bg-amber-50" />
            
             <th className="px-3 py-2 bg-gray-200 sticky right-0 z-40 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] border-l">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white text-gray-900">
           {sortedPolicies.map((p) => (
             <tr 
                key={p.id} 
                onClick={() => setSelectedPolicy(p)}
                className={getRowClass(p)}
             >
                <td className="px-3 py-2 border-r font-medium sticky left-0 bg-inherit z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{p.insuredName}</td>
                <td className="px-1 py-2 border-r text-center"><StatusBadge status={p.status} isDeleted={p.isDeleted}/></td>
                <td className="px-3 py-2 border-r truncate max-w-[150px]">{p.borrower || '-'}</td>
                <td className="px-3 py-2 border-r">{p.brokerName}</td>
                <td className="px-3 py-2 border-r text-purple-700 font-medium">{p.cedantName}</td>
                <td className="px-3 py-2 border-r">{p.retrocedent || '-'}</td>
                <td className="px-3 py-2 border-r">{p.slipNumber}</td>
                <td className="px-3 py-2 border-r text-blue-600 underline">{p.policyNumber}</td>
                <td className="px-3 py-2 border-r">{p.dateOfSlip}</td>
                <td className="px-3 py-2 border-r">{p.accountingDate}</td>
                <td className="px-3 py-2 border-r">{p.typeOfInsurance}</td>
                <td className="px-3 py-2 border-r">{p.classOfInsurance}</td>
                <td className="px-3 py-2 border-r truncate max-w-[150px]">{p.insuredRisk}</td>
                <td className="px-3 py-2 border-r">{p.industry}</td>
                <td className="px-3 py-2 border-r">{p.territory}</td>
                <td className="px-3 py-2 border-r">{p.agreementNumber}</td>
                <td className="px-3 py-2 border-r font-bold">{p.currency}</td>
                
                <td className="px-3 py-2 border-r text-right bg-blue-50/30">{formatMoney(p.sumInsured, p.currency)}</td>
                <td className="px-3 py-2 border-r text-xs">{p.inceptionDate} <br/> {p.expiryDate}</td>
                <td className="px-3 py-2 border-r text-xs">{p.reinsuranceInceptionDate || '-'} <br/> {p.reinsuranceExpiryDate || '-'}</td>
                <td className="px-3 py-2 border-r text-right">{formatMoney(p.limitForeignCurrency, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right">{p.limitNationalCurrency?.toLocaleString()}</td>
                <td className="px-3 py-2 border-r text-right">{formatMoney(p.excessForeignCurrency, p.currency)}</td>
                
                <td className="px-3 py-2 border-r text-right font-bold bg-green-50/30">{formatMoney(p.grossPremium, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right bg-green-50/30">{p.premiumNationalCurrency?.toLocaleString()}</td>
                <td className="px-3 py-2 border-r text-center">{p.ourShare}%</td>
                <td className="px-3 py-2 border-r text-right font-medium">{formatMoney(p.sumReinsuredForeign, p.currency)}</td>
                <td className="px-3 py-2 border-r text-center">{p.reinsuranceCommission}%</td>
                <td className="px-3 py-2 border-r text-right font-medium">{formatMoney(p.netReinsurancePremium, p.currency)}</td>
                
                <td className="px-3 py-2 border-r text-right">{p.exchangeRate}</td>
                <td className="px-3 py-2 border-r text-right">{formatMoney(p.equivalentUSD, Currency.USD)}</td>
                <td className="px-3 py-2 border-r text-right">{formatMoney(p.receivedPremiumForeign, p.currency)}</td>
                <td className="px-3 py-2 border-r">{p.paymentDate}</td>
                <td className="px-3 py-2 border-r text-center">{p.numberOfSlips}</td>
                
                <td className="px-3 py-2 border-r">{p.performer}</td>
                <td className="px-3 py-2 border-r">{p.treatyPlacement}</td>
                <td className="px-3 py-2 border-r text-right">{formatMoney(p.treatyPremium, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right">{formatMoney(p.aicCommission, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right">{formatMoney(p.aicRetention, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right">{formatMoney(p.aicPremium, p.currency)}</td>
                
                <td className="px-3 py-2 text-center sticky right-0 z-40 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-white group-hover:bg-purple-50 transition-colors">
                  <div className="flex justify-center gap-1">
                     <button type="button" title="PDF / Wording" onClick={(e) => handleWording(e, p.id)} className="p-1.5 rounded hover:bg-purple-100 text-purple-600 hover:text-purple-800 transition-colors cursor-pointer"><FileText size={16} /></button>
                     <button type="button" title="Edit" onClick={(e) => handleEdit(e, p.id)} className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"><Edit size={16} /></button>
                     {!p.isDeleted && <button type="button" title="Delete" onClick={(e) => initiateDelete(e, p.id)} className="p-1.5 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors cursor-pointer"><Trash2 size={16} /></button>}
                  </div>
                </td>
             </tr>
           ))}
        </tbody>
      </table>
    </div>
  );

  // --- 3. OUTWARD TABLE (Detailed) ---
  const renderOutwardTable = () => (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300">
          <tr>
            <SortableHeader label="Reinsurer" sortKey="reinsurerName" className="bg-gray-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" />
            <th className="px-3 py-2 border-r bg-white w-10 text-center">St</th>
            <SortableHeader label="Broker" sortKey="brokerName" />
            <SortableHeader label="Our Ref / Policy" sortKey="policyNumber" />
            <SortableHeader label="Reins Slip No" sortKey="slipNumber" className="text-amber-600" />
            <SortableHeader label="Insured" sortKey="insuredName" />
            <SortableHeader label="Class" sortKey="classOfInsurance" />
            <SortableHeader label="Type" sortKey="typeOfInsurance" />
            <SortableHeader label="Territory" sortKey="territory" />
            <SortableHeader label="Period" sortKey="inceptionDate" />
            
            {/* 100% Figures */}
            <SortableHeader label="Sum Insured (100%)" sortKey="sumInsured" className="bg-blue-50 text-right" />
            <SortableHeader label="Gross Prem (100%)" sortKey="grossPremium" className="bg-green-50 text-right" />
            
            {/* Ceded Figures */}
            <SortableHeader label="Ceded Share %" sortKey="ourShare" className="bg-amber-50 text-right" />
            <SortableHeader label="Sum Reinsured" sortKey="sumReinsuredForeign" className="bg-amber-50 text-right" />
            <SortableHeader label="Prem Ceded" sortKey="cededPremiumForeign" className="bg-amber-50 text-right" />
            
            {/* Net Calculation */}
            <SortableHeader label="Comm %" sortKey="reinsuranceCommission" className="text-right" />
            <SortableHeader label="Net Due (Payable)" sortKey="netReinsurancePremium" className="text-right font-bold" />
            
            <SortableHeader label="Payment Status" sortKey="paymentStatus" />
            <SortableHeader label="Rating" sortKey="reinsurerRating" />
            
             <th className="px-3 py-2 bg-gray-200 sticky right-0 z-40 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] border-l">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white text-gray-900">
           {sortedPolicies.map((p) => (
             <tr 
                key={p.id} 
                onClick={() => setSelectedPolicy(p)}
                className={getRowClass(p)}
             >
                <td className="px-3 py-2 border-r font-medium sticky left-0 bg-inherit z-30 text-amber-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{p.reinsurerName}</td>
                <td className="px-1 py-2 border-r text-center"><StatusBadge status={p.status} isDeleted={p.isDeleted}/></td>
                <td className="px-3 py-2 border-r">{p.brokerName}</td>
                <td className="px-3 py-2 border-r text-blue-600 cursor-pointer">{p.policyNumber}</td>
                <td className="px-3 py-2 border-r font-mono text-xs">{p.slipNumber || '-'}</td>
                <td className="px-3 py-2 border-r">{p.insuredName}</td>
                <td className="px-3 py-2 border-r">{p.classOfInsurance}</td>
                <td className="px-3 py-2 border-r">{p.typeOfInsurance}</td>
                <td className="px-3 py-2 border-r">{p.territory}</td>
                <td className="px-3 py-2 border-r text-xs">{p.inceptionDate} <br/> {p.expiryDate}</td>
                
                <td className="px-3 py-2 border-r text-right bg-blue-50/30">{formatMoney(p.sumInsured, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right bg-green-50/30 font-medium">{formatMoney(p.grossPremium, p.currency)}</td>
                
                <td className="px-3 py-2 border-r text-right font-bold text-amber-700">{p.ourShare}%</td>
                <td className="px-3 py-2 border-r text-right bg-amber-50/30">{formatMoney(p.sumReinsuredForeign, p.currency)}</td>
                <td className="px-3 py-2 border-r text-right bg-amber-50/30 font-medium">{formatMoney(p.cededPremiumForeign, p.currency)}</td>
                
                <td className="px-3 py-2 border-r text-center">{p.reinsuranceCommission}%</td>
                <td className="px-3 py-2 border-r text-right font-bold text-red-600">{formatMoney(p.netReinsurancePremium, p.currency)}</td>
                
                <td className="px-3 py-2 border-r text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {p.paymentStatus}
                    </span>
                </td>
                <td className="px-3 py-2 border-r text-center text-xs text-gray-500">{p.reinsurerRating}</td>
                
                <td className="px-3 py-2 text-center sticky right-0 z-40 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-white group-hover:bg-amber-50 transition-colors">
                  <div className="flex justify-center gap-1">
                     <button type="button" title="PDF / Wording" onClick={(e) => handleWording(e, p.id)} className="p-1.5 rounded hover:bg-purple-100 text-purple-600 hover:text-purple-800 transition-colors cursor-pointer"><FileText size={16} /></button>
                     <button type="button" title="Edit" onClick={(e) => handleEdit(e, p.id)} className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"><Edit size={16} /></button>
                     {!p.isDeleted && <button type="button" title="Delete" onClick={(e) => initiateDelete(e, p.id)} className="p-1.5 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors cursor-pointer"><Trash2 size={16} /></button>}
                  </div>
                </td>
             </tr>
           ))}
        </tbody>
      </table>
    </div>
  );

  // --- 4. CANCELLED / NTU / TERMINATED TABLE ---
  const renderCancelledTable = () => (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-xs text-left border-collapse">
         <thead className="bg-red-50 text-red-900 font-bold border-b-2 border-red-200">
             <tr>
                 <SortableHeader label="Ref No" sortKey="policyNumber" />
                 <SortableHeader label="Insured" sortKey="insuredName" />
                 <SortableHeader label="Type" sortKey="recordType" />
                 <SortableHeader label="Status" sortKey="status" />
                 <SortableHeader label="Original Inception" sortKey="inceptionDate" />
                 <SortableHeader label="Sum Insured" sortKey="sumInsured" className="text-right" />
                 <SortableHeader label="Actions" sortKey="id" className="text-center" />
             </tr>
         </thead>
         <tbody className="divide-y divide-gray-200 bg-white">
             {sortedPolicies.map(p => (
                 <tr key={p.id} onClick={() => setSelectedPolicy(p)} className={getRowClass(p)}>
                     <td className="px-3 py-2 border-r font-mono text-gray-600">{p.policyNumber}</td>
                     <td className="px-3 py-2 border-r font-bold text-gray-800">{p.insuredName}</td>
                     <td className="px-3 py-2 border-r">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.recordType === 'Direct' ? 'bg-blue-100 text-blue-700' : 
                            p.recordType === 'Inward' ? 'bg-purple-100 text-purple-700' : 
                            'bg-amber-100 text-amber-700'
                        }`}>
                            {p.recordType}
                        </span>
                     </td>
                     <td className="px-3 py-2 border-r"><StatusBadge status={p.status} isDeleted={p.isDeleted}/></td>
                     <td className="px-3 py-2 border-r">{p.inceptionDate}</td>
                     <td className="px-3 py-2 border-r text-right text-gray-500">{formatMoney(p.sumInsured, p.currency)}</td>
                     <td className="px-3 py-2 text-center bg-white group-hover:bg-red-50 transition-colors">
                         <div className="flex justify-center gap-1">
                             <button type="button" title="View Details" onClick={() => setSelectedPolicy(p)} className="text-blue-600 hover:text-blue-800"><FileText size={16}/></button>
                             {!p.isDeleted && <button type="button" title="Delete" onClick={(e) => initiateDelete(e, p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>}
                         </div>
                     </td>
                 </tr>
             ))}
         </tbody>
      </table>
    </div>
  );

  // --- 5. DELETED TABLE (New) ---
  const renderDeletedTable = () => (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-xs text-left border-collapse">
         <thead className="bg-gray-100 text-gray-700 font-bold border-b-2 border-gray-300">
             <tr>
                 <SortableHeader label="Ref No" sortKey="policyNumber" />
                 <SortableHeader label="Insured" sortKey="insuredName" />
                 <SortableHeader label="Type" sortKey="recordType" />
                 <SortableHeader label="Original Status" sortKey="status" />
                 <SortableHeader label="Inception" sortKey="inceptionDate" />
                 <SortableHeader label="Sum Insured" sortKey="sumInsured" className="text-right" />
                 <SortableHeader label="Actions" sortKey="id" className="text-center" />
             </tr>
         </thead>
         <tbody className="divide-y divide-gray-200">
             {sortedPolicies.map(p => (
                 <tr key={p.id} className={getRowClass(p)}>
                     <td className="px-3 py-2 border-r font-mono text-gray-500 line-through decoration-gray-400">{p.policyNumber}</td>
                     <td className="px-3 py-2 border-r font-bold text-gray-600">{p.insuredName}</td>
                     <td className="px-3 py-2 border-r">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold grayscale opacity-70 ${
                            p.recordType === 'Direct' ? 'bg-blue-100 text-blue-700' : 
                            p.recordType === 'Inward' ? 'bg-purple-100 text-purple-700' : 
                            'bg-amber-100 text-amber-700'
                        }`}>
                            {p.recordType}
                        </span>
                     </td>
                     <td className="px-3 py-2 border-r"><StatusBadge status={p.status} isDeleted={true} /></td>
                     <td className="px-3 py-2 border-r text-gray-500">{p.inceptionDate}</td>
                     <td className="px-3 py-2 border-r text-right text-gray-400">{formatMoney(p.sumInsured, p.currency)}</td>
                     <td className="px-3 py-2 text-center bg-gray-100 group-hover:bg-gray-100 transition-colors">
                         <div className="flex justify-center gap-2">
                             {user?.role === 'Super Admin' ? (
                                <button type="button" title="Restore Record" onClick={(e) => handleRestore(e, p.id)} className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1 transition-colors">
                                    <RefreshCw size={12} /> Restore
                                </button>
                             ) : (
                                <span title="Requires Super Admin" className="text-gray-300 cursor-not-allowed flex items-center justify-center">
                                    <Lock size={14}/>
                                </span>
                             )}
                         </div>
                     </td>
                 </tr>
             ))}
         </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Policy Database</h2>
          <p className="text-gray-500">Manage all your insurance and reinsurance records.</p>
        </div>
        <div className="flex gap-2">
            <button 
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm cursor-pointer"
            >
            <Download size={18} /> Export Excel
            </button>
            <button 
            type="button"
            onClick={() => navigate('/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
            <Plus size={20} /> New Record
            </button>
        </div>
      </div>

      <Tabs />

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Search policy no, insured, or class..." 
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Dynamic Table based on Record Type */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative">
        {activeTab === 'Deleted' ? renderDeletedTable() :
         activeTab === 'Cancelled' ? renderCancelledTable() :
         activeTab === 'Inward' ? renderInwardTable() : 
         activeTab === 'Direct' ? renderDirectTable() : 
         renderOutwardTable()}
        
        {!loading && filteredPolicies.length === 0 && (
            <div className="p-8 text-center text-gray-400">
                No records found for {activeTab}.
            </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Delete Policy?"
        message="Are you sure you want to delete this policy? It will be moved to the Deleted Records tab."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Detail Modal */}
      {selectedPolicy && (
          <DetailModal 
            item={selectedPolicy} 
            onClose={() => setSelectedPolicy(null)} 
            onRefresh={fetchData} // Pass the refresh function
            title="Policy Details"
          />
      )}
    </div>
  );
};

export default Dashboard;
