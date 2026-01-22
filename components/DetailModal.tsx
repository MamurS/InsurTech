
import React, { useState } from 'react';
import { Policy, ReinsuranceSlip, Clause, PolicyStatus, TerminationDetails } from '../types';
import { DB } from '../services/db';
import { 
  X, Building2, Calendar, DollarSign, ArrowRightLeft, 
  FileSpreadsheet, Code, CheckCircle, ShieldAlert, FileText, Download, Upload, AlertCircle, Trash2, XCircle, AlertTriangle
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
    console.log("=== handleStatusChange START ===");
    console.log("newStatus:", newStatus);
    
    // NOTE: Window.confirm calls removed. Confirmation is now handled by custom modals before calling this function.

    setIsProcessing(true);
    
    try {
        console.log("Creating updatedPolicy...");
        const updatedPolicy = { ...policy, status: newStatus };
        
        // Handle additional data (like termination details)
        if (newStatus === PolicyStatus.EARLY_TERMINATION && additionalData) {
            console.log("Adding termination details...");
            updatedPolicy.terminationDetails = additionalData;
        }

        // Simulate file upload if file selected
        if (uploadFile) {
            console.log("Processing uploadFile...");
            updatedPolicy.signedDocument = {
                fileName: uploadFile.name,
                uploadDate: new Date().toISOString(),
                url: '#'
            };
            if (newStatus === PolicyStatus.ACTIVE) {
                updatedPolicy.activationDate = new Date().toISOString();
            }
        } else if (newStatus === PolicyStatus.ACTIVE) {
            console.log("Setting activationDate...");
            updatedPolicy.activationDate = new Date().toISOString();
        }

        console.log("About to save policy:", updatedPolicy);
        await DB.savePolicy(updatedPolicy);
        console.log("Policy saved successfully!");
        
        if (onRefresh) {
            onRefresh();
        }
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
                      <input 
                        type="date" 
                        value={terminationData.terminationDate}
                        onChange={(e) => setTerminationData({...terminationData, terminationDate: e.target.value})}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                  </div>
                  
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initiated By</label>
                      <select 
                        value={terminationData.initiator}
                        onChange={(e) => setTerminationData({...terminationData, initiator: e.target.value as any})}
                        className="w-full p-2 border rounded-lg text-sm"
                      >
                          <option value="Us">Us (Insurer)</option>
                          <option value="Broker">Broker</option>
                          <option value="Cedant">Cedant / Client</option>
                          <option value="Other">Other</option>
                      </select>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason for Termination</label>
                      <textarea 
                        rows={3}
                        value={terminationData.reason}
                        onChange={(e) => setTerminationData({...terminationData, reason: e.target.value})}
                        placeholder="e.g. Non-payment of premium..."
                        className="w-full p-2 border rounded-lg text-sm resize-none"
                      />
                  </div>
              </div>

              <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                  <button 
                    onClick={() => setShowTerminationConfirm(false)}
                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg text-sm"
                  >
                      Cancel
                  </button>
                  <button 
                    onClick={() => {
                        // Validate
                        if (!terminationData.reason.trim()) {
                            alert("Please provide a reason.");
                            return;
                        }
                        handleStatusChange(PolicyStatus.EARLY_TERMINATION, item as Policy, terminationData);
                    }}
                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-sm shadow-sm"
                  >
                      Terminate Policy
                  </button>
              </div>
          </div>
      </div>
  );

  const renderNTUModal = () => (
      <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 p-4 border-b flex items-center gap-3">
                <div className="bg-gray-200 p-2 rounded-full text-gray-600">
                    <XCircle size={20}/>
                </div>
                <h3 className="font-bold text-gray-800">Confirm "Not Taken Up"</h3>
            </div>
            
            <div className="p-6">
                <p className="text-gray-600 text-sm">
                    This means the deal was cancelled by the client/broker before inception. 
                    The record will be preserved for history and moved to the Cancelled/NTU tab.
                </p>
                <p className="text-gray-500 text-xs mt-3">
                    This action cannot be easily undone.
                </p>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <button 
                    type="button"
                    onClick={() => setShowNTUConfirm(false)}
                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg text-sm"
                >
                    Go Back
                </button>
                <button 
                    type="button"
                    onClick={() => {
                        setShowNTUConfirm(false);
                        handleStatusChange(PolicyStatus.NTU, item as Policy);
                    }}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-800 text-sm shadow-sm"
                >
                    {isProcessing ? "Processing..." : "Confirm NTU"}
                </button>
            </div>
        </div>
    </div>
  );

  const renderActivateModal = () => (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
            <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <CheckCircle size={20}/>
                </div>
                <h3 className="font-bold text-gray-800">Bind & Activate Policy</h3>
            </div>
            
            <div className="p-6">
                {!uploadFile && !(item as Policy)?.signedDocument ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <p className="text-amber-800 text-sm font-medium flex items-center gap-2">
                            <AlertCircle size={16} />
                            No signed document uploaded
                        </p>
                        <p className="text-amber-600 text-xs mt-1">
                            You are activating this policy without a signed slip. You can still proceed.
                        </p>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-green-800 text-sm font-medium flex items-center gap-2">
                            <CheckCircle size={16} />
                            {uploadFile ? `Document ready: ${uploadFile.name}` : 'Signed document on file'}
                        </p>
                    </div>
                )}
                
                <p className="text-gray-600 text-sm">
                    This will bind the risk and mark the policy as <strong>Active</strong>. 
                    The policy will be live in the system.
                </p>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <button 
                    type="button"
                    onClick={() => setShowActivateConfirm(false)}
                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg text-sm"
                >
                    Go Back
                </button>
                <button 
                    type="button"
                    onClick={() => {
                        setShowActivateConfirm(false);
                        handleStatusChange(PolicyStatus.ACTIVE, item as Policy);
                    }}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm shadow-sm flex items-center gap-2"
                >
                    {isProcessing ? "Processing..." : <><CheckCircle size={16}/> Activate Policy</>}
                </button>
            </div>
        </div>
    </div>
  );

  const renderPolicyDetail = (policy: Policy) => {
    // Debugging policy status rendering
    console.log("Rendering policy detail, status:", policy.status);
    console.log("Is PENDING?", policy.status === PolicyStatus.PENDING);

    return (
    <div className="space-y-6 relative">
        {/* Header Badge */}
        <div className="flex flex-wrap items-center gap-3 mb-4 justify-between">
            <div className="flex gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    policy.recordType === 'Direct' ? 'bg-blue-100 text-blue-700' :
                    policy.recordType === 'Inward' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                }`}>
                    {policy.recordType} Insurance
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    policy.status === PolicyStatus.ACTIVE ? 'bg-green-100 text-green-700' : 
                    policy.status === PolicyStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                    policy.status === PolicyStatus.NTU ? 'bg-red-100 text-red-700 border border-red-200' :
                    policy.status === PolicyStatus.CANCELLED ? 'bg-red-100 text-red-700' :
                    policy.status === PolicyStatus.EARLY_TERMINATION ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                }`}>
                    {policy.status}
                </span>
                {policy.isDeleted && <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">DELETED</span>}
            </div>
        </div>

        {/* WORKFLOW ACTION CARD (Pending) */}
        {policy.status === PolicyStatus.PENDING && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6 shadow-sm">
                <h4 className="font-bold text-orange-900 flex items-center gap-2 mb-3">
                    <AlertCircle size={18} /> Underwriting Workflow
                </h4>
                
                <div className="bg-white p-4 rounded-lg border border-orange-100 mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        1. Upload Signed Slip / Evidence of Cover
                    </label>
                    <div className="flex items-center gap-3">
                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <Upload size={16} /> 
                            {uploadFile ? uploadFile.name : "Choose PDF..."}
                            <input type="file" accept=".pdf" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                        </label>
                        {uploadFile && (
                            <button onClick={() => setUploadFile(null)} className="text-red-500 hover:text-red-700 p-1">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Upload the finalized, signed document from the broker.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("Opening NTU confirmation modal");
                            setShowNTUConfirm(true);
                        }}
                        disabled={isProcessing}
                        title="Mark as NTU"
                        className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors shadow-sm text-sm"
                    >
                        Mark as NTU
                    </button>

                    <button 
                        type="button"
                        onClick={() => {
                            console.log("Opening Activate confirmation modal");
                            setShowActivateConfirm(true);
                        }}
                        disabled={isProcessing}
                        title="Bind & Activate"
                        className="w-full py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
                    >
                        {isProcessing ? "Processing..." : <><CheckCircle size={16}/> Bind & Activate</>}
                    </button>
                </div>
            </div>
        )}

        {/* WORKFLOW ACTION CARD (Active - Termination) */}
        {policy.status === PolicyStatus.ACTIVE && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex justify-between items-center relative z-20">
                <div className="text-sm text-gray-600">
                    <span className="font-bold text-gray-800">Policy is Active.</span> Need to terminate early?
                </div>
                <div>
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowTerminationConfirm(true);
                        }}
                        disabled={isProcessing}
                        title="Early Termination"
                        className="px-4 py-2 bg-white border border-orange-200 text-orange-600 font-bold rounded-lg hover:bg-orange-50 transition-colors shadow-sm text-sm flex items-center gap-2 cursor-pointer relative"
                    >
                        <XCircle size={16} /> Early Termination
                    </button>
                </div>
            </div>
        )}

        {/* TERMINATION DETAILS (Read Only - if applicable) */}
        {policy.status === PolicyStatus.EARLY_TERMINATION && policy.terminationDetails && (
             <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 shadow-sm relative z-20">
                <div className="flex items-center gap-2 font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2">
                    <AlertTriangle size={18} /> Terminated Early
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500 text-xs uppercase">Date</span>
                        <div className="font-medium">{policy.terminationDetails.terminationDate}</div>
                    </div>
                    <div>
                        <span className="text-gray-500 text-xs uppercase">Initiated By</span>
                        <div className="font-medium">{policy.terminationDetails.initiator}</div>
                    </div>
                    <div className="col-span-2">
                        <span className="text-gray-500 text-xs uppercase">Reason</span>
                        <div className="font-medium text-gray-800 bg-white p-2 rounded border border-orange-100">{policy.terminationDetails.reason}</div>
                    </div>
                </div>
            </div>
        )}

        {/* Signed Document Section (Read Only) */}
        {policy.signedDocument && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-blue-100 text-red-500 shadow-sm">
                        <FileText size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-blue-900 text-sm">Signed Policy / Slip</div>
                        <div className="text-xs text-blue-600">
                            {policy.signedDocument.fileName} • Uploaded {new Date(policy.signedDocument.uploadDate).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <button className="px-3 py-1.5 bg-white text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-50 flex items-center gap-1 shadow-sm cursor-pointer">
                    <Download size={14} /> Download
                </button>
            </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Building2 size={16}/> Core Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Insured Name</div>
                        <div className="font-medium text-gray-900">{policy.insuredName}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Policy Number</div>
                        <div className="font-medium text-gray-900 font-mono">{policy.policyNumber}</div>
                    </div>
                     <div>
                        <div className="text-gray-500">Industry</div>
                        <div className="font-medium text-gray-900">{policy.industry || '-'}</div>
                    </div>
                     <div>
                        <div className="text-gray-500">Territory</div>
                        <div className="font-medium text-gray-900">{policy.territory}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Class</div>
                        <div className="font-medium text-gray-900">{policy.classOfInsurance}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Type</div>
                        <div className="font-medium text-gray-900">{policy.typeOfInsurance}</div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                 <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Calendar size={16}/> Dates</h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">Inception</div>
                        <div className="font-medium text-gray-900">{policy.inceptionDate}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">Expiry</div>
                        <div className="font-medium text-gray-900">{policy.expiryDate}</div>
                    </div>
                    {policy.dateOfSlip && (
                        <div>
                            <div className="text-gray-500">Date of Slip</div>
                            <div className="font-medium text-gray-900">{policy.dateOfSlip}</div>
                        </div>
                    )}
                    {policy.activationDate && (
                        <div className="col-span-2 mt-2 pt-2 border-t border-dashed">
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Bound / Activated On</div>
                            <div className="font-medium text-green-700">{new Date(policy.activationDate).toLocaleString()}</div>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Financials */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
             <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign size={16}/> Financials</h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                 <div>
                    <div className="text-gray-500">Sum Insured</div>
                    <div className="font-bold text-lg text-gray-900">{formatMoney(policy.sumInsured, policy.currency)}</div>
                 </div>
                 <div>
                    <div className="text-gray-500">Gross Premium</div>
                    <div className="font-bold text-lg text-green-700">{formatMoney(policy.grossPremium, policy.currency)}</div>
                 </div>
                  <div>
                    <div className="text-gray-500">Exchange Rate</div>
                    <div className="font-mono font-medium">{policy.exchangeRate}</div>
                 </div>
                  <div>
                    <div className="text-gray-500">Payment Status</div>
                    <div className="font-medium">{policy.paymentStatus}</div>
                 </div>
             </div>
        </div>

        {/* Reinsurance Specifics */}
        {(policy.recordType !== 'Direct') && (
            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                <h4 className="font-bold text-amber-900 mb-4 flex items-center gap-2"><ArrowRightLeft size={16}/> Reinsurance Details</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div>
                         <div className="text-amber-700 opacity-70">Reinsurer/Cedent</div>
                         <div className="font-medium text-amber-900">{policy.reinsurerName || policy.cedantName || '-'}</div>
                    </div>
                    <div>
                         <div className="text-amber-700 opacity-70">Share %</div>
                         <div className="font-bold text-amber-900">{policy.ourShare}%</div>
                    </div>
                    <div>
                         <div className="text-amber-700 opacity-70">Commission</div>
                         <div className="font-bold text-amber-900">{policy.reinsuranceCommission}%</div>
                    </div>
                     <div>
                         <div className="text-amber-700 opacity-70">Net Due</div>
                         <div className="font-bold text-amber-900">{formatMoney(policy.netReinsurancePremium, policy.currency)}</div>
                    </div>
                 </div>
            </div>
        )}
    </div>
  )};

  const renderSlipDetail = (slip: ReinsuranceSlip) => (
     <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
             <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                <FileSpreadsheet size={14}/> Reinsurance Slip
             </span>
             {slip.isDeleted && <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">DELETED</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-1">Slip Number</div>
                <div className="font-mono text-xl font-bold text-gray-900 tracking-tight">{slip.slipNumber}</div>
             </div>
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-1">Date</div>
                <div className="font-medium text-lg text-gray-900">{slip.date}</div>
             </div>
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-1">Insured Name</div>
                <div className="font-medium text-lg text-gray-900">{slip.insuredName}</div>
             </div>
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-1">Broker / Reinsurer</div>
                <div className="font-medium text-lg text-gray-900">{slip.brokerReinsurer}</div>
             </div>
        </div>
     </div>
  );

  const renderClauseDetail = (clause: Clause) => (
      <div className="space-y-6">
         <div className="flex items-center gap-3 mb-4">
             <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  clause.category === 'Exclusion' ? 'bg-red-100 text-red-700' :
                  clause.category === 'Warranty' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {clause.category}
             </span>
             {clause.isStandard && <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">Standard</span>}
             {clause.isDeleted && <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">DELETED</span>}
        </div>

        <h3 className="text-2xl font-bold text-gray-900">{clause.title}</h3>
        
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 font-serif text-gray-800 leading-relaxed whitespace-pre-wrap">
            {clause.content}
        </div>
      </div>
  );

  const renderContent = () => {
    // Type guards or duck typing
    if ('recordType' in item) return renderPolicyDetail(item as Policy);
    if ('slipNumber' in item && !('recordType' in item)) return renderSlipDetail(item as ReinsuranceSlip);
    if ('content' in item) return renderClauseDetail(item as Clause);
    return <div className="text-red-500">Unknown item type</div>;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
            
            {showTerminationConfirm && renderTerminationModal()}
            {showNTUConfirm && renderNTUModal()}
            {showActivateConfirm && renderActivateModal()}

            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                    {title && <h3 className="font-bold text-gray-700">{title}</h3>}
                    {allowJsonView && (
                        <div className="flex gap-2 bg-white rounded-md p-1 border">
                            <button 
                                onClick={() => setViewMode('details')}
                                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'details' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                Card
                            </button>
                            <button 
                                onClick={() => setViewMode('json')}
                                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'json' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                JSON
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 hover:bg-gray-200 rounded"><X size={20}/></button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6 bg-white">
                {viewMode === 'json' && allowJsonView ? (
                        <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-lg overflow-auto h-full">
                        <pre>{JSON.stringify(item, null, 2)}</pre>
                    </div>
                ) : (
                    renderContent()
                )}
            </div>

            <div className="p-3 border-t bg-gray-50 text-right flex justify-between items-center">
                <div className="text-xs text-gray-400 font-mono">ID: {item.id}</div>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium text-sm">Close</button>
            </div>
        </div>
    </div>
  );
};
