import React, { useState, useEffect, useMemo } from 'react';
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
  Building2, RefreshCw, Globe, MapPin, Download
} from 'lucide-react';

const DirectInsuranceList: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string; number: string }>({
    show: false, id: '', number: ''
  });

  // Load policies
  const loadPolicies = async () => {
    setLoading(true);
    try {
      const allPolicies = await DB.getPolicies();
      // Filter for Direct Insurance only (channel = 'Direct')
      const directPolicies = allPolicies.filter(p =>
        p.channel === 'Direct' && !p.isDeleted
      );
      setPolicies(directPolicies);
    } catch (error) {
      console.error('Failed to load policies:', error);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  // Filtered policies
  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      const matchesSearch =
        policy.policyNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.insuredName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;

      const matchesCountry = countryFilter === 'all' ||
        (countryFilter === 'uzbekistan' && policy.insuredCountry === 'Uzbekistan') ||
        (countryFilter === 'foreign' && policy.insuredCountry !== 'Uzbekistan');

      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [policies, searchTerm, statusFilter, countryFilter]);

  // Stats
  const stats = useMemo(() => {
    const uzbekPolicies = policies.filter(p => p.insuredCountry === 'Uzbekistan');
    const foreignPolicies = policies.filter(p => p.insuredCountry && p.insuredCountry !== 'Uzbekistan');
    const totalGWP = policies.reduce((sum, p) => sum + (p.grossPremium || 0), 0);

    return {
      total: policies.length,
      uzbekistan: uzbekPolicies.length,
      foreign: foreignPolicies.length,
      totalGWP,
      active: policies.filter(p => p.status === 'Active').length,
      draft: policies.filter(p => p.status === 'Draft').length,
    };
  }, [policies]);

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
    // Open the form modal to view/edit the policy
    setEditingPolicyId(id);
    setShowFormModal(true);
  };

  const handleDeletePolicy = async () => {
    if (!deleteConfirm.id) return;
    try {
      await DB.deletePolicy(deleteConfirm.id);
      toast.success(`Policy ${deleteConfirm.number} deleted`);
      loadPolicies();
    } catch (error) {
      toast.error('Failed to delete policy');
    } finally {
      setDeleteConfirm({ show: false, id: '', number: '' });
    }
  };

  const handleFormSave = () => {
    setShowFormModal(false);
    setEditingPolicyId(undefined);
    loadPolicies();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total GWP</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(stats.totalGWP)}</p>
        </div>
      </div>

      {/* Filters - Combined with Title */}
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Country Filter */}
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
          >
            <option value="all">All Countries</option>
            <option value="uzbekistan">Uzbekistan</option>
            <option value="foreign">Foreign</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            onClick={loadPolicies}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : 'text-slate-600'} />
          </button>

          <div className="w-px h-5 bg-slate-300" />

          {/* Export Button */}
          <button
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

      {/* Policies Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
          </div>
        ) : filteredPolicies.length === 0 ? (
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Policy #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Insured</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">GWP</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPolicies.map((policy) => (
                  <tr
                    key={policy.id}
                    onClick={() => handleViewPolicy(policy.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{policy.policyNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        <span className="text-slate-700">{policy.insuredName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-sm ${
                        policy.insuredCountry === 'Uzbekistan' ? 'text-blue-600' : 'text-purple-600'
                      }`}>
                        {policy.insuredCountry === 'Uzbekistan' ? <MapPin size={14} /> : <Globe size={14} />}
                        {policy.insuredCountry || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{policy.classOfInsurance}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {formatDate(policy.inceptionDate)} - {formatDate(policy.expiryDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatCurrency(policy.grossPremium || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(policy.status)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewPolicy(policy.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={16} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleEditPolicy(policy.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ show: true, id: policy.id, number: policy.policyNumber })}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
