import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { Policy, PolicyStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormModal } from '../components/FormModal';
import { DirectInsuranceFormContent } from '../components/DirectInsuranceFormContent';
import { formatDate } from '../utils/dateUtils';
import {
  Plus, Search, FileText, Trash2, Edit, Eye,
  Building2, RefreshCw, Globe, MapPin, Download, MoreVertical,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { exportToExcel } from '../services/excelExport';

const DirectInsuranceList: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Server-side pagination state
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(25);
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  // Search with debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sticky offset measurement
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterHeight, setFilterHeight] = useState(66);
  useEffect(() => {
    const el = filterRef.current;
    if (!el) return;
    const update = () => setFilterHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // Stats (lightweight count queries)
  const [stats, setStats] = useState({ total: 0, uzbekistan: 0, foreign: 0, active: 0, draft: 0 });

  // Kebab menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string; number: string }>({
    show: false, id: '', number: ''
  });

  // Load stats (separate from data fetch)
  const loadStats = useCallback(async () => {
    try {
      const s = await DB.getDirectPoliciesStats();
      setStats(s);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Fetch paginated data from view
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await DB.getDirectPoliciesPage({
        page: currentPage - 1, // API is 0-indexed
        pageSize: rowsPerPage,
        countryFilter,
        statusFilter,
        searchTerm,
      });
      setPolicies(result.rows);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Failed to load policies:', error);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, countryFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load stats on mount and after mutations
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300);
  };

  // Filter changes reset to page 1
  const handleCountryFilterChange = (value: string) => {
    setCountryFilter(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Handlers
  const handleNewPolicy = () => {
    setEditingPolicyId(undefined);
    setShowFormModal(true);
  };

  const handleEditPolicy = (id: string) => {
    setEditingPolicyId(id);
    setShowFormModal(true);
  };

  const handleViewPolicy = (id: string) => {
    setEditingPolicyId(id);
    setShowFormModal(true);
  };

  const handleDeletePolicy = async () => {
    if (!deleteConfirm.id) return;
    try {
      await DB.deletePolicy(deleteConfirm.id);
      toast.success(`Policy ${deleteConfirm.number} deleted`);
      fetchData();
      loadStats();
    } catch (error) {
      toast.error('Failed to delete policy');
    } finally {
      setDeleteConfirm({ show: false, id: '', number: '' });
    }
  };

  const handleFormSave = () => {
    setShowFormModal(false);
    setEditingPolicyId(undefined);
    fetchData();
    loadStats();
    toast.success(editingPolicyId ? 'Policy updated' : 'Policy created');
  };

  const handleFormCancel = () => {
    setShowFormModal(false);
    setEditingPolicyId(undefined);
  };

  const getStatusBadge = (status: PolicyStatus | string) => {
    const styles: Record<string, string> = {
      'Draft': 'bg-slate-100 text-slate-600',
      'Active': 'bg-emerald-100 text-emerald-700',
      'Expired': 'bg-amber-100 text-amber-700',
      'Cancelled': 'bg-red-100 text-red-700',
      'Pending Confirmation': 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  const handleExport = () => {
    if (policies.length === 0) return;
    const exportData = policies.map((p: any) => ({
      'Policy #': p.policy_number,
      'Insured': p.insured_name,
      'Country': p.territory || '',
      'Class': p.class_of_business || '',
      'Inception': p.inception_date || '',
      'Expiry': p.expiry_date || '',
      'GWP': p.gross_premium || 0,
      'Status': p.status,
    }));
    exportToExcel(exportData, `Direct_Insurance_${new Date().toISOString().split('T')[0]}`, 'Direct Insurance');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Policies</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <MapPin size={12} /> Uzbekistan
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.uzbekistan}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Globe size={12} /> Foreign
          </p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.foreign}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Draft</p>
          <p className="text-2xl font-bold text-slate-400 mt-1">{stats.draft}</p>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div ref={filterRef} className="sticky top-0 z-30 bg-gray-50">
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Country Filter */}
          <select
            value={countryFilter}
            onChange={(e) => handleCountryFilterChange(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
          >
            <option value="all">All Countries</option>
            <option value="uzbekistan">Uzbekistan</option>
            <option value="foreign">Foreign</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Refresh */}
          <button
            onClick={() => { fetchData(); loadStats(); }}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : 'text-slate-600'} />
          </button>

          <div className="w-px h-5 bg-slate-300" />

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-sm"
          >
            <Download size={14} />
            Export to Excel
          </button>

          {/* New Policy Button */}
          <button
            onClick={handleNewPolicy}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            New Policy
          </button>
        </div>
      </div>
      </div>{/* end sticky filter bar */}

      {/* Policies Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
          </div>
        ) : policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileText size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No policies found</p>
            <p className="text-sm">Create your first direct insurance policy</p>
            <button
              onClick={handleNewPolicy}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} className="inline mr-2" />
              New Policy
            </button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 sticky z-20 shadow-sm" style={{ top: `${filterHeight}px` }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Policy #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Insured</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">GWP</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-1 py-3 w-10 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy: any) => (
                  <tr
                    key={policy.id}
                    onClick={() => handleViewPolicy(policy.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{policy.policy_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        <span className="text-slate-700">{policy.insured_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-sm ${
                        policy.territory === 'Uzbekistan' ? 'text-blue-600' : 'text-purple-600'
                      }`}>
                        {policy.territory === 'Uzbekistan' ? <MapPin size={14} /> : <Globe size={14} />}
                        {policy.territory || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{policy.class_of_business}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {formatDate(policy.inception_date)} - {formatDate(policy.expiry_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatCurrency(policy.gross_premium || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(policy.status)}
                    </td>
                    <td className="px-1 py-2 text-center w-10 relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === policy.id ? null : policy.id); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                      {openMenuId === policy.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]">
                          <button onClick={() => { setOpenMenuId(null); handleViewPolicy(policy.id); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Eye size={14} /> View
                          </button>
                          <button onClick={() => { setOpenMenuId(null); handleEditPolicy(policy.id); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Edit size={14} /> Edit
                          </button>
                          <button onClick={() => { setOpenMenuId(null); setDeleteConfirm({ show: true, id: policy.id, number: policy.policy_number }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * rowsPerPage, totalCount)}</span> of <span className="font-medium">{totalCount}</span> policies
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
                >
                  <ChevronLeft size={16}/>
                </button>
                <span className="flex items-center px-4 text-sm font-medium bg-white border rounded-lg shadow-sm">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || totalPages === 0}
                  className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
                >
                  <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={showFormModal}
        onClose={handleFormCancel}
        title={editingPolicyId ? 'Edit Policy' : 'New Direct Insurance Policy'}
        size="xl"
      >
        <DirectInsuranceFormContent
          id={editingPolicyId}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Delete Policy"
        message={`Are you sure you want to delete policy "${deleteConfirm.number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeletePolicy}
        onCancel={() => setDeleteConfirm({ show: false, id: '', number: '' })}
        variant="danger"
      />
    </div>
  );
};

export default DirectInsuranceList;
