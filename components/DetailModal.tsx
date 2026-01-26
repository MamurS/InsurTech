
import React, { useState } from 'react';
import { Policy, ReinsuranceSlip, Clause, PolicyStatus, TerminationDetails } from '../types';
import { DB } from '../services/db';
import { formatDate } from '../utils/dateUtils';
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
                 <div><div className="text-gray-500">Sum Insured</div><div className="font-bold text-lg text-gray-900">{formatMoney