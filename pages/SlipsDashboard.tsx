
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { ReinsuranceSlip, PolicyStatus } from '../types';
import { ExcelService } from '../services/excel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DetailModal } from '../components/DetailModal';
import { Search, Edit, Trash2, Plus, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, Download, FileText, CheckCircle, AlertCircle, XCircle, AlertTriangle } from 'lucide-react';

const SlipsDashboard: React.FC = () => {
  const [slips, setSlips] = useState<ReinsuranceSlip[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Cancelled' | 'Deleted'>('All');

  // Selection State
  const [selectedSlip, setSelectedSlip] = useState<ReinsuranceSlip | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof ReinsuranceSlip; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'asc'
  });

  const navigate = useNavigate();

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
    navigate(`/slips/edit/${id}`);
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

  const filteredSlips = slips.filter(s => {
    // 1. Status Filter
    if (statusFilter === 'Deleted') {
        if (!s.isDeleted) return false;
    } else {
        if (s.isDeleted) return false;
        
        // Default undefined status to ACTIVE for backward compatibility
        const status = s.status || PolicyStatus.ACTIVE;

        if (statusFilter === 'Active' && status !== PolicyStatus.ACTIVE) return false;
        if (statusFilter === 'Pending' && status !== PolicyStatus.PENDING) return false;
        if (statusFilter === 'Cancelled' && (status !== PolicyStatus.CANCELLED && status !== PolicyStatus.NTU)) return false;
    }

    // 2. Search Filter
    return (
      s.slipNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.insuredName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.brokerReinsurer.toLowerCase().includes(searchTerm.toLowerCase())
    );
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

  // Status Indicator Component (Duplicated from Dashboard for simplicity)
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
        default:
            return <span className="text-[10px] text-gray-500">{status}</span>
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reinsurance Slips Registry</h2>
          <p className="text-gray-500">Track outward reinsurance slips and assigned numbers.</p>
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
            onClick={() => navigate('/slips/new')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
            <Plus size={20} /> New Slip
            </button>
        </div>
      </div>

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
              placeholder="Search slip no, insured, or broker..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
      </div>

      {/* Slips Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                    <th className="px-6 py-4 w-12">#</th>
                    <th className="px-6 py-4 w-24">Status</th>
                    <SortableHeader label="Slip Number" sortKey="slipNumber" />
                    <SortableHeader label="Date" sortKey="date" />
                    <SortableHeader label="Insured" sortKey="insuredName" />
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
                            <StatusBadge status={slip.status || PolicyStatus.ACTIVE} isDeleted={slip.isDeleted} />
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-amber-700">
                            {slip.slipNumber}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(slip.date)}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{slip.insuredName}</td>
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
    </div>
  );
};

export default SlipsDashboard;
