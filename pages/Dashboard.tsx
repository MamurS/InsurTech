
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { Policy, Currency, PolicyStatus, LegalEntity, Installment, PortfolioRow, PortfolioSource, PortfolioStatus, InwardReinsurance, ReinsuranceSlip } from '../types';
import { ExcelService } from '../services/excel';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DetailModal } from '../components/DetailModal';
import { EntityDetailModal } from '../components/EntityDetailModal';
import { FormModal } from '../components/FormModal';
import { PolicyFormContent } from '../components/PolicyFormContent';
import { formatDate } from '../utils/dateUtils';
import { Search, Edit, Trash2, Plus, Download, ArrowUpDown, ArrowUp, ArrowDown, FileText, CheckCircle, XCircle, AlertCircle, AlertTriangle, RefreshCw, Lock, Filter, Columns, List, Globe, Home, Briefcase, FileSpreadsheet } from 'lucide-react';

// --- MAPPER FUNCTIONS ---

const normalizeStatus = (status: string, isDeleted?: boolean): PortfolioStatus => {
  if (isDeleted) return 'Deleted';
  const s = status?.toUpperCase() || '';
  if (s.includes('ACTIVE')) return 'Active';
  if (s.includes('PENDING') || s.includes('DRAFT')) return 'Pending';
  if (s.includes('CANCEL') || s.includes('NTU') || s.includes('TERMINATION') || s.includes('EXPIRED')) return 'Cancelled';
  return 'Active';
};

const mapPolicyToPortfolioRow = (p: Policy): PortfolioRow => ({
  id: p.id,
  source: 'direct',
  referenceNumber: p.policyNumber,
  secondaryRef: p.secondaryPolicyNumber,
  slipNumber: p.slipNumber,
  agreementNumber: p.agreementNumber,
  accountingCode: p.accountingCode,

  // Parties
  insuredName: p.insuredName,
  insuredAddress: p.insuredAddress,
  cedantName: p.cedantName,
  brokerName: p.intermediaryName,
  borrower: p.borrower,
  retrocedent: p.retrocedent,
  performer: p.performer,

  // Classification
  classOfBusiness: p.classOfInsurance,
  typeOfInsurance: p.typeOfInsurance,
  riskCode: p.riskCode,
  insuredRisk: p.insuredRisk,
  industry: p.industry,
  territory: p.territory,
  city: p.city,

  // Financial
  currency: p.currency,
  exchangeRate: p.exchangeRate,
  exchangeRateUSD: p.exchangeRateUSD,
  equivalentUSD: p.equivalentUSD,
  sumInsured: p.sumInsured,
  sumInsuredNational: p.sumInsuredNational,
  limit: p.limitForeignCurrency || p.sumInsured,
  limitNational: p.limitNationalCurrency,
  excess: p.excessForeignCurrency,
  prioritySum: p.prioritySum,
  grossPremium: p.grossPremium,
  grossPremiumNational: p.grossPremiumNational,
  premiumNational: p.premiumNationalCurrency,
  netPremium: p.netPremium,
  netPremiumNational: p.netPremiumNational,
  fullPremiumForeign: p.fullPremiumForeign,
  fullPremiumNational: p.fullPremiumNational,
  ourShare: p.ourShare,

  // Rates and percentages
  premiumRate: p.premiumRate,
  commissionPercent: p.commissionPercent,
  commissionNational: p.commissionNational,
  taxPercent: p.taxPercent,

  // Reinsurance details
  reinsuranceType: p.reinsuranceType,
  sumReinsuredForeign: p.sumReinsuredForeign,
  sumReinsuredNational: p.sumReinsuredNational,
  hasOutwardReinsurance: p.hasOutwardReinsurance,
  reinsurerName: p.reinsurerName,
  cededShare: p.cededShare,
  cededPremium: p.cededPremiumForeign,
  reinsuranceCommission: p.reinsuranceCommission,
  netReinsurancePremium: p.netReinsurancePremium,

  // Treaty & AIC
  treatyPlacement: p.treatyPlacement,
  treatyPremium: p.treatyPremium,
  aicCommission: p.aicCommission,
  aicRetention: p.aicRetention,
  aicPremium: p.aicPremium,

  // Retrocession
  risksCount: p.risksCount,
  retroSumReinsured: p.retroSumReinsured,
  retroPremium: p.retroPremium,

  // Dates
  inceptionDate: p.inceptionDate,
  expiryDate: p.expiryDate,
  insuranceDays: p.insuranceDays,
  reinsuranceInceptionDate: p.reinsuranceInceptionDate,
  reinsuranceExpiryDate: p.reinsuranceExpiryDate,
  reinsuranceDays: p.reinsuranceDays,
  dateOfSlip: p.dateOfSlip,
  accountingDate: p.accountingDate,
  warrantyPeriod: p.warrantyPeriod,

  // Payment tracking
  premiumPaymentDate: p.premiumPaymentDate,
  actualPaymentDate: p.actualPaymentDate,
  receivedPremiumForeign: p.receivedPremiumForeign,
  receivedPremiumCurrency: p.receivedPremiumCurrency,
  receivedPremiumExchangeRate: p.receivedPremiumExchangeRate,
  receivedPremiumNational: p.receivedPremiumNational,
  numberOfSlips: p.numberOfSlips,

  // Status
  status: p.status,
  normalizedStatus: normalizeStatus(p.status, p.isDeleted),
  isDeleted: p.isDeleted,
  originalData: p,
});

