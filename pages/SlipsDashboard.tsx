
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { ReinsuranceSlip, PolicyStatus } from '../types';
import { ExcelService } from '../services/excel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DetailModal } from '../components/DetailModal';
import { FormModal } from '../components/FormModal';
import { SlipFormContent } from '../components/SlipFormContent';
import { formatDate } from '../utils/dateUtils';
import { Search, Edit, Trash2, Plus, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, Download, FileText, CheckCircle, AlertCircle, XCircle, AlertTriangle } from 'lucide-react';

const SlipsDashboard: React.FC = () => {
  const [slips, setSlips] = useState<ReinsuranceSlip[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selection State
  const [selectedSlip, setSelectedSlip] = useState<ReinsuranceSlip | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof ReinsuranceSlip; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });

  // Modal State
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);

  const navigate = useNavigate();

  const slipStatusTabs = [
    { key: 'ALL', label: 'All' },
    { key: 'DRAFT', label: 'Draft' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'QUOTED', label: 'Quoted' },
    { key: 'SIGNED', label: 'Signed' },
    { key: 'SENT', label: 'Sent' },
    { key: 'BOUND', label: 'Bound' },
    { key: 'CLOSED', label: 'Closed' },
    { key: 'DECLINED', label: 'Declined/NTU' },
    { key: 'DELETED', label: 'Deleted' }
  ];

  const fetchData = async () => {
      setLoading(true);
      try {
        const data = await DB.getSlips();
        setSlips(data);
      } catch (e) {
         console.error("Failed to fetch slips", e);
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
    setEditingSlipId(id);
    setShowSlipModal(true);
  };

  const handleWording = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/wording/${id}`);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        setSlips(prev => prev.map(s => s.id === deleteId ? { ...s, isDeleted: true } : s));
        await DB.deleteSlip(deleteId);
      } catch (err) {
        console.error("Failed to delete slip", err);
        fetchData();
      } finally {
        setDeleteId(null);
      }
    }
  };

  const handleSort = (key: keyof ReinsuranceSlip) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredSlips = slips.filter(slip => {
    // Deleted filter - special handling
    if (statusFilter === 'DELETED') {
        return slip.isDeleted === true;
    }
    
    // For non-deleted filters, exclude deleted slips
    if (slip.isDeleted && statusFilter !== 'ALL') return false;
    
    const currentStatus = (slip.status as any) || 'DRAFT';

    // Status filter
    if (statusFilter !== 'ALL') {
        if (statusFilter === 'DECLINED') {
            // Include both DECLINED, NTU, and CANCELLED
            if (!['DECLINED', 'NTU', 'CANCELLED'].includes(currentStatus)) return false;
        } else if (statusFilter === 'BOUND') {
            // Include legacy 'Active' as BOUND
            if (currentStatus !== 'BOUND' && currentStatus !== 'Active') return false;
        } else {
            if (currentStatus !== statusFilter) return false;
        }
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (slip.slipNumber || '').toLowerCase().includes(search) ||
        (slip.insuredName || '').toLowerCase().includes(search) ||
        (slip.brokerReinsurer || '').toLowerCase().includes(search)
      );
    }

    return true;
  });

  const sortedSlips = [...filteredSlips].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleExport = async () => {
    await ExcelService.exportSlips(sortedSlips);
  };

  const formatMoney = (amount: number | undefined, currency: string | undefined) => {
    if (amount === undefined || amount === null) return '-';
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${amount}`;
    }
  };

  const getStatusBadge = (status: string, isDeleted?: boolean) => {
    if (isDeleted) {
        return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                DELETED
            </span>
        );
    }
    
    // Normalize legacy status
    if (status === 'Active') status = 'BOUND';
    
    const styles: Record<string, string> = {
        'DRAFT': 'bg-gray-100 text-gray-800 border border-gray-200',
        'PENDING': 'bg-blue-100 text-blue-800 border border-blue-200',
        'QUOTED': 'bg-purple-100 text-purple-800 border border-purple-200',
        'SIGNED': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
        'SENT': 'bg-cyan-100 text-cyan-800 border border-cyan-200',
        'BOUND': 'bg-green-100 text-green-800 border border-green-200',
        'CLOSED': 'bg-gray-100 text-gray-600 border border-gray-300',
        'DECLINED': 'bg-red-100 text-red-800 border border-red-200',
        'NTU': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        'CANCELLED': 'bg-red-100 text-red-800 border border-red-200',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status || 'DRAFT'}
        </span>
    );
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof ReinsuranceSlip }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors group select-none"
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-2">
          {label}
          <div className="text-gray-400 group-hover:text-gray-600">
             {isActive ? (sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>) : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50"/>}
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sticky header block: filters */}
      <div className="sticky top-0 z-30 bg-gray-50 pb-0">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs - Compact */}
          <div className="flex bg-gray-100 p-0.5 rounded-md overflow-x-auto">
            {slipStatusTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-300" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-px h-5 bg-gray-300" />

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-sm"
          >
            <Download size={14} /> Export to Excel
          </button>

          {/* New Slip Button */}
          <button
            type="button"
            onClick={() => { setEditingSlipId(null); setShowSlipModal(true); }}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
          >
            <Plus size={16} /> New Slip
          </button>
        </div>
      </div>
      </div>{/* end sticky header block */}

      {/* Slips Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 sticky top-[52px] z-20 shadow-sm">
                <tr>
                    <th className="px-6 py-4 w-12">#</th>
                    <th className="px-6 py-4 w-24">Status</th>
                    <SortableHeader label="Slip Number" sortKey="slipNumber" />
                    <SortableHeader label="Date" sortKey="date" />
                    <SortableHeader label="Insured" sortKey="insuredName" />
                    <SortableHeader label="Limit of Liab" sortKey="limitOfLiability" />
                    <SortableHeader label="Broker / Reinsurer" sortKey="brokerReinsurer" />
                    <th className="px-6 py-4 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {sortedSlips.map((slip, index) => (
                    <tr 
                      key={slip.id} 
                      onClick={() => setSelectedSlip(slip)}
                      className={`transition-colors cursor-pointer ${slip.isDeleted ? 'bg-gray-100 opacity-60 grayscale cursor-not-allowed' : 'hover:bg-amber-50/30'}`}
                    >
                        <td className="px-6 py-4 text-gray-400">{index + 1}</td>
                        <td className="px-6 py-4">
                            {getStatusBadge((slip.status as any) || 'DRAFT', slip.isDeleted)}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-amber-700">
                            {slip.slipNumber}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(slip.date)}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{slip.insuredName}</td>
                        <td className="px-6 py-4 text-gray-700 font-mono">
                            {formatMoney(slip.limitOfLiability, slip.currency as string)}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{slip.brokerReinsurer}</td>
                        <td className="px-6 py-4 text-center">
                             <div className="flex justify-center items-center gap-2">
                                <button type="button" title="Print Slip Note" onClick={(e) => handleWording(e, slip.id)} className="p-1.5 rounded hover:bg-amber-100 text-amber-600 hover:text-amber-800 transition-colors cursor-pointer">
                                  <FileText size={16} />
                                </button>
                                <button type="button" title="Edit" onClick={(e) => handleEdit(e, slip.id)} className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
                                  <Edit size={16} />
                                </button>
                                {!slip.isDeleted && <button type="button" title="Delete" onClick={(e) => initiateDelete(e, slip.id)} className="p-1.5 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors cursor-pointer">
                                  <Trash2 size={16} />
                                </button>}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        </div>

        {!loading && filteredSlips.length === 0 && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <FileSpreadsheet size={48} className="mb-4 opacity-20" />
                <p>No slips found matching your search.</p>
            </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!deleteId}
        title="Delete Slip?"
        message="Are you sure you want to delete this reinsurance slip record? It will be marked as deleted."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

       {/* Detail Modal */}
       {selectedSlip && (
          <DetailModal
            item={selectedSlip}
            onClose={() => setSelectedSlip(null)}
            title="Slip Details"
          />
      )}

      {/* Slip Form Modal */}
      <FormModal
        isOpen={showSlipModal}
        onClose={() => { setShowSlipModal(false); setEditingSlipId(null); }}
        title={editingSlipId ? 'Edit Reinsurance Slip' : 'New Reinsurance Slip'}
        subtitle={editingSlipId ? 'Editing slip details' : 'Create a new outward reinsurance slip'}
      >
        <SlipFormContent
          id={editingSlipId || undefined}
          onSave={() => { setShowSlipModal(false); setEditingSlipId(null); fetchData(); }}
          onCancel={() => { setShowSlipModal(false); setEditingSlipId(null); }}
        />
      </FormModal>
    </div>
  );
};

export default SlipsDashboard;
