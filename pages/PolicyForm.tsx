
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DB } from '../services/db';
import { Policy, Currency, PolicyStatus, PaymentStatus, RecordType } from '../types';
import { Save, ArrowLeft, Calculator, Building2, FileText, DollarSign, ShieldCheck, ArrowRightLeft, Shield, Upload, CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown, Search } from 'lucide-react';

// --- DATASETS FOR AUTOCOMPLETE ---

const UZBEK_REGIONS = [
  "Tashkent City", "Tashkent Region", "Andijan", "Bukhara", "Fergana", "Jizzakh", 
  "Namangan", "Navoiy", "Qashqadaryo", "Samarkand", "Sirdaryo", "Surxondaryo", "Xorazm", "Republic of Karakalpakstan"
];

const COUNTRIES = [
  "Uzbekistan", "Kazakhstan", "Russia", "Turkey", "United Arab Emirates", 
  "United Kingdom", "USA", "China", "Germany", "Switzerland", "France", "Singapore"
];

const INSURANCE_CLASSES = [
  "01 - Accident", 
  "02 - Sickness", 
  "03 - Land Vehicles (KASKO)", 
  "04 - Railway Rolling Stock", 
  "05 - Aircraft", 
  "06 - Ships", 
  "07 - Goods in Transit (Cargo)", 
  "08 - Fire and Natural Forces", 
  "09 - Other Damage to Property", 
  "10 - Motor Vehicle Liability (CMTPL)", 
  "11 - Aircraft Liability", 
  "12 - Ships Liability", 
  "13 - General Liability", 
  "14 - Credit", 
  "15 - Suretyship", 
  "16 - Miscellaneous Financial Loss", 
  "17 - Legal Expenses", 
  "18 - Assistance"
];

const INSURANCE_TYPES = [
  "Voluntary Property Insurance",
  "Mandatory Motor Liability (OSGO)",
  "Voluntary Motor Insurance (KASKO)",
  "Construction All Risk (CAR)",
  "Erection All Risk (EAR)",
  "General Third Party Liability (GTPL)",
  "Employer's Liability",
  "Professional Indemnity",
  "Cargo Insurance",
  "Health Insurance",
  "Travel Insurance",
  "Banker's Blanket Bond (BBB)",
  "Cyber Insurance",
  "Directors & Officers (D&O)"
];

const BROKERS = [
  "Direct (No Broker)",
  "Marsh",
  "Aon",
  "Willis Towers Watson",
  "Arthur J. Gallagher",
  "Local Broker LLC",
  "Uzbek Insurance Broker",
  "Silk Road Broking"
];

// --- REUSABLE SEARCHABLE INPUT COMPONENT ---
interface SearchableInputProps {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (e: { target: { name: string; value: string } }) => void;
  placeholder?: string;
  required?: boolean;
}