const mapInwardReinsuranceToPortfolioRow = (ir: InwardReinsurance): PortfolioRow => ({
  id: ir.id,
  source: ir.origin === 'FOREIGN' ? 'inward-foreign' : 'inward-domestic',
  referenceNumber: ir.contractNumber,

  // Parties
  insuredName: ir.originalInsuredName || ir.cedantName,
  cedantName: ir.cedantName,
  brokerName: ir.brokerName,

  // Classification
  classOfBusiness: ir.classOfCover,
  territory: ir.territory,

  // Financial
  currency: ir.currency,
  limit: ir.limitOfLiability,
  grossPremium: ir.grossPremium,
  ourShare: ir.ourShare,

  // Dates
  inceptionDate: ir.inceptionDate,
  expiryDate: ir.expiryDate,

  // Status
  status: ir.status,
  normalizedStatus: normalizeStatus(ir.status, ir.isDeleted),
  isDeleted: ir.isDeleted,
  contractType: ir.type,
  structure: ir.structure,
  originalData: ir,
});

const mapSlipToPortfolioRow = (s: ReinsuranceSlip): PortfolioRow => ({
  id: s.id,
  source: 'slip',
  referenceNumber: s.slipNumber,

  // Parties
  insuredName: s.insuredName,
  brokerName: s.brokerReinsurer,

  // Classification
  classOfBusiness: 'Reinsurance Slip',

  // Financial
  currency: (s.currency as Currency) || Currency.USD,
  limit: s.limitOfLiability,
  grossPremium: 0,
  ourShare: 100,

  // Dates
  inceptionDate: s.date,
  expiryDate: s.date,
  dateOfSlip: s.date,

  // Status
  status: s.status || 'Draft',
  normalizedStatus: normalizeStatus(s.status || 'Draft', s.isDeleted),
  isDeleted: s.isDeleted,
  originalData: s,
});

// --- DASHBOARD COMPONENT ---

