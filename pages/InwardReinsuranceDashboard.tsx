import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { InwardReinsurance, Currency } from '../types';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateUtils';
import { FormModal } from '../components/FormModal';
import { InwardReinsuranceFormContent } from '../components/InwardReinsuranceFormContent';
import {
  Search, RefreshCw, Download,
  Globe, Home, TrendingUp, DollarSign,
  FileText, Building2, Calendar, Eye, Edit, MoreVertical
} from 'lucide-react';
import { exportToExcel } from '../services/excelExport';

const InwardReinsuranceDashboard: React.FC = () => {
  const toast = useToast();

  const [contracts, setContracts] = useState<InwardReinsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'foreign' | 'domestic'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  // Sticky offset measurement
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterHeight, setFilterHeight] = useState(62);
  useEffect(() => {
    const el = filterRef.current;
    if (!el) return;
    const update = () => setFilterHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Kebab menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editingOrigin, setEditingOrigin] = useState<'FOREIGN' | 'DOMESTIC'>('FOREIGN');

  // Load all inward reinsurance contracts
  const loadContracts = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('inward_reinsurance')
          .select('*')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped: InwardReinsurance[] = (data || []).map((row: any) => ({
          id: row.id,
          contractNumber: row.contract_number,
          origin: row.origin,
          type: row.type,
          structure: row.structure,
          status: row.status,
          cedantName: row.cedant_name,
          cedantEntityId: row.cedant_entity_id,
          cedantCountry: row.cedant_country,
          brokerName: row.broker_name,
          brokerEntityId: row.broker_entity_id,
          inceptionDate: row.inception_date,
          expiryDate: row.expiry_date,
          uwYear: row.uw_year,
          typeOfCover: row.type_of_cover,
          classOfCover: row.class_of_cover,
          industry: row.industry,
          territory: row.territory,
          originalInsuredName: row.original_insured_name,
          riskDescription: row.risk_description,
          currency: row.currency as Currency,
          limitOfLiability: row.limit_of_liability,
          deductible: row.deductible,
          retention: row.retention,
          ourShare: row.our_share,
          grossPremium: row.gross_premium,
          commissionPercent: row.commission_percent,
          netPremium: row.net_premium,
          minimumPremium: row.minimum_premium,
          depositPremium: row.deposit_premium,
          adjustablePremium: row.adjustable_premium,
          treatyName: row.treaty_name,
          treatyNumber: row.treaty_number,
          layerNumber: row.layer_number,
          excessPoint: row.excess_point,
          aggregateLimit: row.aggregate_limit,
          aggregateDeductible: row.aggregate_deductible,
          reinstatements: row.reinstatements,
          reinstatementPremium: row.reinstatement_premium,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
          isDeleted: row.is_deleted,
        }));

        setContracts(mapped);
      } else {
        // Fallback for demo/local mode
        setContracts([]);
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
      toast.error('Failed to load inward reinsurance contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const matchesSearch =
        contract.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.cedantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.brokerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.originalInsuredName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' ||
        (typeFilter === 'foreign' && contract.origin === 'FOREIGN') ||
        (typeFilter === 'domestic' && contract.origin === 'DOMESTIC');

      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;

      const matchesClass = classFilter === 'all' || contract.classOfCover === classFilter;

      return matchesSearch && matchesType && matchesStatus && matchesClass;
    });
  }, [contracts, searchTerm, typeFilter, statusFilter, classFilter]);

  // Get unique classes for filter
  const uniqueClasses = useMemo(() => {
    const classes = new Set(contracts.map(c => c.classOfCover).filter(Boolean));
    return Array.from(classes).sort();
  }, [contracts]);

  // Statistics
  const stats = useMemo(() => {
    const foreign = contracts.filter(c => c.origin === 'FOREIGN');
    const domestic = contracts.filter(c => c.origin === 'DOMESTIC');

    const totalGWP = contracts.reduce((sum, c) => sum + (c.grossPremium || 0), 0);
    const totalNWP = contracts.reduce((sum, c) => sum + (c.netPremium || 0), 0);
    const foreignGWP = foreign.reduce((sum, c) => sum + (c.grossPremium || 0), 0);
    const domesticGWP = domestic.reduce((sum, c) => sum + (c.grossPremium || 0), 0);

    const active = contracts.filter(c => c.status === 'ACTIVE').length;
    const pending = contracts.filter(c => c.status === 'PENDING' || c.status === 'DRAFT').length;
    const expired = contracts.filter(c => c.status === 'EXPIRED').length;

    // By class breakdown
    const byClass: Record<string, { count: number; gwp: number }> = {};
    contracts.forEach(c => {
      const cls = c.classOfCover || 'Other';
      if (!byClass[cls]) byClass[cls] = { count: 0, gwp: 0 };
      byClass[cls].count++;
      byClass[cls].gwp += c.grossPremium || 0;
    });

    return {
      total: contracts.length,
      foreign: foreign.length,
      domestic: domestic.length,
      totalGWP,
      totalNWP,
      foreignGWP,
      domesticGWP,
      active,
      pending,
      expired,
      byClass,
    };
  }, [contracts]);

  // Export to Excel
  const handleExport = () => {
    if (filteredContracts.length === 0) {
      toast.error('No contracts to export');
      return;
    }

    setExporting(true);
    try {
      const exportData = filteredContracts.map(c => ({
        'Contract No.': c.contractNumber,
        'Origin': c.origin,
        'Type': c.type,
        'Structure': c.structure,
        'Cedant': c.cedantName,
        'Broker': c.brokerName || 'Direct',
        'Class': c.classOfCover,
        'Inception': c.inceptionDate,
        'Expiry': c.expiryDate,
        'Currency': c.currency,
        'Limit': c.limitOfLiability || 0,
        'Gross Premium': c.grossPremium || 0,
        'Net Premium': c.netPremium || 0,
        'Our Share %': c.ourShare || 0,
        'Status': c.status,
      }));
      exportToExcel(exportData, `Inward_Reinsurance_${new Date().toISOString().split('T')[0]}`, 'Inward Reinsurance');
      toast.success('Exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number, short: boolean = false) => {
    if (short) {
      if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'DRAFT': 'bg-slate-100 text-slate-600',
      'PENDING': 'bg-amber-100 text-amber-700',
      'ACTIVE': 'bg-emerald-100 text-emerald-700',
      'EXPIRED': 'bg-slate-100 text-slate-500',
      'CANCELLED': 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (origin: string) => {
    if (origin === 'FOREIGN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <Globe size={12} /> Foreign
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Home size={12} /> Domestic
      </span>
    );
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide mb-1">
            <FileText size={14} />
            Total Contracts
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-purple-500 text-xs uppercase tracking-wide mb-1">
            <Globe size={14} />
            Foreign
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.foreign}</p>
          <p className="text-xs text-slate-400 mt-1">{formatCurrency(stats.foreignGWP, true)} GWP</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-500 text-xs uppercase tracking-wide mb-1">
            <Home size={14} />
            Domestic
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.domestic}</p>
          <p className="text-xs text-slate-400 mt-1">{formatCurrency(stats.domesticGWP, true)} GWP</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-wide mb-1">
            <TrendingUp size={14} />
            Active
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide mb-1">
            <DollarSign size={14} />
            Total GWP
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalGWP, true)}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide mb-1">
            <DollarSign size={14} />
            Total NWP
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalNWP, true)}</p>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div ref={filterRef} className="sticky top-0 z-30 bg-gray-50">
      <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[120px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Types</option>
          <option value="foreign">Foreign</option>
          <option value="domestic">Domestic</option>
        </select>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Classes</option>
          {uniqueClasses.map(cls => (
            <option key={cls} value={cls}>{cls.length > 30 ? cls.substring(0, 30) + '...' : cls}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Refresh */}
        <button
          onClick={loadContracts}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
        </button>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting || filteredContracts.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Export to Excel
        </button>
      </div>
      </div>{/* end sticky filter bar */}

      {/* Contracts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileText size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No contracts found</p>
            <p className="text-sm">Try adjusting your filters or create new contracts</p>
          </div>
        ) : (
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 sticky z-20 shadow-sm" style={{ top: `${filterHeight}px` }}>
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contract #</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Origin</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide max-w-[200px]">Cedant</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide max-w-[120px]">Class</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Our Share</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">GWP</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Status</th>
                  <th className="px-1 py-3 w-10 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    onClick={() => {
                      setEditingContractId(contract.id);
                      setEditingOrigin(contract.origin as 'FOREIGN' | 'DOMESTIC');
                      setShowFormModal(true);
                    }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 py-3">
                      <span className="font-medium text-slate-800">{contract.contractNumber}</span>
                    </td>
                    <td className="px-3 py-3 w-24">
                      {getTypeBadge(contract.origin)}
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-sm">
                      {contract.type} / {contract.structure}
                    </td>
                    <td className="px-3 py-3 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-slate-700 font-medium truncate">{contract.cedantName}</p>
                          {contract.brokerName && (
                            <p className="text-xs text-slate-400 truncate">via {contract.brokerName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-sm max-w-[120px] truncate" title={contract.classOfCover}>{contract.classOfCover}</td>
                    <td className="px-3 py-3 text-slate-600 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                        {formatDate(contract.inceptionDate)} - {formatDate(contract.expiryDate)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700 font-medium w-20">
                      {contract.ourShare || 100}%
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatCurrency(contract.grossPremium || 0)}
                    </td>
                    <td className="px-3 py-3 text-center w-20">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-1 py-2 text-center w-10 relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === contract.id ? null : contract.id); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                      {openMenuId === contract.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]">
                          <button onClick={() => { setOpenMenuId(null); setEditingContractId(contract.id); setEditingOrigin(contract.origin as 'FOREIGN' | 'DOMESTIC'); setShowFormModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Eye size={14} /> View
                          </button>
                          <button onClick={() => { setOpenMenuId(null); setEditingContractId(contract.id); setEditingOrigin(contract.origin as 'FOREIGN' | 'DOMESTIC'); setShowFormModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Edit size={14} /> Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingContractId(null);
        }}
        title={editingContractId ? 'Edit Inward Reinsurance' : 'New Inward Reinsurance'}
        subtitle={editingOrigin === 'FOREIGN' ? 'Foreign Contract' : 'Domestic Contract'}
      >
        <InwardReinsuranceFormContent
          id={editingContractId || undefined}
          origin={editingOrigin}
          onSave={() => {
            setShowFormModal(false);
            setEditingContractId(null);
            loadContracts();
          }}
          onCancel={() => {
            setShowFormModal(false);
            setEditingContractId(null);
          }}
        />
      </FormModal>
    </div>
  );
};

export default InwardReinsuranceDashboard;
