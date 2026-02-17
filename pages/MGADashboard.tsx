import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DB } from '../services/db';
import { BindingAgreement, BordereauxEntry } from '../types';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateUtils';
import { FormModal } from '../components/FormModal';
import { MGAFormContent } from '../components/MGAFormContent';
import {
  Search, RefreshCw, Download, Plus,
  FileSignature, TrendingUp, DollarSign, BarChart3,
  Building2, Calendar, MoreVertical, Eye, Edit, Trash2,
  ChevronLeft, ChevronRight, FileText, ClipboardList,
  CheckCircle, Clock, AlertCircle, Save, X
} from 'lucide-react';
import { exportToExcel } from '../services/excelExport';

// ─── Bordereaux Entry Form (inline modal) ───────────────────────

interface BdxFormProps {
  agreementId: string;
  entry?: BordereauxEntry;
  onSave: () => void;
  onCancel: () => void;
}

const BordereauxEntryForm: React.FC<BdxFormProps> = ({ agreementId, entry, onSave, onCancel }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(entry);

  const [form, setForm] = useState<Partial<BordereauxEntry>>({
    id: entry?.id || crypto.randomUUID(),
    agreementId,
    bordereauType: entry?.bordereauType || 'PREMIUM',
    periodFrom: entry?.periodFrom || '',
    periodTo: entry?.periodTo || '',
    submissionDate: entry?.submissionDate || new Date().toISOString().split('T')[0],
    status: entry?.status || 'PENDING',
    totalGwp: entry?.totalGwp || 0,
    totalPolicies: entry?.totalPolicies || 0,
    totalClaimsPaid: entry?.totalClaimsPaid || 0,
    totalClaimsReserved: entry?.totalClaimsReserved || 0,
    notes: entry?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await DB.saveBordereauxEntry({
        id: form.id!,
        agreementId,
        bordereauType: form.bordereauType as BordereauxEntry['bordereauType'],
        periodFrom: form.periodFrom || undefined,
        periodTo: form.periodTo || undefined,
        submissionDate: form.submissionDate || undefined,
        status: (form.status || 'PENDING') as BordereauxEntry['status'],
        totalGwp: Number(form.totalGwp || 0),
        totalPolicies: Number(form.totalPolicies || 0),
        totalClaimsPaid: Number(form.totalClaimsPaid || 0),
        totalClaimsReserved: Number(form.totalClaimsReserved || 0),
        notes: form.notes,
      });
      toast.success(isEdit ? 'Bordereaux updated' : 'Bordereaux entry added');
      onSave();
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-xs font-medium text-slate-500 mb-1";
  const inputClass = "w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
      <h4 className="text-sm font-semibold text-slate-700">{isEdit ? 'Edit Bordereaux Entry' : 'New Bordereaux Entry'}</h4>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Type</label>
          <select name="bordereauType" value={form.bordereauType} onChange={handleChange} className={inputClass}>
            <option value="PREMIUM">Premium</option>
            <option value="CLAIMS">Claims</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Period From</label>
          <input type="date" name="periodFrom" value={form.periodFrom || ''} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Period To</label>
          <input type="date" name="periodTo" value={form.periodTo || ''} onChange={handleChange} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Submission Date</label>
          <input type="date" name="submissionDate" value={form.submissionDate || ''} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Total GWP</label>
          <input type="number" name="totalGwp" value={form.totalGwp ?? ''} onChange={handleChange} min={0} step="0.01" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Total Policies</label>
          <input type="number" name="totalPolicies" value={form.totalPolicies ?? ''} onChange={handleChange} min={0} className={inputClass} />
        </div>
      </div>
      {form.bordereauType === 'CLAIMS' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Total Claims Paid</label>
            <input type="number" name="totalClaimsPaid" value={form.totalClaimsPaid ?? ''} onChange={handleChange} min={0} step="0.01" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total Claims Reserved</label>
            <input type="number" name="totalClaimsReserved" value={form.totalClaimsReserved ?? ''} onChange={handleChange} min={0} step="0.01" className={inputClass} />
          </div>
        </div>
      )}
      <div>
        <label className={labelClass}>Notes</label>
        <input type="text" name="notes" value={form.notes || ''} onChange={handleChange} placeholder="Optional notes" className={inputClass} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50">
          <Save size={14} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

// ─── Detail Modal ───────────────────────────────────────────────

interface DetailModalProps {
  agreement: BindingAgreement;
  actualGwp: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ agreement, actualGwp, onClose, onEdit, onDelete }) => {
  const [tab, setTab] = useState<'summary' | 'bordereaux' | 'claims' | 'documents'>('summary');
  const [bdxEntries, setBdxEntries] = useState<BordereauxEntry[]>([]);
  const [bdxLoading, setBdxLoading] = useState(false);
  const [showBdxForm, setShowBdxForm] = useState(false);

  const loadBdx = useCallback(async () => {
    setBdxLoading(true);
    try {
      const entries = await DB.getBordereauxByAgreement(agreement.id);
      setBdxEntries(entries);
    } catch { /* ignore */ }
    setBdxLoading(false);
  }, [agreement.id]);

  useEffect(() => {
    if (tab === 'bordereaux') loadBdx();
  }, [tab, loadBdx]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: agreement.currency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const utilization = agreement.epi > 0 ? (actualGwp / agreement.epi) * 100 : 0;

  const getBdxStatusBadge = (status: string) => {
    const s: Record<string, string> = {
      'PENDING': 'bg-amber-100 text-amber-700',
      'UNDER_REVIEW': 'bg-blue-100 text-blue-700',
      'ACCEPTED': 'bg-emerald-100 text-emerald-700',
      'DISPUTED': 'bg-red-100 text-red-700',
      'REJECTED': 'bg-slate-100 text-slate-500',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s[status] || 'bg-slate-100 text-slate-600'}`}>{status.replace('_', ' ')}</span>;
  };

  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 my-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{agreement.agreementNumber}</h2>
            <p className="text-sm text-slate-500">{agreement.mgaName} &middot; {agreement.agreementType.replace('_', ' ')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center gap-1">
              <Edit size={14} /> Edit
            </button>
            <button onClick={onDelete} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1">
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-b border-slate-200">
          <button className={tabClass('summary')} onClick={() => setTab('summary')}>Summary</button>
          <button className={tabClass('bordereaux')} onClick={() => setTab('bordereaux')}>Bordereaux</button>
          <button className={tabClass('claims')} onClick={() => setTab('claims')}>Claims</button>
          <button className={tabClass('documents')} onClick={() => setTab('documents')}>Documents</button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-14rem)] overflow-y-auto">
          {tab === 'summary' && (
            <div className="space-y-6">
              {/* Key metrics row */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">EPI</p>
                  <p className="text-xl font-bold text-slate-800">{formatCurrency(agreement.epi)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Actual GWP</p>
                  <p className={`text-xl font-bold ${actualGwp > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{formatCurrency(actualGwp)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Utilization</p>
                  <p className={`text-xl font-bold ${utilization > 80 ? 'text-emerald-600' : utilization > 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {agreement.epi > 0 ? `${utilization.toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Our Share</p>
                  <p className="text-xl font-bold text-slate-800">{(agreement.ourShare * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  ['Status', agreement.status],
                  ['Type', agreement.agreementType.replace('_', ' ')],
                  ['Broker', agreement.brokerName || '-'],
                  ['Underwriter', agreement.underwriter || '-'],
                  ['Inception', formatDate(agreement.inceptionDate)],
                  ['Expiry', formatDate(agreement.expiryDate)],
                  ['Currency', agreement.currency],
                  ['Commission', `${agreement.commissionPercent}%`],
                  ['Territory', agreement.territoryScope || '-'],
                  ['Class', agreement.classOfBusiness || '-'],
                  ['Max Per Risk', agreement.maxLimitPerRisk ? formatCurrency(agreement.maxLimitPerRisk) : '-'],
                  ['Aggregate Limit', agreement.aggregateLimit ? formatCurrency(agreement.aggregateLimit) : '-'],
                  ['Deposit Premium', formatCurrency(agreement.depositPremium)],
                  ['Minimum Premium', formatCurrency(agreement.minimumPremium)],
                  ['Claims Authority', formatCurrency(agreement.claimsAuthorityLimit)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>

              {agreement.notes && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{agreement.notes}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'bordereaux' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-700">Bordereaux Entries</h3>
                <button onClick={() => setShowBdxForm(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
                  <Plus size={14} /> Add Bordereaux
                </button>
              </div>

              {showBdxForm && (
                <BordereauxEntryForm
                  agreementId={agreement.id}
                  onSave={() => { setShowBdxForm(false); loadBdx(); }}
                  onCancel={() => setShowBdxForm(false)}
                />
              )}

              {bdxLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="animate-spin text-blue-600" size={24} />
                </div>
              ) : bdxEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ClipboardList size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No bordereaux entries yet</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Period</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Submitted</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Type</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">GWP</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Policies</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bdxEntries.map(bdx => (
                      <tr key={bdx.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{formatDate(bdx.periodFrom)} - {formatDate(bdx.periodTo)}</td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(bdx.submissionDate)}</td>
                        <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{bdx.bordereauType}</span></td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">{formatCurrency(bdx.totalGwp)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{bdx.totalPolicies}</td>
                        <td className="px-3 py-2 text-center">{getBdxStatusBadge(bdx.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'claims' && (
            <div className="text-center py-16 text-slate-400">
              <AlertCircle size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Claims bordereaux tracking coming soon</p>
            </div>
          )}

          {tab === 'documents' && (
            <div className="text-center py-16 text-slate-400">
              <FileText size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Document management coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────────

const MGADashboard: React.FC = () => {
  const toast = useToast();

  // Data
  const [agreements, setAgreements] = useState<BindingAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, totalEpi: 0, actualGwp: 0 });
  const [bdxGwpMap, setBdxGwpMap] = useState<Record<string, number>>({});
  const [exporting, setExporting] = useState(false);

  // Pagination (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  // Search & filters
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Sticky bar height
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

  // Kebab menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  useEffect(() => {
    if (openMenuId) {
      const handler = () => setOpenMenuId(null);
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [openMenuId]);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailAgreement, setDetailAgreement] = useState<BindingAgreement | null>(null);

  // ─── Data loading ─────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allAgreements, statsResult] = await Promise.all([
        DB.getBindingAgreements(),
        DB.getBindingAgreementStats(),
      ]);
      setAgreements(allAgreements);
      setStats(statsResult);

      // Build per-agreement GWP map from bordereaux
      const gwpMap: Record<string, number> = {};
      for (const ag of allAgreements) {
        try {
          const bdxList = await DB.getBordereauxByAgreement(ag.id);
          const accepted = bdxList.filter(b => b.status === 'ACCEPTED');
          gwpMap[ag.id] = accepted.reduce((sum, b) => sum + b.totalGwp, 0);
        } catch {
          gwpMap[ag.id] = 0;
        }
      }
      setBdxGwpMap(gwpMap);
    } catch (err) {
      console.error('Failed to load MGA data:', err);
      toast.error('Failed to load agreements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Search debounce ──────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300);
  };

  // ─── Filtering & pagination ───────────────────────────
  const filteredAgreements = agreements.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (typeFilter !== 'all' && a.agreementType !== typeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !a.agreementNumber.toLowerCase().includes(q) &&
        !a.mgaName.toLowerCase().includes(q) &&
        !(a.brokerName || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalCount = filteredAgreements.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const pageAgreements = filteredAgreements.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // ─── Formatters ───────────────────────────────────────
  const formatCurrency = (amount: number, short = false) => {
    if (short) {
      if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const s: Record<string, string> = {
      'DRAFT': 'bg-slate-100 text-slate-600',
      'ACTIVE': 'bg-emerald-100 text-emerald-700',
      'EXPIRED': 'bg-amber-100 text-amber-700',
      'TERMINATED': 'bg-red-100 text-red-700',
      'CANCELLED': 'bg-slate-200 text-slate-500',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const s: Record<string, string> = {
      'BINDING_AUTHORITY': 'bg-purple-100 text-purple-700',
      'LINESLIP': 'bg-blue-100 text-blue-700',
      'TREATY': 'bg-teal-100 text-teal-700',
    };
    const labels: Record<string, string> = {
      'BINDING_AUTHORITY': 'BA',
      'LINESLIP': 'Lineslip',
      'TREATY': 'Treaty',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s[type] || 'bg-slate-100 text-slate-600'}`}>{labels[type] || type}</span>;
  };

  const getUtilizationDisplay = (agId: string, epi: number) => {
    const gwp = bdxGwpMap[agId] || 0;
    if (epi <= 0) return <span className="text-xs text-slate-400">N/A</span>;
    const pct = (gwp / epi) * 100;
    const color = pct > 80 ? 'text-emerald-600' : pct > 50 ? 'text-amber-600' : 'text-red-600';
    return <span className={`text-xs font-semibold ${color}`}>{pct.toFixed(0)}%</span>;
  };

  // ─── Export ───────────────────────────────────────────
  const handleExport = () => {
    if (filteredAgreements.length === 0) { toast.error('No agreements to export'); return; }
    setExporting(true);
    try {
      const data = filteredAgreements.map(a => ({
        'Agreement #': a.agreementNumber,
        'Type': a.agreementType.replace('_', ' '),
        'MGA': a.mgaName,
        'Broker': a.brokerName || '',
        'Class': a.classOfBusiness || '',
        'Territory': a.territoryScope || '',
        'Currency': a.currency,
        'EPI': a.epi,
        'Actual GWP': bdxGwpMap[a.id] || 0,
        'Utilization %': a.epi > 0 ? Number(((bdxGwpMap[a.id] || 0) / a.epi * 100).toFixed(1)) : 0,
        'Our Share': (a.ourShare * 100).toFixed(1) + '%',
        'Commission %': a.commissionPercent,
        'Inception': a.inceptionDate || '',
        'Expiry': a.expiryDate || '',
        'Status': a.status,
      }));
      exportToExcel(data, `MGA_Agreements_${new Date().toISOString().split('T')[0]}`, 'MGA Agreements');
      toast.success('Exported successfully');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  // ─── Delete handler ───────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this agreement? This cannot be undone.')) return;
    try {
      await DB.deleteBindingAgreement(id);
      toast.success('Agreement deleted');
      setDetailAgreement(null);
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide mb-1">
            <FileSignature size={14} />
            Total Agreements
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-wide mb-1">
            <CheckCircle size={14} />
            Active
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-500 text-xs uppercase tracking-wide mb-1">
            <TrendingUp size={14} />
            Total EPI
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalEpi, true)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-purple-500 text-xs uppercase tracking-wide mb-1">
            <DollarSign size={14} />
            Actual GWP
          </div>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.actualGwp, true)}</p>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div ref={filterRef} className="sticky top-0 z-30 bg-gray-50">
        <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[120px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search agreements..." value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          {/* Status */}
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-36 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Type */}
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">All Types</option>
            <option value="BINDING_AUTHORITY">Binding Authority</option>
            <option value="LINESLIP">Lineslip</option>
            <option value="TREATY">Treaty</option>
          </select>

          {/* Refresh */}
          <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>

          {/* Export */}
          <button onClick={handleExport} disabled={exporting || filteredAgreements.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Download size={14} />
            Export to Excel
          </button>

          {/* New Agreement */}
          <button onClick={() => { setEditingId(null); setShowFormModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm">
            <Plus size={14} />
            New Agreement
          </button>
        </div>
      </div>

      {/* Agreements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
          </div>
        ) : pageAgreements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileSignature size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No agreements found</p>
            <p className="text-sm">Try adjusting your filters or create a new agreement</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky z-20 shadow-sm" style={{ top: `${filterHeight}px` }}>
                  <tr>
                    <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Status</th>
                    <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Type</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Agreement #</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">MGA / Partner</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Broker</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide max-w-[100px]">Class</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide max-w-[100px]">Territory</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">EPI</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actual GWP</th>
                    <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Util.</th>
                    <th className="text-right px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Share</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Inception</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry</th>
                    <th className="px-1 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageAgreements.map(ag => {
                    const gwp = bdxGwpMap[ag.id] || 0;
                    return (
                      <tr key={ag.id} onClick={() => setDetailAgreement(ag)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="px-2 py-3 text-center">{getStatusBadge(ag.status)}</td>
                        <td className="px-2 py-3 text-center">{getTypeBadge(ag.agreementType)}</td>
                        <td className="px-3 py-3 font-medium text-slate-800">{ag.agreementNumber}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-700 truncate max-w-[160px]">{ag.mgaName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600 text-sm">{ag.brokerName || '-'}</td>
                        <td className="px-3 py-3 text-slate-600 text-sm max-w-[100px] truncate" title={ag.classOfBusiness || ''}>{ag.classOfBusiness || '-'}</td>
                        <td className="px-3 py-3 text-slate-600 text-sm max-w-[100px] truncate" title={ag.territoryScope || ''}>{ag.territoryScope || '-'}</td>
                        <td className="px-3 py-3 text-right text-slate-500 italic text-sm">{formatCurrency(ag.epi)}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`font-semibold ${gwp > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{gwp > 0 ? formatCurrency(gwp) : '-'}</span>
                        </td>
                        <td className="px-2 py-3 text-center">{getUtilizationDisplay(ag.id, ag.epi)}</td>
                        <td className="px-2 py-3 text-right text-sm text-slate-700 font-medium">{(ag.ourShare * 100).toFixed(0)}%</td>
                        <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {formatDate(ag.inceptionDate)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(ag.expiryDate)}</td>
                        <td className="px-1 py-2 text-center relative" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ag.id ? null : ag.id); }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg">
                            <MoreVertical size={16} className="text-gray-500" />
                          </button>
                          {openMenuId === ag.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]">
                              <button onClick={() => { setOpenMenuId(null); setDetailAgreement(ag); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Eye size={14} /> View
                              </button>
                              <button onClick={() => { setOpenMenuId(null); setEditingId(ag.id); setShowFormModal(true); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Edit size={14} /> Edit
                              </button>
                              <button onClick={() => { setOpenMenuId(null); handleDelete(ag.id); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * rowsPerPage, totalCount)}</span> of{' '}
                <span className="font-medium">{totalCount}</span> agreements
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm">
                  <ChevronLeft size={16} />
                </button>
                <span className="flex items-center px-4 text-sm font-medium bg-white border rounded-lg shadow-sm">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages || totalPages === 0}
                  className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Binding Agreement' : 'New Binding Agreement'}
        subtitle="MGA / Binding Authority"
      >
        <MGAFormContent
          id={editingId || undefined}
          onSave={() => { setShowFormModal(false); setEditingId(null); loadData(); }}
          onCancel={() => { setShowFormModal(false); setEditingId(null); }}
        />
      </FormModal>

      {/* Detail Modal */}
      {detailAgreement && (
        <DetailModal
          agreement={detailAgreement}
          actualGwp={bdxGwpMap[detailAgreement.id] || 0}
          onClose={() => setDetailAgreement(null)}
          onEdit={() => {
            setDetailAgreement(null);
            setEditingId(detailAgreement.id);
            setShowFormModal(true);
          }}
          onDelete={() => handleDelete(detailAgreement.id)}
        />
      )}
    </div>
  );
};

export default MGADashboard;