const Dashboard: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Source Filter State
  const [sourceFilter, setSourceFilter] = useState<'All' | PortfolioSource>('All');

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
  const [selectedRow, setSelectedRow] = useState<PortfolioRow | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<LegalEntity | null>(null); // State for Entity Modal

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; source: PortfolioSource } | null>(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Policy | string; direction: 'asc' | 'desc' }>({
    key: 'inceptionDate',
    direction: 'desc'
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // Create Entity Confirmation State
  const [createEntityConfirm, setCreateEntityConfirm] = useState<{ isOpen: boolean; name: string }>({ isOpen: false, name: '' });

  // Policy Form Modal State
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all sources in parallel
      const [policies, inwardReinsurance, slips] = await Promise.all([
        DB.getAllPolicies(),
        DB.getAllInwardReinsurance(),
        DB.getSlips(),
      ]);

      // Map to unified PortfolioRow format
      const directRows = policies.map(mapPolicyToPortfolioRow);
      const inwardRows = inwardReinsurance.map(mapInwardReinsuranceToPortfolioRow);
      const slipRows = slips.map(mapSlipToPortfolioRow);

      // Merge and sort by inception date (newest first)
      const allRows = [...directRows, ...inwardRows, ...slipRows].sort((a, b) =>
        new Date(b.inceptionDate).getTime() - new Date(a.inceptionDate).getTime()
      );

      setPortfolioData(allRows);
    } catch (e) {
      console.error("Failed to fetch portfolio data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const initiateDelete = (e: React.MouseEvent, row: PortfolioRow) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget({ id: row.id, source: row.source });
  };

  const handleEdit = (e: React.MouseEvent, row: PortfolioRow) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate based on source type
    switch (row.source) {
      case 'direct':
        setEditingPolicyId(row.id);
        setShowPolicyModal(true);
        break;
      case 'inward-foreign':
        navigate(`/inward-reinsurance/foreign/edit/${row.id}`);
        break;
      case 'inward-domestic':
        navigate(`/inward-reinsurance/domestic/edit/${row.id}`);
        break;
      case 'slip':
        navigate(`/slip/${row.id}`);
        break;
    }
  };

  const handleWording = (e: React.MouseEvent, row: PortfolioRow) => {
    e.preventDefault();
    e.stopPropagation();
    if (row.source === 'direct') {
      navigate(`/wording/${row.id}`);
    }
  };

  const handleRestore = async (e: React.MouseEvent, row: PortfolioRow) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.role !== 'Super Admin') {
        toast.warning("Only Super Admins can restore deleted records.");
        return;
    }
    try {
        setPortfolioData(prev => prev.map(p => p.id === row.id ? { ...p, isDeleted: false, normalizedStatus: 'Active' as PortfolioStatus } : p));
        // Restore based on source type
        if (row.source === 'direct') {
          await DB.restorePolicy(row.id);
        }
        // Add restore methods for other sources if available
    } catch (err) {
        console.error("Restore failed", err);
        fetchData();
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      try {
        setPortfolioData(prev => prev.map(p => p.id === deleteTarget.id ? { ...p, isDeleted: true, normalizedStatus: 'Deleted' as PortfolioStatus } : p));
        // Delete based on source type
        if (deleteTarget.source === 'direct') {
          await DB.deletePolicy(deleteTarget.id);
        }
        // Add delete methods for other sources if available
      } catch (err) {
        console.error("Delete failed", err);
        fetchData();
      } finally {
        setDeleteTarget(null);
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
          // Prompt to create
          setCreateEntityConfirm({ isOpen: true, name });
      }
  };

  const handleSort = (key: keyof Policy | string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredRows = portfolioData.filter(row => {
    // 1. Source Filter
    if (sourceFilter !== 'All' && row.source !== sourceFilter) return false;

    // 2. Status/Deleted Filter
    if (statusFilter === 'Deleted') {
        if (!row.isDeleted) return false;
    } else {
        if (row.isDeleted) return false;
        if (statusFilter !== 'All' && row.normalizedStatus !== statusFilter) return false;
    }

    // 3. Search Filter
    const searchLower = searchTerm.toLowerCase();
    return (
        row.referenceNumber.toLowerCase().includes(searchLower) ||
        row.insuredName.toLowerCase().includes(searchLower) ||
        (row.cedantName && row.cedantName.toLowerCase().includes(searchLower)) ||
        (row.brokerName && row.brokerName.toLowerCase().includes(searchLower)) ||
        (row.classOfBusiness && row.classOfBusiness.toLowerCase().includes(searchLower))
    );
  });

  const getSortedRows = (filtered: PortfolioRow[]) => {
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

  const sortedRows = getSortedRows(filteredRows);

  const formatMoney = (amount: number | undefined, currency: Currency | string) => {
    if (amount === undefined || amount === null) return '-';
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

  const handleExport = async () => {
    await ExcelService.exportPortfolio(sortedRows);
  };

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

  const SourceBadge = ({ source }: { source: PortfolioSource }) => {
      switch (source) {
        case 'direct':
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              <Briefcase size={10} /> DIRECT
            </span>
          );
        case 'inward-foreign':
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
              <Globe size={10} /> IN-FOREIGN
            </span>
          );
        case 'inward-domestic':
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              <Home size={10} /> IN-DOMESTIC
            </span>
          );
        case 'slip':
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
              <FileSpreadsheet size={10} /> SLIP
            </span>
          );
        default:
          return <span className="text-[10px] text-gray-500">{source}</span>;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Policy Portfolio</h2>
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
        </div>
      </div>

      {/* Filters & Search & View Toggle */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          {/* Source Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase self-center mr-2">Source:</span>
            {([
              { key: 'All', label: 'All', icon: null },
              { key: 'direct', label: 'Direct', icon: Briefcase },
              { key: 'inward-foreign', label: 'Inward Foreign', icon: Globe },
              { key: 'inward-domestic', label: 'Inward Domestic', icon: Home },
              { key: 'slip', label: 'Slips', icon: FileSpreadsheet },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSourceFilter(key as 'All' | PortfolioSource)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  sourceFilter === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {Icon && <Icon size={12} />}
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col xl:flex-row gap-4 items-center">
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
              placeholder="Search by Ref No, Insured, Cedant, Broker, Class..."
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
      </div>

      {/* Unified Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    {viewMode === 'compact' ? (
                        <tr>
                            <th className="px-3 py-3 border-b border-gray-200 w-24 text-center font-semibold text-gray-600 text-xs">STATUS</th>
                            <SortableHeader label="Source" sortKey="source" />
                            <SortableHeader label="Ref No" sortKey="referenceNumber" />
                            <SortableHeader label="Insured / Cedant" sortKey="insuredName" />
                            <SortableHeader label="Broker" sortKey="brokerName" />
                            <SortableHeader label="Class" sortKey="classOfBusiness" />
                            <SortableHeader label="Territory" sortKey="territory" />
                            <SortableHeader label="Limit" sortKey="limit" className="text-right" />
                            <SortableHeader label="Gross Prem" sortKey="grossPremium" className="text-right" />
                            <SortableHeader label="Our %" sortKey="ourShare" className="text-right" />
                            <SortableHeader label="Inception" sortKey="inceptionDate" />
                            <SortableHeader label="Expiry" sortKey="expiryDate" />
                            <th className="px-3 py-3 border-b border-gray-200 w-20 text-center font-semibold text-gray-600 text-xs">Actions</th>
                        </tr>
                    ) : (
                        <tr>
                            <th className="px-3 py-3 border-b border-gray-200 w-24 text-center font-semibold text-gray-600 text-xs bg-gray-50 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">STATUS</th>

                            {/* Identity / References */}
                            <SortableHeader label="Source" sortKey="source" />
                            <SortableHeader label="Ref No" sortKey="referenceNumber" />
                            <SortableHeader label="Secondary Ref" sortKey="secondaryRef" />
                            <SortableHeader label="Slip No" sortKey="slipNumber" />
                            <SortableHeader label="Agreement No" sortKey="agreementNumber" />
                            <SortableHeader label="1C Code" sortKey="accountingCode" />

                            {/* Parties */}
                            <SortableHeader label="Insured Name" sortKey="insuredName" />
                            <SortableHeader label="Cedant" sortKey="cedantName" />
                            <SortableHeader label="Broker" sortKey="brokerName" />
                            <SortableHeader label="Borrower" sortKey="borrower" />
                            <SortableHeader label="Retrocedent" sortKey="retrocedent" />
                            <SortableHeader label="Performer" sortKey="performer" />

                            {/* Classification */}
                            <SortableHeader label="Class" sortKey="classOfBusiness" />
                            <SortableHeader label="Type of Insurance" sortKey="typeOfInsurance" />
                            <SortableHeader label="Risk Code" sortKey="riskCode" />
                            <SortableHeader label="Insured Risk" sortKey="insuredRisk" />
                            <SortableHeader label="Industry" sortKey="industry" />
                            <SortableHeader label="Territory" sortKey="territory" />
                            <SortableHeader label="City" sortKey="city" />

                            {/* Financial - Currency & Exchange */}
                            <SortableHeader label="Currency" sortKey="currency" />
                            <SortableHeader label="Ex Rate" sortKey="exchangeRate" className="text-right" />
                            <SortableHeader label="Ex Rate USD" sortKey="exchangeRateUSD" className="text-right" />
                            <SortableHeader label="Equiv USD" sortKey="equivalentUSD" className="text-right" />

                            {/* Financial - Sums */}
                            <SortableHeader label="Sum Insured" sortKey="sumInsured" className="text-right" />
                            <SortableHeader label="Sum Insured NC" sortKey="sumInsuredNational" className="text-right" />
                            <SortableHeader label="Limit FC" sortKey="limit" className="text-right" />
                            <SortableHeader label="Limit NC" sortKey="limitNational" className="text-right" />
                            <SortableHeader label="Excess FC" sortKey="excess" className="text-right" />
                            <SortableHeader label="Priority" sortKey="prioritySum" className="text-right" />

                            {/* Financial - Premium */}
                            <SortableHeader label="Prem Rate" sortKey="premiumRate" className="text-right" />
                            <SortableHeader label="Gross Prem FC" sortKey="grossPremium" className="text-right" />
                            <SortableHeader label="Gross Prem NC" sortKey="grossPremiumNational" className="text-right" />
                            <SortableHeader label="Premium NC" sortKey="premiumNational" className="text-right" />
                            <SortableHeader label="Full Prem FC" sortKey="fullPremiumForeign" className="text-right" />
                            <SortableHeader label="Full Prem NC" sortKey="fullPremiumNational" className="text-right" />
                            <SortableHeader label="Net Prem FC" sortKey="netPremium" className="text-right" />
                            <SortableHeader label="Net Prem NC" sortKey="netPremiumNational" className="text-right" />

                            {/* Rates */}
                            <SortableHeader label="Our %" sortKey="ourShare" className="text-right" />
                            <SortableHeader label="Comm %" sortKey="commissionPercent" className="text-right" />
                            <SortableHeader label="Comm NC" sortKey="commissionNational" className="text-right" />
                            <SortableHeader label="Tax %" sortKey="taxPercent" className="text-right" />

                            {/* Reinsurance */}
                            <SortableHeader label="Reins Type" sortKey="reinsuranceType" />
                            <SortableHeader label="Sum Reins FC" sortKey="sumReinsuredForeign" className="text-right" />
                            <SortableHeader label="Sum Reins NC" sortKey="sumReinsuredNational" className="text-right" />
                            <SortableHeader label="Reinsurer" sortKey="reinsurerName" />
                            <SortableHeader label="Ceded %" sortKey="cededShare" className="text-right" />
                            <SortableHeader label="Ceded Prem" sortKey="cededPremium" className="text-right" />
                            <SortableHeader label="Reins Comm" sortKey="reinsuranceCommission" className="text-right" />
                            <SortableHeader label="Net Reins Prem" sortKey="netReinsurancePremium" className="text-right" />

                            {/* Treaty & AIC */}
                            <SortableHeader label="Treaty Placement" sortKey="treatyPlacement" className="text-right" />
                            <SortableHeader label="Treaty Prem" sortKey="treatyPremium" className="text-right" />
                            <SortableHeader label="AIC Comm" sortKey="aicCommission" className="text-right" />
                            <SortableHeader label="AIC Retention" sortKey="aicRetention" className="text-right" />
                            <SortableHeader label="AIC Prem" sortKey="aicPremium" className="text-right" />

                            {/* Retrocession */}
                            <SortableHeader label="Risks Count" sortKey="risksCount" className="text-right" />
                            <SortableHeader label="Retro Sum" sortKey="retroSumReinsured" className="text-right" />
                            <SortableHeader label="Retro Prem" sortKey="retroPremium" className="text-right" />

                            {/* Dates */}
                            <SortableHeader label="Inception" sortKey="inceptionDate" />
                            <SortableHeader label="Expiry" sortKey="expiryDate" />
                            <SortableHeader label="Ins Days" sortKey="insuranceDays" className="text-right" />
                            <SortableHeader label="Reins Inception" sortKey="reinsuranceInceptionDate" />
                            <SortableHeader label="Reins Expiry" sortKey="reinsuranceExpiryDate" />
                            <SortableHeader label="Reins Days" sortKey="reinsuranceDays" className="text-right" />
                            <SortableHeader label="Slip Date" sortKey="dateOfSlip" />
                            <SortableHeader label="Acct Date" sortKey="accountingDate" />
                            <SortableHeader label="Warranty" sortKey="warrantyPeriod" />

                            {/* Payment Tracking */}
                            <SortableHeader label="Prem Pay Date" sortKey="premiumPaymentDate" />
                            <SortableHeader label="Actual Pay Date" sortKey="actualPaymentDate" />
                            <SortableHeader label="Rcvd Prem FC" sortKey="receivedPremiumForeign" className="text-right" />
                            <SortableHeader label="Rcvd Prem Curr" sortKey="receivedPremiumCurrency" />
                            <SortableHeader label="Rcvd Ex Rate" sortKey="receivedPremiumExchangeRate" className="text-right" />
                            <SortableHeader label="Rcvd Prem NC" sortKey="receivedPremiumNational" className="text-right" />
                            <SortableHeader label="No. Slips" sortKey="numberOfSlips" className="text-right" />

                            {/* Contract Info */}
                            <th className="px-3 py-3 border-b border-gray-200 text-xs font-semibold text-gray-600">Type</th>
                            <th className="px-3 py-3 border-b border-gray-200 text-xs font-semibold text-gray-600">Structure</th>

                            <th className="px-3 py-3 border-b border-gray-200 w-24 text-center font-semibold text-gray-600 text-xs bg-gray-100 sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</th>
                        </tr>
                    )}
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {sortedRows.map(row => {
                        const rowClass = row.isDeleted ? 'bg-gray-50 opacity-75' : 'hover:bg-blue-50/30';

                        return (
                        <tr
                            key={`${row.source}-${row.id}`}
                            onClick={() => setSelectedRow(row)}
                            className={`group transition-colors cursor-pointer ${rowClass}`}
                        >
                            {viewMode === 'compact' ? (
                                <>
                                    <td className="px-3 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          row.normalizedStatus === 'Active' ? 'text-green-700 bg-green-100' :
                                          row.normalizedStatus === 'Pending' ? 'text-amber-700 bg-amber-100' :
                                          row.normalizedStatus === 'Cancelled' ? 'text-red-700 bg-red-100' :
                                          'text-gray-600 bg-gray-100'
                                        }`}>
                                          {row.isDeleted ? <><Trash2 size={10}/> DELETED</> : row.normalizedStatus.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <SourceBadge source={row.source} />
                                    </td>
                                    <td className="px-3 py-3 font-mono text-xs text-blue-600 font-medium">
                                        {row.referenceNumber}
                                    </td>
                                    <td className="px-3 py-3 font-medium text-gray-900">
                                        {row.cedantName ? (
                                            <div className="flex flex-col">
                                                <span
                                                    className="hover:text-blue-600 hover:underline cursor-pointer"
                                                    onClick={(e) => handleEntityClick(e, row.cedantName)}
                                                >
                                                    {row.cedantName}
                                                </span>
                                                <span className="text-[10px] text-gray-500 flex gap-1">
                                                    Orig:
                                                    <span
                                                        className="hover:text-blue-600 hover:underline cursor-pointer"
                                                        onClick={(e) => handleEntityClick(e, row.insuredName)}
                                                    >
                                                        {row.insuredName}
                                                    </span>
                                                </span>
                                            </div>
                                        ) : (
                                            <span
                                                className="hover:text-blue-600 hover:underline cursor-pointer"
                                                onClick={(e) => handleEntityClick(e, row.insuredName)}
                                            >
                                                {row.insuredName}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-xs text-gray-600">
                                        {row.brokerName ? (
                                            <span
                                                className="text-blue-600 hover:underline cursor-pointer"
                                                onClick={(e) => handleEntityClick(e, row.brokerName)}
                                            >
                                                {row.brokerName}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 text-xs">
                                        {row.classOfBusiness}
                                    </td>
                                    <td className="px-3 py-3 text-gray-600 text-xs">
                                        {row.territory || '-'}
                                    </td>
                                    <td className="px-3 py-3 text-right font-medium text-gray-700">
                                        {formatMoney(row.limit, row.currency)}
                                    </td>
                                    <td className="px-3 py-3 text-right font-bold text-gray-900 bg-gray-50/50">
                                        {formatMoney(row.grossPremium, row.currency)}
                                    </td>
                                    <td className="px-3 py-3 text-right text-xs">
                                        {row.ourShare}%
                                    </td>
                                    <td className="px-3 py-3 text-xs text-gray-600">
                                        {formatDate(row.inceptionDate)}
                                    </td>
                                    <td className="px-3 py-3 text-xs text-gray-600">
                                        {formatDate(row.expiryDate)}
                                    </td>

                                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-1">
                                            {row.isDeleted ? (
                                                user?.role === 'Super Admin' && row.source === 'direct' && (
                                                    <button onClick={(e) => handleRestore(e, row)} title="Restore" className="p-1.5 text-green-600 hover:bg-green-100 rounded">
                                                        <RefreshCw size={14}/>
                                                    </button>
                                                )
                                            ) : (
                                                <>
                                                    {row.source === 'direct' && (
                                                        <button onClick={(e) => handleWording(e, row)} title="Wording" className="p-1.5 text-purple-600 hover:bg-purple-100 rounded">
                                                            <FileText size={14}/>
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => handleEdit(e, row)} title="Edit" className="p-1.5 text-blue-600 hover:bg-blue-100 rounded">
                                                        <Edit size={14}/>
                                                    </button>
                                                    {row.source === 'direct' && (
                                                        <button onClick={(e) => initiateDelete(e, row)} title="Delete" className="p-1.5 text-red-600 hover:bg-red-100 rounded">
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </>
                            ) : (
                                <>
                                    {/* EXTENDED VIEW */}
                                    <td className={`px-3 py-2 text-center sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors bg-white group-hover:bg-blue-50/30`}>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          row.normalizedStatus === 'Active' ? 'text-green-700 bg-green-100' :
                                          row.normalizedStatus === 'Pending' ? 'text-amber-700 bg-amber-100' :
                                          row.normalizedStatus === 'Cancelled' ? 'text-red-700 bg-red-100' :
                                          'text-gray-600 bg-gray-100'
                                        }`}>
                                          {row.isDeleted ? <><Trash2 size={10}/> DEL</> : row.normalizedStatus.toUpperCase()}
                                        </span>
                                    </td>

                                    {/* Identity / References */}
                                    <td className="px-3 py-2 whitespace-nowrap"><SourceBadge source={row.source} /></td>
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-blue-600">{row.referenceNumber}</td>
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-500">{row.secondaryRef || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-500">{row.slipNumber || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-500">{row.agreementNumber || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-500">{row.accountingCode || '-'}</td>

                                    {/* Parties */}
                                    <td
                                        className="px-3 py-2 whitespace-nowrap font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                                        onClick={(e) => handleEntityClick(e, row.insuredName)}
                                    >
                                        {row.insuredName}
                                    </td>
                                    <td
                                        className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 hover:text-blue-600 hover:underline cursor-pointer"
                                        onClick={(e) => handleEntityClick(e, row.cedantName)}
                                    >
                                        {row.cedantName || '-'}
                                    </td>
                                    <td
                                        className="px-3 py-2 whitespace-nowrap text-xs hover:text-blue-600 hover:underline cursor-pointer"
                                        onClick={(e) => handleEntityClick(e, row.brokerName)}
                                    >
                                        {row.brokerName || '-'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.borrower || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.retrocedent || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.performer || '-'}</td>

                                    {/* Classification */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{row.classOfBusiness}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.typeOfInsurance || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.riskCode || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 max-w-[200px] truncate" title={row.insuredRisk}>{row.insuredRisk || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.industry || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{row.territory || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.city || '-'}</td>

                                    {/* Financial - Currency & Exchange */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-center font-bold">{row.currency}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.exchangeRate || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.exchangeRateUSD || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.equivalentUSD)}</td>

                                    {/* Financial - Sums */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.sumInsured)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.sumInsuredNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-blue-50/30">{formatNumber(row.limit)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.limitNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.excess)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.prioritySum)}</td>

                                    {/* Financial - Premium */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.premiumRate ? `${row.premiumRate}%` : '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right bg-green-50/30 font-bold">{formatNumber(row.grossPremium)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.grossPremiumNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.premiumNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.fullPremiumForeign)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.fullPremiumNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.netPremium)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.netPremiumNational)}</td>

                                    {/* Rates */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right font-bold text-blue-700">{row.ourShare}%</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.commissionPercent ? `${row.commissionPercent}%` : '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.commissionNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.taxPercent ? `${row.taxPercent}%` : '-'}</td>

                                    {/* Reinsurance */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{row.reinsuranceType || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.sumReinsuredForeign)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.sumReinsuredNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.reinsurerName || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.cededShare ? `${row.cededShare}%` : '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.cededPremium)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.reinsuranceCommission)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.netReinsurancePremium)}</td>

                                    {/* Treaty & AIC */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.treatyPlacement ? `${row.treatyPlacement}%` : '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.treatyPremium)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.aicCommission)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.aicRetention ? `${row.aicRetention}%` : '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.aicPremium)}</td>

                                    {/* Retrocession */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.risksCount || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.retroSumReinsured)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.retroPremium)}</td>

                                    {/* Dates */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.inceptionDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.expiryDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.insuranceDays || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.reinsuranceInceptionDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.reinsuranceExpiryDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.reinsuranceDays || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.dateOfSlip)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.accountingDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{row.warrantyPeriod || '-'}</td>

                                    {/* Payment Tracking */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.premiumPaymentDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.actualPaymentDate)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.receivedPremiumForeign)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-center">{row.receivedPremiumCurrency || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.receivedPremiumExchangeRate || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatNumber(row.receivedPremiumNational)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.numberOfSlips || '-'}</td>

                                    {/* Contract Info */}
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{row.contractType || '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{row.structure || '-'}</td>

                                    <td className={`px-3 py-2 text-center sticky right-0 z-20 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors bg-white group-hover:bg-blue-50/30`} onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-1">
                                            {!row.isDeleted && (
                                                <>
                                                    {row.source === 'direct' && (
                                                        <button onClick={(e) => handleWording(e, row)} title="Wording" className="p-1 text-purple-600 hover:bg-purple-100 rounded">
                                                            <FileText size={14}/>
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => handleEdit(e, row)} title="Edit" className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit size={14}/></button>
                                                    {row.source === 'direct' && (
                                                        <button onClick={(e) => initiateDelete(e, row)} title="Delete" className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 size={14}/></button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </>
                            )}
                        </tr>
                    )})}

                    {!loading && sortedRows.length === 0 && (
                        <tr>
                            <td colSpan={viewMode === 'compact' ? 13 : 77} className="py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <Filter size={32} className="opacity-20"/>
                                    <p>No records found matching your criteria.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Record?"
        message="Are you sure you want to delete this record? It will be moved to the Deleted Records bin."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
        confirmText="Delete"
      />

      <ConfirmDialog
        isOpen={createEntityConfirm.isOpen}
        title="Entity Not Found"
        message={`Entity "${createEntityConfirm.name}" not found in database. Would you like to create it?`}
        onConfirm={() => { setCreateEntityConfirm({ isOpen: false, name: '' }); navigate('/entities/new'); }}
        onCancel={() => setCreateEntityConfirm({ isOpen: false, name: '' })}
        variant="info"
        confirmText="Create Entity"
      />

      {selectedRow && selectedRow.source === 'direct' && (
          <DetailModal
            item={selectedRow.originalData as Policy}
            onClose={() => setSelectedRow(null)}
            onRefresh={fetchData}
            title="Policy Details"
          />
      )}

      <EntityDetailModal
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onEdit={(id) => { setSelectedEntity(null); navigate(`/entities/edit/${id}`); }}
      />

      {/* Policy Form Modal */}
      <FormModal
        isOpen={showPolicyModal}
        onClose={() => {
          setShowPolicyModal(false);
          setEditingPolicyId(null);
        }}
        title={editingPolicyId ? 'Edit Policy' : 'New Policy Record'}
        subtitle={editingPolicyId ? 'Editing policy' : 'Create a new insurance policy'}
      >
        <PolicyFormContent
          id={editingPolicyId || undefined}
          onSave={() => {
            setShowPolicyModal(false);
            setEditingPolicyId(null);
            fetchData();
          }}
          onCancel={() => {
            setShowPolicyModal(false);
            setEditingPolicyId(null);
          }}
        />
      </FormModal>
    </div>
  );
};

export default Dashboard;
