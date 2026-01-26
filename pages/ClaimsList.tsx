
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Claim, ClaimStatus } from '../types';
import { ClaimsService } from '../services/claimsService';
import { formatDate } from '../utils/dateUtils';
import { AlertOctagon, Search, Plus, Filter, ArrowRight } from 'lucide-react';

const ClaimsList: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
        const data = await ClaimsService.getAllClaims();
        setClaims(data);
        setLoading(false);
    };
    loadData();
  }, []);

  const filtered = claims.filter(c => 
    c.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c as any).policyNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.claimantName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Claims Center</h2>
          <p className="text-gray-500 text-sm">Manage notifications, active claims, and transaction ledgers.</p>
        </div>
        <button 
          onClick={() => alert("To create a claim, please go to the specific Policy and click 'Register Claim' (Coming Soon)")}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm"
        >
          <Plus size={18} /> Register Claim
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b bg-gray-50 flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Search by Claim No, Policy Ref, or Claimant..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Filter size={16}/> Filter
                </button>
            </div>
        </div>

        {/* Table */}
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                <tr>
                    <th className="px-6 py-4">Claim Ref</th>
                    <th className="px-6 py-4">Policy Ref</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Date of Loss</th>
                    <th className="px-6 py-4">Insured / Claimant</th>
                    <th className="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filtered.map(claim => (
                    <tr 
                        key={claim.id} 
                        onClick={() => navigate(`/claims/${claim.id}`)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors group"
                    >
                        <td className="px-6 py-4 font-bold text-gray-900">{claim.claimNumber}</td>
                        <td className="px-6 py-4 font-mono text-blue-600">{(claim as any).policyNumber}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                claim.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                                claim.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' :
                                'bg-red-100 text-red-800'
                            }`}>
                                {claim.status}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                claim.liabilityType === 'ACTIVE' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                'bg-gray-50 border-gray-200 text-gray-600'
                             }`}>
                                {claim.liabilityType}
                             </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(claim.lossDate)}</td>
                        <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{(claim as any).insuredName}</div>
                            <div className="text-xs text-gray-500">{claim.claimantName}</div>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-400 group-hover:text-blue-500">
                            <ArrowRight size={18} />
                        </td>
                    </tr>
                ))}
                {filtered.length === 0 && !loading && (
                    <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                            <AlertOctagon size={48} className="mx-auto mb-4 opacity-20"/>
                            No claims found.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClaimsList;