const SearchableInput: React.FC<SearchableInputProps> = ({ label, name, value, options, onChange, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value?.toLowerCase() || '')
  );

  const handleSelect = (opt: string) => {
    onChange({ target: { name, value: opt } });
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    setIsOpen(true);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value || ''}
          onChange={handleInputChange}
          onClick={() => setIsOpen(true)}
          required={required}
          placeholder={placeholder || "Type to search..."}
          autoComplete="off"
          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {isOpen ? <Search size={14}/> : <ChevronDown size={14}/>}
        </div>
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {filteredOptions.map((opt) => (
            <li 
              key={opt}
              onClick={() => handleSelect(opt)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer border-b border-gray-50 last:border-0"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


const PolicyForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Initialize with empty strings for all text fields to avoid uncontrolled/controlled errors
  const [formData, setFormData] = useState<Policy>({
    id: crypto.randomUUID(),
    recordType: 'Direct',
    policyNumber: '',
    slipNumber: '',
    insuredName: '',
    insuredAddress: '',
    cedantName: '',
    reinsurerName: '',
    brokerName: '',
    industry: '',
    territory: 'Uzbekistan',
    city: '',
    jurisdiction: 'Uzbekistan',
    classOfInsurance: '',
    typeOfInsurance: '',
    riskCode: '',
    currency: Currency.USD,
    sumInsured: 0,
    grossPremium: 0,
    commissionPercent: 0,
    taxPercent: 0,
    netPremium: 0,
    exchangeRate: 1,
    ourShare: 100,
    deductible: '',
    inceptionDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    status: PolicyStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    selectedClauseIds: [],
    installments: [],
    claims: []
  });

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const policy = await DB.getPolicy(id);
        if (policy) {
          // Ensure potentially undefined fields are at least empty strings
          setFormData({
            ...policy,
            brokerName: policy.brokerName || '',
            city: policy.city || '',
            classOfInsurance: policy.classOfInsurance || '',
            typeOfInsurance: policy.typeOfInsurance || '',
            territory: policy.territory || 'Uzbekistan'
          });
        } else {
          alert('Policy not found');
          navigate('/');
        }
      } else {
        setFormData(prev => ({ 
           ...prev, 
           policyNumber: `AIC/${prev.recordType === 'Outward' ? 'OUT' : prev.recordType === 'Inward' ? 'IN' : 'D'}/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}` 
        }));
      }
      setLoading(false);
    };
    loadData();
  }, [id, isEdit, navigate]);

  // Calculations
  useEffect(() => {
    const gross = formData.grossPremium || 0;
    const comm = formData.commissionPercent || 0;
    const tax = formData.taxPercent || 0;
    
    // Direct Net Premium
    const net = gross - (gross * comm / 100) - (gross * tax / 100);
    
    // Outward Net Calculation
    const cededPrem = formData.cededPremiumForeign || 0;
    const reinsComm = formData.reinsuranceCommission || 0;
    const netReins = cededPrem - (cededPrem * reinsComm / 100);

    setFormData(prev => ({ 
        ...prev, 
        netPremium: net,
        netReinsurancePremium: prev.recordType === 'Outward' ? netReins : prev.netReinsurancePremium
    }));
  }, [formData.grossPremium, formData.commissionPercent, formData.taxPercent, formData.cededPremiumForeign, formData.reinsuranceCommission, formData.recordType]);

  const handleChange = (e: { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    
    const numericFields = [
        'sumInsured', 'sumInsuredNational', 'grossPremium', 'premiumNationalCurrency', 
        'exchangeRate', 'commissionPercent', 'taxPercent', 'ourShare', 
        'limitForeignCurrency', 'limitNationalCurrency', 'excessForeignCurrency', 'prioritySum',
        'sumReinsuredForeign', 'receivedPremiumForeign', 'equivalentUSD',
        'treatyPremium', 'aicCommission', 'aicRetention', 'aicPremium',
        'reinsuranceCommission', 'netReinsurancePremium', 'receivedPremiumNational',
        'premiumRate', 'warrantyPeriod', 'cededPremiumForeign', 'cededPremiumNational'
    ];
    
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (value === '' ? 0 : parseFloat(value)) : value
    }));
  };

  const handleTypeSelect = (type: RecordType) => {
    if (isEdit) {
        if (!confirm("Changing the record type will reset the reference number. Continue?")) {
            return;
        }
    }
    setFormData(prev => ({ 
        ...prev, 
        recordType: type,
        policyNumber: `AIC/${type === 'Outward' ? 'OUT' : type === 'Inward' ? 'IN' : 'D'}/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Workflow Actions
  const handleActivate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedFile && !formData.signedDocument) {
        if(!window.confirm("Activating without a signed slip. Continue?")) return;
    }
    setProcessingAction('activate');
    try {
        const updatedData = { ...formData, status: PolicyStatus.ACTIVE, activationDate: new Date().toISOString() };
        if (selectedFile) {
            updatedData.signedDocument = {
                fileName: selectedFile.name,
                uploadDate: new Date().toISOString(),
                url: URL.createObjectURL(selectedFile)
            };
        }
        setFormData(updatedData);
        await DB.savePolicy(updatedData);
        alert("Policy BOUND and ACTIVATED.");
        navigate('/');
    } catch (error) {
        console.error(error);
        alert("Failed to activate.");
    } finally {
        setProcessingAction(null);
    }
  };

  const handleNTU = async (e: React.MouseEvent) => {
    e.preventDefault();
    if(window.confirm("Confirm 'Not Taken Up'?")) {
        setProcessingAction('ntu');
        try {
            const updatedData = { ...formData, status: PolicyStatus.NTU };
            await DB.savePolicy(updatedData);
            navigate('/');
        } catch (error) { console.error(error); } finally { setProcessingAction(null); }
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    if(window.confirm("CANCEL active policy?")) {
        setProcessingAction('cancel');
        try {
            const updatedData = { ...formData, status: PolicyStatus.CANCELLED };
            await DB.savePolicy(updatedData);
            navigate('/');
        } catch (error) { console.error(error); } finally { setProcessingAction(null); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingAction('save');
    try {
        await DB.savePolicy(formData);
        navigate('/');
    } catch (error) {
        console.error("Save failed", error);
        alert("Failed to save record.");
    } finally {
        setProcessingAction(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const isInward = formData.recordType === 'Inward';
  const isDirect = formData.recordType === 'Direct';
  const isOutward = formData.recordType === 'Outward';

  const sectionTitleClass = "text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";
  // Added text-gray-900 to ensure visibility
  const inputClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900";
  const selectClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-900";

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <form onSubmit={handleSubmit}>
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-200 py-4 mb-6 flex items-center justify-between -mx-4 px-4 md:-mx-8 md:px-8">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Record' : 'New Insurance Record'}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                       {formData.policyNumber} <span className="text-gray-300">|</span> 
                       <span className={`font-bold ${formData.status === PolicyStatus.ACTIVE ? 'text-green-600' : 'text-amber-600'}`}>
                           {formData.status}
                       </span>
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                 <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    Close
                </button>
                <button
                    type="submit"
                    disabled={!!processingAction}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {processingAction === 'save' ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                    Save Progress
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Left Column (Main Data) */}
            <div className="xl:col-span-8 space-y-6">
                
                {/* 1. Record Type Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><ArrowRightLeft size={18} className="text-blue-500"/> Business Type</h3>
                    <div className="flex gap-4">
                        {(['Direct', 'Inward', 'Outward'] as RecordType[]).map((type) => (
                            <div 
                                key={type}
                                onClick={() => {
                                    if (formData.recordType !== type) {
                                        handleTypeSelect(type);
                                    }
                                }}
                                className={`flex-1 cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all select-none
                                    ${formData.recordType === type 
                                        ? (type === 'Direct' ? 'border-blue-500 bg-blue-50 text-blue-700' : type === 'Inward' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-amber-500 bg-amber-50 text-amber-700') 
                                        : 'border-gray-100 hover:border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                            >
                                {type === 'Direct' && <ShieldCheck size={24} />}
                                {type === 'Inward' && <ArrowRightLeft size={24} />}
                                {type === 'Outward' && <Shield size={24} />}
                                <span className="font-bold text-sm text-gray-900">{type}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Parties & Risk Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><Building2 size={18} className="text-blue-500"/> Parties & Risk Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         {/* Dynamic Parties based on Type */}
                         {isInward && (
                            <>
                                <div>
                                    <label className={labelClass}>Cedent (Reinsured)</label>
                                    <input type="text" name="cedantName" value={formData.cedantName || ''} onChange={handleChange} className={`${inputClass} !bg-purple-50 border-purple-200`}/>
                                </div>
                                <div>
                                    <label className={labelClass}>Retrocedent / Borrower</label>
                                    <input type="text" name="retrocedent" value={formData.retrocedent || ''} onChange={handleChange} placeholder="Optional" className={inputClass}/>
                                </div>
                            </>
                        )}

                        {isOutward && (
                             <div>
                                <label className={labelClass}>Reinsurer</label>
                                <input type="text" name="reinsurerName" value={formData.reinsurerName || ''} onChange={handleChange} className={`${inputClass} !bg-amber-50 border-amber-200`}/>
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>Original Insured Name</label>
                            <input type="text" required name="insuredName" value={formData.insuredName || ''} onChange={handleChange} className={inputClass}/>
                        </div>

                        {/* AUTOCOMPLETE: Broker */}
                        <SearchableInput 
                            label="Broker" 
                            name="brokerName" 
                            value={formData.brokerName || ''} 
                            options={BROKERS} 
                            onChange={handleChange} 
                        />

                        {/* AUTOCOMPLETE: Country */}
                        <SearchableInput 
                            label="Territory (Country)" 
                            name="territory" 
                            value={formData.territory || 'Uzbekistan'} 
                            options={COUNTRIES} 
                            onChange={handleChange} 
                        />
                        
                        {isDirect && (
                            /* AUTOCOMPLETE: City/Region */
                            <SearchableInput 
                                label="City / Region" 
                                name="city" 
                                value={formData.city || ''} 
                                options={UZBEK_REGIONS} 
                                onChange={handleChange} 
                            />
                        )}

                        <div>
                            <label className={labelClass}>Industry / Business</label>
                            <input type="text" name="industry" value={formData.industry || ''} onChange={handleChange} className={inputClass}/>
                        </div>

                        {/* AUTOCOMPLETE: Class of Insurance */}
                        <div className="md:col-span-2">
                            <SearchableInput 
                                label="Class of Insurance (Code)" 
                                name="classOfInsurance" 
                                value={formData.classOfInsurance || ''} 
                                options={INSURANCE_CLASSES} 
                                onChange={handleChange} 
                                placeholder="e.g. 03 - Land Vehicles"
                            />
                        </div>

                        {/* AUTOCOMPLETE: Type of Insurance */}
                        <div className="md:col-span-2">
                             <SearchableInput 
                                label="Type of Insurance" 
                                name="typeOfInsurance" 
                                value={formData.typeOfInsurance || ''} 
                                options={INSURANCE_TYPES} 
                                onChange={handleChange} 
                            />
                        </div>
                        
                         {isDirect && (
                             <div>
                                <label className={labelClass}>Risk Code</label>
                                <input type="text" name="riskCode" value={formData.riskCode || ''} onChange={handleChange} className={inputClass}/>
                            </div>
                         )}
                    </div>
                </div>
                
                {/* 3. Financials */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><DollarSign size={18} className="text-blue-500"/> Financials & Premiums</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                        <div>
                            <label className={labelClass}>Currency</label>
                            <select name="currency" value={formData.currency} onChange={handleChange} className={selectClass}>
                                {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Exchange Rate</label>
                            <input type="number" step="0.01" name="exchangeRate" value={formData.exchangeRate} onChange={handleChange} className={inputClass}/>
                        </div>
                        {isDirect && (
                             <div>
                                <label className={labelClass}>Premium Rate (%)</label>
                                <input type="number" step="0.0001" name="premiumRate" value={formData.premiumRate || ''} onChange={handleChange} className={inputClass}/>
                            </div>
                        )}
                    </div>

                    {/* Side-by-Side Amounts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {/* Foreign Currency */}
                         <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                             <h4 className="font-bold text-blue-800 text-xs uppercase tracking-wider mb-2">Foreign Currency Amounts</h4>
                             <div>
                                <label className={labelClass}>Sum Insured (FC)</label>
                                <input type="number" name="sumInsured" value={formData.sumInsured} onChange={handleChange} className={inputClass}/>
                             </div>
                             <div>
                                <label className={labelClass}>Gross Premium (FC)</label>
                                <input type="number" name="grossPremium" value={formData.grossPremium} onChange={handleChange} className={inputClass}/>
                             </div>
                             
                             {/* Inward Specific Limits */}
                             {isInward && (
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200">
                                     <div>
                                        <label className="text-xs font-medium text-gray-500">Limit (FC)</label>
                                        <input type="number" name="limitForeignCurrency" value={formData.limitForeignCurrency || ''} onChange={handleChange} className={inputClass}/>
                                     </div>
                                     <div>
                                        <label className="text-xs font-medium text-gray-500">Excess (FC)</label>
                                        <input type="number" name="excessForeignCurrency" value={formData.excessForeignCurrency || ''} onChange={handleChange} className={inputClass}/>
                                     </div>
                                </div>
                             )}
                         </div>

                         {/* National Currency */}
                         <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-100">
                             <h4 className="font-bold text-green-800 text-xs uppercase tracking-wider mb-2">National Currency (Sums)</h4>
                             <div>
                                <label className={labelClass}>Sum Insured (Sums)</label>
                                <input type="number" name="sumInsuredNational" value={formData.sumInsuredNational || ''} onChange={handleChange} className={inputClass}/>
                             </div>
                             <div>
                                <label className={labelClass}>Gross Premium (Sums)</label>
                                <input type="number" name="premiumNationalCurrency" value={formData.premiumNationalCurrency || ''} onChange={handleChange} className={inputClass}/>
                             </div>
                         </div>
                    </div>
                </div>

                {/* 4. Reinsurance Cession / Treaty (Inward/Outward Only) */}
                {(isOutward || isInward) && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-amber-400">
                         <h3 className={sectionTitleClass}><Calculator size={18} className="text-amber-500"/> {isOutward ? 'Outward Cession Details' : 'Inward Share & Treaty'}</h3>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                             <div>
                                <label className={labelClass}>{isOutward ? 'Ceded Share %' : 'Our Share %'}</label>
                                <input type="number" name="ourShare" value={formData.ourShare} onChange={handleChange} className={inputClass}/>
                             </div>
                             <div>
                                <label className={labelClass}>{isOutward ? 'Sum Reinsured (Ceded)' : 'Sum Reinsured (Accept)'}</label>
                                <input type="number" name="sumReinsuredForeign" value={formData.sumReinsuredForeign || ''} onChange={handleChange} className={inputClass}/>
                             </div>
                             <div>
                                <label className={labelClass}>{isOutward ? 'Premium Ceded' : 'Premium Accepted'}</label>
                                <input type="number" name="cededPremiumForeign" value={formData.cededPremiumForeign || ''} onChange={handleChange} className={inputClass}/>
                             </div>

                             <div className="md:col-span-3 h-px bg-gray-200 my-2"></div>

                             <div>
                                <label className={labelClass}>Commission %</label>
                                <input type="number" name="reinsuranceCommission" value={formData.reinsuranceCommission || ''} onChange={handleChange} className={inputClass}/>
                             </div>
                             <div className="md:col-span-2">
                                <label className={labelClass}>Net {isOutward ? 'Payable to Reinsurer' : 'Receivable from Cedent'}</label>
                                <input type="number" readOnly name="netReinsurancePremium" value={formData.netReinsurancePremium || ''} className={`${inputClass} bg-gray-100 font-bold text-gray-800`}/>
                             </div>
                         </div>

                         {isInward && (
                             <div className="mt-6 pt-4 border-t border-dashed border-gray-300">
                                 <h4 className="text-sm font-bold text-gray-700 mb-3">AIC Treaty & Retention</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <div>
                                        <label className={labelClass}>Treaty Placement</label>
                                        <input type="text" name="treatyPlacement" value={formData.treatyPlacement || ''} onChange={handleChange} className={inputClass}/>
                                     </div>
                                      <div>
                                        <label className={labelClass}>AIC Premium</label>
                                        <input type="number" name="aicPremium" value={formData.aicPremium || ''} onChange={handleChange} className={inputClass}/>
                                     </div>
                                     <div>
                                        <label className={labelClass}>AIC Retention</label>
                                        <input type="number" name="aicRetention" value={formData.aicRetention || ''} onChange={handleChange} className={inputClass}/>
                                     </div>
                                 </div>
                             </div>
                         )}
                    </div>
                )}
            </div>

            {/* Right Column (Reference & Settings) */}
            <div className="xl:col-span-4 space-y-6">
                
                {/* VALIDATION WORKFLOW - Only Show on Edit */}
                {isEdit && (
                    <div className={`rounded-xl shadow-sm border p-6 transition-all ${
                        formData.status === PolicyStatus.ACTIVE ? 'bg-green-50 border-green-200' :
                        formData.status === PolicyStatus.NTU ? 'bg-red-50 border-red-200' :
                        'bg-amber-50 border-amber-200'
                    }`}>
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                            formData.status === PolicyStatus.ACTIVE ? 'text-green-800' :
                            formData.status === PolicyStatus.NTU ? 'text-red-800' :
                            'text-amber-800'
                        }`}>
                            {formData.status === PolicyStatus.ACTIVE ? <CheckCircle size={20}/> :
                            formData.status === PolicyStatus.NTU ? <XCircle size={20}/> :
                            <AlertCircle size={20}/>}
                            Validation Status
                        </h3>

                        {/* Status Display */}
                        <div className="mb-4">
                            <div className="text-sm text-gray-600 mb-1">Current Status:</div>
                            <div className="font-bold text-lg text-gray-900">{formData.status}</div>
                        </div>

                        {formData.status !== PolicyStatus.ACTIVE && formData.status !== PolicyStatus.NTU && (
                            <div className="space-y-4">
                                <div className="border-t border-dashed border-amber-200 pt-4">
                                    <label className="block text-sm font-bold text-amber-900 mb-2">
                                        Upload Signed Slip / Policy (PDF)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer bg-white border border-amber-300 rounded-lg px-4 py-2 text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 text-sm">
                                            <Upload size={16} /> {selectedFile ? selectedFile.name : 'Select File...'}
                                            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-amber-700 mt-1 opacity-80">
                                        Upload the signed firm order/slip to bind the risk.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <div className="w-full">
                                        <button 
                                            type="button" 
                                            onClick={handleNTU}
                                            disabled={!!processingAction}
                                            title="Not Taken Up (Cancelled Deal)"
                                            className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2 z-10 relative cursor-pointer"
                                        >
                                            {processingAction === 'ntu' ? <Loader2 className="animate-spin" size={16}/> : 'Mark as NTU'}
                                        </button>
                                    </div>
                                    
                                    <div className="w-full">
                                        <button 
                                            type="button" 
                                            onClick={handleActivate}
                                            disabled={!!processingAction}
                                            title="Validate as Live Policy"
                                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 z-10 relative cursor-pointer"
                                        >
                                            {processingAction === 'activate' ? <Loader2 className="animate-spin" size={16}/> : 'Bind & Activate'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {formData.status === PolicyStatus.ACTIVE && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-2">Need to terminate this policy early?</p>
                                <button 
                                    onClick={handleCancel}
                                    type="button" 
                                    disabled={!!processingAction}
                                    className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 z-10 relative cursor-pointer"
                                >
                                    {processingAction === 'cancel' ? <Loader2 className="animate-spin" size={16}/> : <><XCircle size={16}/> Cancel Policy</>}
                                </button>
                            </div>
                        )}

                        {/* Display if file exists */}
                        {formData.signedDocument && (
                            <div className="mt-4 bg-white/60 p-3 rounded-lg border border-black/5 flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded text-red-600"><FileText size={16}/></div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-bold truncate text-gray-900">{formData.signedDocument.fileName}</div>
                                    <div className="text-xs text-gray-500">Uploaded: {new Date(formData.signedDocument.uploadDate).toLocaleDateString()}</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* References */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><FileText size={18} className="text-blue-500"/> References & Dates</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>{isDirect ? 'Agreement Number' : 'Our Reference No'}</label>
                            <input type="text" name="policyNumber" value={formData.policyNumber || ''} onChange={handleChange} className={`${inputClass} font-mono`}/>
                        </div>

                         {(isInward || isOutward) && (
                            <>
                                <div>
                                    <label className={labelClass}>{isOutward ? 'Reins Slip No' : 'Slip Number'}</label>
                                    <input type="text" name="slipNumber" value={formData.slipNumber || ''} onChange={handleChange} className={inputClass}/>
                                </div>
                                <div>
                                    <label className={labelClass}>Agreement No</label>
                                    <input type="text" name="agreementNumber" value={formData.agreementNumber || ''} onChange={handleChange} className={inputClass}/>
                                </div>
                            </>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Inception</label>
                                <input type="date" name="inceptionDate" value={formData.inceptionDate} onChange={handleChange} className={inputClass}/>
                            </div>
                             <div>
                                <label className={labelClass}>Expiry</label>
                                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={inputClass}/>
                            </div>
                        </div>

                        {isDirect && (
                             <div>
                                <label className={labelClass}>Accounting Date</label>
                                <input type="date" name="accountingDate" value={formData.accountingDate || ''} onChange={handleChange} className={inputClass}/>
                            </div>
                        )}
                        
                        {(isInward || isOutward) && (
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Date of Slip</label>
                                    <input type="date" name="dateOfSlip" value={formData.dateOfSlip || ''} onChange={handleChange} className={inputClass}/>
                                </div>
                                <div>
                                    <label className={labelClass}>Acc. Date</label>
                                    <input type="date" name="accountingDate" value={formData.accountingDate || ''} onChange={handleChange} className={inputClass}/>
                                </div>
                            </div>
                        )}

                        {isDirect && (
                            <div>
                                <label className={labelClass}>Warranty Period (Days)</label>
                                <input type="number" name="warrantyPeriod" value={formData.warrantyPeriod || ''} onChange={handleChange} className={inputClass}/>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status & Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><ShieldCheck size={18} className="text-blue-500"/> Config</h3>
                    
                    <div className="space-y-4">
                        <div className="opacity-70 pointer-events-none">
                            <label className={labelClass}>Policy Status (Managed above)</label>
                            <select name="status" value={formData.status} disabled className={`${selectClass} bg-gray-100`}>
                                {Object.values(PolicyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className={labelClass}>Payment Status</label>
                            <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className={selectClass}>
                                {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        
                        <div className="border-t pt-4 mt-4">
                             <label className={labelClass}>Deductible / Excess</label>
                             <textarea rows={3} name="deductible" value={formData.deductible || ''} onChange={handleChange} className={inputClass}></textarea>
                        </div>
                    </div>
                </div>

                 {isOutward && (
                    <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-6">
                         <h3 className="text-amber-800 font-bold mb-2 text-sm uppercase">Reinsurer Quality</h3>
                         <div>
                            <label className={labelClass}>Rating (S&P / AM Best)</label>
                            <input type="text" name="reinsurerRating" value={formData.reinsurerRating || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                    </div>
                 )}

            </div>
        </div>
      </form>
    </div>
  );
};

export default PolicyForm;
