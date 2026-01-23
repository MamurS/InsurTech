
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { ReinsuranceSlip } from '../types';
import { ExcelService } from '../services/excel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DetailModal } from '../components/DetailModal';
import { Search, Edit, Trash2, Plus, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, Download, FileText } from 'lucide-react';

const SlipsDashboard: React.FC = () => {
  const [slips, setSlips] = useState<ReinsuranceSlip[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
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

  const filteredSlips = slips.filter(s => 
    s.slipNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.insuredName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.brokerReinsurer.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Search slip no, insured, or broker..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-all text-gray-900"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Slips Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                    <th className="px-6 py-4 w-12">#</th>
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
                        <td className="px-6 py-4 font-mono font-medium text-amber-700">
                            {slip.slipNumber}
                            {slip.isDeleted && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200"><Trash2 size={10}/> DELETED</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{slip.date}</td>
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
