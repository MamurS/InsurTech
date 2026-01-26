
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClaimFilters, ClaimLiabilityType, ClaimStatus } from '../types';
import { useClaimsList } from '../hooks/useClaims';
import { formatDate } from '../utils/dateUtils';
import { AlertOctagon, Search, Plus, Filter, ArrowRight, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

const ClaimsList: React.FC = () => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter State
  const [filters, setFilters] = useState<ClaimFilters>({
      liabilityType: 'ALL',
      status: 'ALL',
      searchTerm: '',
      page: 1,
      pageSize: 25
  });

  const { data, isLoading, isError, refetch } = useClaimsList(filters);
  const claims = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / filters.pageSize);

  const handleFilterChange = (key: keyof ClaimFilters, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 on filter change
  };

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setFilters(prev => ({ ...prev, page: newPage }));
      }
  };

  // Format Currency Helper
  const formatMoney = (val: number | undefined) => {
      if (val === undefined || val === null) return '-';
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate Summary from current page
  const summaryIncurred = claims.reduce((acc, c) => acc + (c.totalIncurredOurShare || 0), 0);
  const summaryPaid = claims.reduce((acc, c) => acc + (c.totalPaidOurShare || 0), 0);
  const summaryOutstanding = claims.reduce((acc, c) => acc + (c.outstandingOurShare || 0), 0);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Claims Center</h2>
          <p className="text-gray-500 text-sm">Manage notifications, active claims, and transaction ledgers.</p>
        </div>
        <button 
          onClick={() => alert("To create a claim, please go to the specific Policy and click 'Register Claim'")}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm"
        >
          <Plus size={18} /> Register Claim
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Search by Claim No, Policy Ref, or Claimant..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={filters.searchTerm}
                    onChange={e => handleFilterChange('searchTerm', e.target.value)}
                />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Filter size={16}/> Filters
                </button>
                <button onClick={() => refetch()} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                    <RefreshCw size={16}/>
                </button>
            </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
            <div className="p-4 bg-blue-50/50 border-b border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                    <select 
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="OPEN">Open</option>
                        <option value="CLOSED">Closed</option>
                        <option value="REOPENED">Reopened</option>
                        <option value="DENIED">Denied</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Liability Type</label>
                    <select 
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                        value={filters.liabilityType}
                        onChange={(e) => handleFilterChange('liabilityType', e.target.value)}
                    >
                        <option value="ALL">All Types</option>
                        <option value="ACTIVE">Active Liability</option>
                        <option value="INFORMATIONAL">Informational</option>
                    </select>
                </div>
            </div>
        )}

        {/* Loading State */}
        {isLoading && (
            <div className="py-20 text-center flex flex-col items-center justify-center text-gray-500">
                <Loader2 size={32} className="animate-spin mb-3 text-blue-600"/>
                Loading claims...
            </div>
        )}

        {/* Error State */}
        {isError && (
            <div className="py-12 text-center flex flex-col items-center justify-center text-red-500">
                <AlertOctagon size={32} className="mb-3"/>
                <p className="font-medium">Failed to load claims.</p>
                <button onClick={() => refetch()} className="mt-3 text-blue-600 hover:underline text-sm">Try Again</button>
            </div>
        )}

        {/* Table */}
        {!isLoading && !isError && (
            <>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                            <tr>
                                <th className="px-6 py-4">Claim Ref</th>
                                <th className="px-6 py-4">Policy Ref</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Loss Date</th>
                                <th className="px-6 py-4">Insured / Claimant</th>
                                <th className="px-6 py-4 text-right bg-gray-50">Incurred (100%)</th>
                                <th className="px-6 py-4 text-right bg-blue-50/50">Incurred (Our Share)</th>
                                <th className="px-6 py-4 text-right bg-green-50/50">Paid (Our Share)</th>
                                <th className="px-6 py-4 text-right bg-red-50/50">Outstanding</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {claims.map(claim => (
                                <tr 
                                    key={claim.id} 
                                    onClick={() => navigate(`/claims/${claim.id}`)}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                                >
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        {claim.claimNumber}
                                        {claim.liabilityType === 'INFORMATIONAL' && (
                                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-600 border border-gray-300">INFO</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-blue-600 text-xs">{claim.policyNumber}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            claim.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                                            claim.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {claim.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-xs">{formatDate(claim.lossDate)}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 truncate max-w-[150px]" title={claim.insuredName}>{claim.insuredName}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{claim.claimantName}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-600 bg-gray-50/30">
                                        {formatMoney(claim.totalIncurred100)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 bg-blue-50/20">
                                        {formatMoney(claim.totalIncurredOurShare)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-green-700 bg-green-50/20">
                                        {formatMoney(claim.totalPaidOurShare)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-red-700 bg-red-50/20">
                                        {formatMoney(claim.outstandingOurShare)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-400 group-hover:text-blue-500">
                                        <ArrowRight size={18} />
                                    </td>
                                </tr>
                            ))}
                            {claims.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-gray-400">
                                        <AlertOctagon size={48} className="mx-auto mb-4 opacity-20"/>
                                        No claims found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        
                        {/* Summary Row */}
                        {claims.length > 0 && (
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-800 text-xs shadow-inner">
                                <tr>
                                    <td colSpan={5} className="px-6 py-3 text-right uppercase tracking-wider">Page Summary:</td>
                                    <td className="px-6 py-3 text-right">-</td>
                                    <td className="px-6 py-3 text-right font-mono">{formatMoney(summaryIncurred)}</td>
                                    <td className="px-6 py-3 text-right font-mono text-green-800">{formatMoney(summaryPaid)}</td>
                                    <td className="px-6 py-3 text-right font-mono text-red-800">{formatMoney(summaryOutstanding)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Showing <span className="font-medium">{(filters.page - 1) * filters.pageSize + 1}</span> to <span className="font-medium">{Math.min(filters.page * filters.pageSize, totalCount)}</span> of <span className="font-medium">{totalCount}</span> claims
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handlePageChange(filters.page - 1)}
                            disabled={filters.page === 1}
                            className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
                        >
                            <ChevronLeft size={16}/>
                        </button>
                        <span className="flex items-center px-4 text-sm font-medium bg-white border rounded-lg shadow-sm">
                            Page {filters.page} of {totalPages || 1}
                        </span>
                        <button 
                            onClick={() => handlePageChange(filters.page + 1)}
                            disabled={filters.page === totalPages || totalPages === 0}
                            className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
                        >
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ClaimsList;
