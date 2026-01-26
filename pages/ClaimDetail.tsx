
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Claim, ClaimTransactionType } from '../types';
import { ClaimsService } from '../services/claimsService';
import { formatDate } from '../utils/dateUtils';
import { ArrowLeft, Building2, Calendar, FileText, Plus, DollarSign, Wallet } from 'lucide-react';

const ClaimDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  // Transaction Form State
  const [showTransModal, setShowTransModal] = useState(false);
  const [newTrans, setNewTrans] = useState({
      type: 'RESERVE_SET' as ClaimTransactionType,
      amount: 0,
      share: 100, // Default to 100% or pull from policy
      notes: ''
  });

  const loadData = async () => {
    if (!id) return;
    const data = await ClaimsService.getClaimById(id);
    if (data) {
        setClaim(data);
        // Default share to policy share if available, else 100
        // We assume policy data is joined. 
        // Note: Real implementation might need to fetch policy separately to get 'ourShare'
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddTransaction = async () => {
      if (!claim || !id) return;
      try {
          await ClaimsService.addTransaction({
              claimId: id,
              transactionType: newTrans.type,
              amount100pct: newTrans.amount,
              ourSharePercentage: newTrans.share,
              currency: (claim as any).policyContext?.currency || 'USD',
              notes: newTrans.notes,
              transactionDate: new Date().toISOString()
          });
          setShowTransModal(false);
          loadData(); // Refresh
      } catch (e: any) {
          alert("Error adding transaction: " + e.message);
      }
  };

  if (loading) return <div>Loading Claim...</div>;
  if (!claim) return <div>Claim not found</div>;

  const policy = (claim as any).policyContext || {};
  
  // Calculate Totals for Display
  const totalReserve = claim.transactions?.filter(t => t.transactionType === 'RESERVE_SET').reduce((acc, t) => acc + t.amount100pct, 0) || 0;
  const totalPaid = claim.transactions?.filter(t => t.transactionType === 'PAYMENT').reduce((acc, t) => acc + t.amount100pct, 0) || 0;
  const outstanding = totalReserve - totalPaid;

  return (
    <div className="space-y-6 pb-20">
       {/* Header */}
       <div className="flex items-center gap-4">
           <button onClick={() => navigate('/claims')} className="p-2 bg-white border rounded-lg hover:bg-gray-50"><ArrowLeft size={20}/></button>
           <div>
               <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                   {claim.claimNumber}
                   <span className={`px-2 py-1 text-sm rounded-full ${claim.liabilityType === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>{claim.liabilityType}</span>
               </h2>
               <p className="text-gray-500">Policy: <span className="font-mono font-bold text-blue-600">{policy.policyNumber}</span> • {policy.insuredName}</p>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Left: Metadata */}
           <div className="md:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText size={18}/> Claim Details</h3>
                    <div className="space-y-3 text-sm">
                        <div><div className="text-xs text-gray-500 uppercase">Status</div><div className="font-medium">{claim.status}</div></div>
                        <div><div className="text-xs text-gray-500 uppercase">Loss Date</div><div className="font-medium">{formatDate(claim.lossDate)}</div></div>
                        <div><div className="text-xs text-gray-500 uppercase">Report Date</div><div className="font-medium">{formatDate(claim.reportDate)}</div></div>
                        <div><div className="text-xs text-gray-500 uppercase">Description</div><div className="font-medium">{claim.description}</div></div>
                        <div><div className="text-xs text-gray-500 uppercase">Claimant</div><div className="font-medium">{claim.claimantName || '-'}</div></div>
                    </div>
                </div>

                {claim.liabilityType === 'INFORMATIONAL' && (
                    <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 text-amber-900">
                        <h3 className="font-bold mb-2">Informational Only</h3>
                        <p className="text-sm mb-2">This claim is tracked for record-keeping (Type 1). Financials are imported in bulk.</p>
                        <div className="font-mono text-xl font-bold">{claim.importedTotalIncurred?.toLocaleString()} {policy.currency}</div>
                        <div className="text-xs opacity-75">Imported Incurred</div>
                    </div>
                )}
           </div>

           {/* Right: Ledger */}
           <div className="md:col-span-2">
               <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                   <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                       <h3 className="font-bold text-gray-800 flex items-center gap-2"><Wallet size={18}/> Financial Ledger</h3>
                       {claim.liabilityType === 'ACTIVE' && (
                           <button 
                             onClick={() => setShowTransModal(true)}
                             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm"
                           >
                               <Plus size={16}/> Add Transaction
                           </button>
                       )}
                   </div>

                   {claim.liabilityType === 'ACTIVE' && (
                       <div className="grid grid-cols-3 bg-blue-50 border-b border-blue-100 p-4 text-center">
                           <div>
                               <div className="text-xs text-blue-600 uppercase font-bold">Total Incurred</div>
                               <div className="text-xl font-bold text-blue-900">{totalReserve.toLocaleString()} {policy.currency}</div>
                           </div>
                           <div>
                               <div className="text-xs text-green-600 uppercase font-bold">Paid to Date</div>
                               <div className="text-xl font-bold text-green-900">{totalPaid.toLocaleString()} {policy.currency}</div>
                           </div>
                           <div>
                               <div className="text-xs text-gray-600 uppercase font-bold">Outstanding Reserve</div>
                               <div className="text-xl font-bold text-gray-900">{outstanding.toLocaleString()} {policy.currency}</div>
                           </div>
                       </div>
                   )}

                   <table className="w-full text-left text-sm">
                       <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                           <tr>
                               <th className="px-6 py-3">Date</th>
                               <th className="px-6 py-3">Type</th>
                               <th className="px-6 py-3 text-right">Amount (100%)</th>
                               <th className="px-6 py-3 text-right">Our Share</th>
                               <th className="px-6 py-3">Notes</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {claim.transactions?.map(t => (
                               <tr key={t.id} className="hover:bg-gray-50">
                                   <td className="px-6 py-3 text-gray-500">{formatDate(t.transactionDate)}</td>
                                   <td className="px-6 py-3">
                                       <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                           t.transactionType === 'PAYMENT' ? 'bg-green-100 text-green-800' :
                                           t.transactionType === 'RESERVE_SET' ? 'bg-blue-100 text-blue-800' :
                                           'bg-gray-100 text-gray-800'
                                       }`}>
                                           {t.transactionType}
                                       </span>
                                   </td>
                                   <td className="px-6 py-3 text-right font-mono">{t.amount100pct.toLocaleString()}</td>
                                   <td className="px-6 py-3 text-right font-mono text-gray-600">{t.amountOurShare?.toLocaleString()}</td>
                                   <td className="px-6 py-3 text-gray-500 italic truncate max-w-[200px]">{t.notes}</td>
                               </tr>
                           ))}
                           {(!claim.transactions || claim.transactions.length === 0) && (
                               <tr>
                                   <td colSpan={5} className="py-8 text-center text-gray-400 italic">No transactions recorded.</td>
                               </tr>
                           )}
                       </tbody>
                   </table>
               </div>
           </div>
       </div>

       {/* Add Transaction Modal */}
       {showTransModal && (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                   <h3 className="font-bold text-lg mb-4">Add Financial Transaction</h3>
                   <div className="space-y-4">
                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                           <select 
                                className="w-full p-2 border rounded"
                                value={newTrans.type}
                                onChange={e => setNewTrans({...newTrans, type: e.target.value as any})}
                           >
                               <option value="RESERVE_SET">Reserve / Incurred Adjustment</option>
                               <option value="PAYMENT">Indemnity Payment</option>
                               <option value="LEGAL_FEE">Legal Fee Payment</option>
                               <option value="ADJUSTER_FEE">Adjuster Fee Payment</option>
                           </select>
                       </div>
                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Amount (100% Gross)</label>
                           <input 
                                type="number" 
                                className="w-full p-2 border rounded font-mono"
                                value={newTrans.amount}
                                onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})}
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Our Share %</label>
                           <input 
                                type="number" 
                                className="w-full p-2 border rounded"
                                value={newTrans.share}
                                onChange={e => setNewTrans({...newTrans, share: Number(e.target.value)})}
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                           <textarea 
                                className="w-full p-2 border rounded"
                                value={newTrans.notes}
                                onChange={e => setNewTrans({...newTrans, notes: e.target.value})}
                           />
                       </div>
                       <div className="flex justify-end gap-2 pt-4">
                           <button onClick={() => setShowTransModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                           <button onClick={handleAddTransaction} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Save</button>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default ClaimDetail;
