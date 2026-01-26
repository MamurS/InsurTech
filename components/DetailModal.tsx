
import React, { useState } from 'react';
import { Policy, ReinsuranceSlip, Clause, PolicyStatus, TerminationDetails } from '../types';
import { DB } from '../services/db';
import { 
  X, Building2, Calendar, DollarSign, ArrowRightLeft, 
  FileSpreadsheet, Code, CheckCircle, ShieldAlert, FileText, Download, Upload, AlertCircle, Trash2, XCircle, AlertTriangle, Briefcase, Info,
  Globe, CreditCard, ShieldCheck
} from 'lucide-react';

interface DetailModalProps {
  item: Policy | ReinsuranceSlip | Clause | null;
  onClose: () => void;
  onRefresh?: () => void; // Callback to refresh parent data
  title?: string;
  allowJsonView?: boolean;
}

export const DetailModal: React.FC<DetailModalProps> = ({ item, onClose, onRefresh, title, allowJsonView = false }) => {
  const [viewMode, setViewMode] = useState<'details' | 'json'>('details');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modal States
  const [showTerminationConfirm, setShowTerminationConfirm] = useState(false);
  const [showNTUConfirm, setShowNTUConfirm] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);

  const [terminationData, setTerminationData] = useState<TerminationDetails>({
      terminationDate: new Date().toISOString().split('T')[0],
      initiator: 'Us',
      reason: ''
  });

  if (!item) return null;

  const formatMoney = (amount: number | undefined, currency: string = 'USD') => {
    if (amount === undefined || amount === null) return '-';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  };

  const formatDate = (dateStr: string | undefined) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
  };

  const handleStatusChange = async (newStatus: PolicyStatus, policy: Policy, additionalData?: any) => {
    setIsProcessing(true);
    try {
        const updatedPolicy = { ...policy, status: newStatus };
        if (newStatus === PolicyStatus.EARLY_TERMINATION && additionalData) {
            updatedPolicy.terminationDetails = additionalData;
        }
        if (uploadFile) {
            updatedPolicy.signedDocument = {
                fileName: uploadFile.name,
                uploadDate: new Date().toISOString(),
                url: '#'
            };
            if (newStatus === PolicyStatus.ACTIVE) {
                updatedPolicy.activationDate = new Date().toISOString();
            }
        } else if (newStatus === PolicyStatus.ACTIVE) {
            updatedPolicy.activationDate = new Date().toISOString();
        }

        await DB.savePolicy(updatedPolicy);
        if (onRefresh) onRefresh();
        onClose();
    } catch (e) {
        console.error("Error updating status:", e);
        alert("Error updating status");
    } finally {
        setIsProcessing(false);
    }
  };

  const renderTerminationModal = () => (
      <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
              <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-full text-orange-600"><AlertTriangle size={20}/></div>
                  <h3 className="font-bold text-gray-800">Early Policy Termination</h3>
              </div>
              <div className="p-6 space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Termination Date</label>
                      <input type="date" value={terminationData.terminationDate} onChange={(e) => setTerminationData({...terminationData, terminationDate: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm text-gray-900"/>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initiated By</label>
                      <select value={terminationData.initiator} onChange={(e) => setTerminationData({...terminationData, initiator: e.target.value as any})} className="w-full p-2 bg-white border rounded-lg text-sm text-gray-900">
                          <option value="Us">Us (Insurer)</option>
                          <option value="Broker">Broker</option>
                          <option value="Cedant">Cedant / Client</option>
                          <option value="Other">Other</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason for Termination</label>
                      <textarea rows={3} value={terminationData.reason} onChange={(e) => setTerminationData({...terminationData, reason: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm resize-none text-gray-900"/>
                  </div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                  <button onClick={() => setShowTerminationConfirm(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
                  <button onClick={() => handleStatusChange(PolicyStatus.EARLY_TERMINATION, item as Policy, terminationData)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-sm shadow-sm">Terminate Policy</button>
              </div>
          </div>
      </div>
  );

  const renderNTUModal = () => (
      <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 p-4 border-b flex items-center gap-3">
                <div className="bg-gray-200 p-2 rounded-full text-gray-600"><XCircle size={20}/></div>
                <h3 className="font-bold text-gray-800">Confirm "Not Taken Up"</h3>
            </div>
            <div className="p-6">
                <p className="text-gray-600 text-sm">This means the deal was cancelled by the client/broker before inception.</p>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setShowNTUConfirm(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg text-sm">Go Back</button>
                <button type="button" onClick={() => { setShowNTUConfirm(false); handleStatusChange(PolicyStatus.NTU, item as Policy); }} disabled={isProcessing} className="px-4 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-800 text-sm shadow-sm">Confirm NTU</button>
            </div>
        </div>
    </div>
  );

  const renderActivateModal = () => (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
            <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle size={20}/></div>
                <h3 className="font-bold text-gray-800">Bind & Activate Policy</h3>
            </div>
            <div className="p-6">
                {!uploadFile && !(item as Policy)?.signedDocument ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <p className="text-amber-800 text-sm font-medium flex items-center gap-2"><AlertCircle size={16} /> No signed document uploaded</p>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-green-800 text-sm font-medium flex items-center gap-2"><CheckCircle size={16} /> {uploadFile ? `Document ready: ${uploadFile.name}` : 'Signed document on file'}</p>
                    </div>
                )}
                <p className="text-gray-600 text-sm">This will bind the risk and mark the policy as <strong>Active</strong>.</p>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setShowActivateConfirm(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg text-sm">Go Back</button>
                <button type="button" onClick={() => { setShowActivateConfirm(false); handleStatusChange(PolicyStatus.ACTIVE, item as Policy); }} disabled={isProcessing} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm shadow-sm flex items-center gap-2">Activate Policy</button>
            </div>
        </div>
    </div>
  );

  const renderPolicyDetail = (policy: Policy) => {
    return (
    <div className="space-y-6 relative">
        {/* Header Badge */}
        <div className="flex flex-wrap items-center gap-3 mb-4 justify-between">
            <div className="flex gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${policy.channel === 'Direct' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{policy.channel} Insurance</span>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">{policy.status}</span>
                {policy.isDeleted && <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">DELETED</span>}
            </div>
        </div>

        {/* WORKFLOW ACTIONS */}
        {policy.status === PolicyStatus.PENDING && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6 shadow-sm">
                <h4 className="font-bold text-orange-900 flex items-center gap-2 mb-3"><AlertCircle size={18} /> Underwriting Workflow</h4>
                <div className="bg-white p-4 rounded-lg border border-orange-100 mb-4 flex items-center gap-3">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Upload size={16} /> {uploadFile ? uploadFile.name : "Choose PDF..."}<input type="file" accept=".pdf" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} /></label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setShowNTUConfirm(true)} className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-red-50 text-sm">Mark as NTU</button>
                    <button onClick={() => setShowActivateConfirm(true)} className="w-full py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm">Bind & Activate</button>
                </div>
            </div>
        )}

        {/* EARLY TERMINATION BUTTON */}
        {policy.status === PolicyStatus.ACTIVE && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex justify-between items-center relative z-20">
                <div className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle className="text-green-600" size={18} /><span className="font-bold text-gray-800">Policy is Active.</span></div>
                <button onClick={() => setShowTerminationConfirm(true)} className="px-4 py-2 bg-white border border-orange-200 text-orange-600 font-bold rounded-lg hover:bg-orange-50 text-sm flex items-center gap-2"><XCircle size={16} /> Early Termination</button>
            </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Building2 size={16}/> Core Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><div className="text-gray-500">Insured Name</div><div className="font-medium text-gray-900">{policy.insuredName}</div></div>
                    <div><div className="text-gray-500">Ref / Policy No</div><div className="font-medium text-gray-900 font-mono">{policy.policyNumber}</div></div>
                    {policy.secondaryPolicyNumber && <div><div className="text-gray-500">Secondary Ref</div><div className="font-medium text-gray-900">{policy.secondaryPolicyNumber}</div></div>}
                    {policy.agreementNumber && <div><div className="text-gray-500">Agreement No</div><div className="font-medium text-gray-900">{policy.agreementNumber}</div></div>}
                    
                    {policy.channel === 'Inward' && <div className="col-span-2 bg-purple-50 p-2 rounded border border-purple-100"><div className="text-purple-800 text-xs uppercase font-bold">Cedant</div><div className="font-medium text-purple-900">{policy.cedantName || '-'}</div></div>}
                    <div className="col-span-2 bg-gray-50 p-2 rounded border border-gray-200"><div className="text-gray-500 text-xs uppercase">Intermediary ({policy.intermediaryType})</div><div className="font-medium text-gray-900">{policy.intermediaryName || 'Direct'}</div></div>

                    {policy.borrower && <div><div className="text-gray-500">Borrower</div><div className="font-medium text-gray-900">{policy.borrower}</div></div>}
                    {policy.insuredAddress && <div className="col-span-2"><div className="text-gray-500">Insured Address</div><div className="font-medium text-gray-900 truncate">{policy.insuredAddress}</div></div>}

                     <div><div className="text-gray-500">Industry</div><div className="font-medium text-gray-900">{policy.industry || '-'}</div></div>
                     <div><div className="text-gray-500">Territory</div><div className="font-medium text-gray-900">{policy.territory}</div></div>
                     <div><div className="text-gray-500">Class</div><div className="font-medium text-gray-900">{policy.classOfInsurance}</div></div>
                     <div><div className="text-gray-500">Risk Code</div><div className="font-medium text-gray-900">{policy.riskCode || '-'}</div></div>
                </div>
            </div>

            <div className="space-y-4">
                 <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Calendar size={16}/> Dates & Terms</h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><div className="text-gray-500">Inception</div><div className="font-medium text-gray-900">{formatDate(policy.inceptionDate)}</div></div>
                    <div><div className="text-gray-500">Expiry</div><div className="font-medium text-gray-900">{formatDate(policy.expiryDate)}</div></div>
                    
                    {policy.dateOfSlip && <div><div className="text-gray-500">Date of Slip</div><div className="font-medium text-gray-900">{formatDate(policy.dateOfSlip)}</div></div>}
                    {policy.accountingDate && <div><div className="text-gray-500">Accounting Date</div><div className="font-medium text-gray-900">{formatDate(policy.accountingDate)}</div></div>}
                    
                    <div className="col-span-2"><div className="text-gray-500">Deductible</div><div className="font-medium text-gray-900 bg-gray-50 p-2 rounded text-xs">{policy.deductible || 'N/A'}</div></div>
                 </div>
            </div>
        </div>

        {/* Financials */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
             <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign size={16}/> Financials ({policy.currency})</h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                 <div><div className="text-gray-500">Sum Insured</div><div className="font-bold text-lg text-gray-900">{formatMoney(policy.sumInsured, policy.currency)}</div></div>
                 <div><div className="text-gray-500">Gross Premium</div><div className="font-bold text-lg text-green-700">{formatMoney(policy.grossPremium, policy.currency)}</div></div>
                 <div><div className="text-gray-500">Sum Insured (Nat)</div><div className="font-mono font-medium">{formatMoney(policy.sumInsuredNational, 'UZS')}</div></div>
                 <div><div className="text-gray-500">Exchange Rate</div><div className="font-mono font-medium">{policy.exchangeRate}</div></div>
                 
                 <div><div className="text-gray-500">Limit (FC)</div><div className="font-medium">{formatMoney(policy.limitForeignCurrency, policy.currency)}</div></div>
                 <div><div className="text-gray-500">Limit (Nat)</div><div className="font-medium">{formatMoney(policy.limitNationalCurrency, 'UZS')}</div></div>
                 
                 <div><div className="text-gray-500">Premium Rate</div><div className="font-medium">{policy.premiumRate}%</div></div>
                 <div><div className="text-gray-500">Commission %</div><div className="font-medium">{policy.commissionPercent}%</div></div>
                 <div><div className="text-gray-500">Tax %</div><div className="font-medium">{policy.taxPercent || 0}%</div></div>
                 <div><div className="text-gray-500">Net Premium</div><div className="font-bold text-blue-700">{formatMoney(policy.netPremium, policy.currency)}</div></div>
             </div>
        </div>

        {/* Payment Schedule (Installments) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CreditCard size={16}/> Payment Schedule</h4>
            {policy.installments && policy.installments.length > 0 ? (
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Due Date</th>
                                <th className="px-4 py-2 text-right">Amount Due</th>
                                <th className="px-4 py-2">Paid Date</th>
                                <th className="px-4 py-2 text-right">Amount Paid</th>
                                <th className="px-4 py-2 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {policy.installments.map((inst, idx) => {
                                const balance = (inst.dueAmount || 0) - (inst.paidAmount || 0);
                                return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">{formatDate(inst.dueDate)}</td>
                                        <td className="px-4 py-2 text-right">{formatMoney(inst.dueAmount, policy.currency)}</td>
                                        <td className="px-4 py-2">{formatDate(inst.paidDate)}</td>
                                        <td className="px-4 py-2 text-right text-green-700 font-medium">{formatMoney(inst.paidAmount, policy.currency)}</td>
                                        <td className={`px-4 py-2 text-right font-bold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatMoney(balance, policy.currency)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-gray-500 text-sm italic">
                    Single Payment. Due: {formatDate(policy.paymentDate)}. Status: {policy.paymentStatus}.
                </div>
            )}
        </div>

        {/* Conditions & Details */}
        {policy.conditions && (
             <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><ShieldCheck size={16}/> Conditions & Warranties</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{policy.conditions}</p>
            </div>
        )}

        {/* Treaty / Reinsurance */}
        {policy.channel === 'Inward' && (
             <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2"><Globe size={16}/> Treaty Details</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><div className="text-purple-700 opacity-70">Treaty Placement</div><div className="font-medium text-purple-900">{policy.treatyPlacement || '-'}</div></div>
                    <div><div className="text-purple-700 opacity-70">Treaty Premium</div><div className="font-medium text-purple-900">{formatMoney(policy.treatyPremium, policy.currency)}</div></div>
                    <div><div className="text-purple-700 opacity-70">AIC Commission</div><div className="font-medium text-purple-900">{formatMoney(policy.aicCommission, policy.currency)}</div></div>
                </div>
            </div>
        )}

        {/* Outward Reinsurance Panel - ENHANCED */}
        {policy.hasOutwardReinsurance && (
            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-amber-900 flex items-center gap-2"><ArrowRightLeft size={16}/> Outward Reinsurance Panel</h4>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200">
                        {policy.reinsurers?.length || 0} Reinsurers
                    </span>
                </div>
                
                {/* Reinsurer List Table */}
                {policy.reinsurers && policy.reinsurers.length > 0 ? (
                    <div className="overflow-hidden border border-amber-200 rounded-lg bg-white mb-4">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-amber-100 text-amber-900 font-semibold">
                                <tr>
                                    <th className="px-4 py-2">Reinsurer / Market</th>
                                    <th className="px-4 py-2 text-right">Share %</th>
                                    <th className="px-4 py-2 text-right">Comm %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-50">
                                {policy.reinsurers.map((r, i) => (
                                    <tr key={i} className="hover:bg-amber-50/50">
                                        <td className="px-4 py-2 font-medium text-gray-800">{r.name}</td>
                                        <td className="px-4 py-2 text-right">{r.share}%</td>
                                        <td className="px-4 py-2 text-right">{r.commission}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-amber-700 text-sm italic mb-4">No reinsurers detailed.</div>
                )}

                 {/* Aggregates */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm border-t border-amber-200 pt-4">
                    <div><div className="text-amber-700 opacity-70">Total Ceded Share</div><div className="font-bold text-amber-900">{policy.cededShare}%</div></div>
                    <div><div className="text-amber-700 opacity-70">Avg Commission</div><div className="font-bold text-amber-900">{policy.reinsuranceCommission}%</div></div>
                    <div><div className="text-amber-700 opacity-70">Ceded Premium</div><div className="font-bold text-amber-900">{formatMoney(policy.cededPremiumForeign, policy.currency)}</div></div>
                    <div><div className="text-amber-700 opacity-70">Net Due</div><div className="font-bold text-amber-900">{formatMoney(policy.netReinsurancePremium, policy.currency)}</div></div>
                 </div>
            </div>
        )}
    </div>
  )};

  const renderSlipDetail = (slip: ReinsuranceSlip) => (
     <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4"><span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={14}/> Reinsurance Slip</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-1">Slip Number</div>
                <div className="font-mono text-xl font-bold text-gray-900 tracking-tight">{slip.slipNumber}</div>
             </div>
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-1">Date</div>
                <div className="font-medium text-lg text-gray-900">{formatDate(slip.date)}</div>
             </div>
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-1">Insured Name</div>
                <div className="font-medium text-lg text-gray-900">{slip.insuredName}</div>
             </div>
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-1">Broker / Lead Reinsurer</div>
                <div className="font-medium text-lg text-gray-900">{slip.brokerReinsurer}</div>
             </div>
        </div>

        {/* Detailed Market List for Slips */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-4">
            <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700">Market Panel Details</div>
            {slip.reinsurers && slip.reinsurers.length > 0 ? (
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="px-6 py-3">Market / Reinsurer</th>
                            <th className="px-6 py-3 text-right">Written Line (%)</th>
                            <th className="px-6 py-3 text-right">Commission (%)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {slip.reinsurers.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-gray-900">{r.name}</td>
                                <td className="px-6 py-3 text-right">{r.share}%</td>
                                <td className="px-6 py-3 text-right">{r.commission}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="p-6 text-gray-400 text-center italic">No market panel details available.</div>
            )}
        </div>
     </div>
  );

  const renderClauseDetail = (clause: Clause) => (
      <div className="space-y-6">
         <div className="flex items-center gap-3 mb-4"><span className={`px-3 py-1 rounded-full text-sm font-bold ${clause.category === 'Exclusion' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{clause.category}</span></div>
        <h3 className="text-2xl font-bold text-gray-900">{clause.title}</h3>
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 font-serif text-gray-800 leading-relaxed whitespace-pre-wrap">{clause.content}</div>
      </div>
  );

  const renderContent = () => {
    if ('channel' in item || 'policyNumber' in item) return renderPolicyDetail(item as Policy);
    if ('slipNumber' in item && !('channel' in item)) return renderSlipDetail(item as ReinsuranceSlip);
    if ('content' in item) return renderClauseDetail(item as Clause);
    return <div className="text-red-500">Unknown item type</div>;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
            {showTerminationConfirm && renderTerminationModal()}
            {showNTUConfirm && renderNTUModal()}
            {showActivateConfirm && renderActivateModal()}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                    {title && <h3 className="font-bold text-gray-700">{title}</h3>}
                    {allowJsonView && (
                        <div className="flex gap-2 bg-white rounded-md p-1 border">
                            <button onClick={() => setViewMode('details')} className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'details' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Card</button>
                            <button onClick={() => setViewMode('json')} className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'json' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>JSON</button>
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 hover:bg-gray-200 rounded"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-white">
                {viewMode === 'json' && allowJsonView ? (<div className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-lg overflow-auto h-full"><pre>{JSON.stringify(item, null, 2)}</pre></div>) : (renderContent())}
            </div>
            <div className="p-3 border-t bg-gray-50 text-right flex justify-between items-center">
                <div className="text-xs text-gray-400 font-mono">ID: {item.id}</div>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium text-sm">Close</button>
            </div>
        </div>
    </div>
  );
};
