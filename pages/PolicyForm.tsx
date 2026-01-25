
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DB } from '../services/db';
import { Policy, Currency, PolicyStatus, PaymentStatus, Channel, IntermediaryType } from '../types';
import { Save, ArrowLeft, Building2, FileText, DollarSign, ShieldCheck, ArrowRightLeft, Upload, CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown, Search, Users, Shield, Percent, Briefcase, Calendar, Globe } from 'lucide-react';

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
  "01 - Accident", "02 - Sickness", "03 - Land Vehicles (KASKO)", "04 - Railway Rolling Stock", 
  "05 - Aircraft", "06 - Ships", "07 - Goods in Transit (Cargo)", "08 - Fire and Natural Forces", 
  "09 - Other Damage to Property", "10 - Motor Vehicle Liability (CMTPL)", "11 - Aircraft Liability", 
  "12 - Ships Liability", "13 - General Liability", "14 - Credit", "15 - Suretyship", 
  "16 - Miscellaneous Financial Loss", "17 - Legal Expenses", "18 - Assistance"
];

const INSURANCE_TYPES = [
  "Voluntary Property Insurance", "Mandatory Motor Liability (OSGO)", "Voluntary Motor Insurance (KASKO)",
  "Construction All Risk (CAR)", "Erection All Risk (EAR)", "General Third Party Liability (GTPL)",
  "Employer's Liability", "Professional Indemnity", "Cargo Insurance", "Health Insurance",
  "Travel Insurance", "Banker's Blanket Bond (BBB)", "Cyber Insurance", "Directors & Officers (D&O)"
];

const INTERMEDIARIES = [
  "Marsh", "Aon", "Willis Towers Watson", "Arthur J. Gallagher", "Local Broker LLC", "Uzbek Insurance Broker", "Silk Road Broking"
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
        <div className="absolute right-2 top-1/2 -translate-x-1/2 text-gray-400 pointer-events-none">
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

  // Initialize form data
  const [formData, setFormData] = useState<Policy>({
    id: crypto.randomUUID(),
    channel: 'Direct',
    intermediaryType: 'Direct',
    policyNumber: '',
    slipNumber: '',
    insuredName: '',
    insuredAddress: '',
    cedantName: '',
    intermediaryName: '',
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
    
    // Outward Defaults
    hasOutwardReinsurance: false,
    cededShare: 0,
    cededPremiumForeign: 0,
    
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
          // Backward compatibility check for recordType -> channel
          const loadedData = { ...policy };
          if ((policy as any).recordType) {
              if ((policy as any).recordType === 'Inward') loadedData.channel = 'Inward';
              else loadedData.channel = 'Direct'; 
          }

          setFormData({
            ...loadedData,
            intermediaryName: loadedData.intermediaryName || (loadedData as any).brokerName || '',
            territory: loadedData.territory || 'Uzbekistan'
          });
        } else {
          alert('Policy not found');
          navigate('/');
        }
      } else {
        setFormData(prev => ({ 
           ...prev, 
           policyNumber: `D/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}` 
        }));
      }
      setLoading(false);
    };
    loadData();
  }, [id, isEdit, navigate]);

  // Reactive Calculations
  useEffect(() => {
    const gross = formData.grossPremium || 0;
    const comm = formData.commissionPercent || 0; 
    const tax = formData.taxPercent || 0;
    const net = gross - (gross * comm / 100) - (gross * tax / 100);
    
    const cededPrem = formData.cededPremiumForeign || 0;
    const reinsComm = formData.reinsuranceCommission || 0; 
    const netReinsPayable = cededPrem - (cededPrem * reinsComm / 100);

    setFormData(prev => ({ 
        ...prev, 
        netPremium: net,
        netReinsurancePremium: netReinsPayable
    }));
  }, [formData.grossPremium, formData.commissionPercent, formData.taxPercent, formData.cededPremiumForeign, formData.reinsuranceCommission]);

  const handleChange = (e: { target: { name: string; value: string | boolean | number } }) => {
    const { name, value } = e.target;
    
    const numericFields = [
        'sumInsured', 'sumInsuredNational', 'grossPremium', 'premiumNationalCurrency', 
        'exchangeRate', 'commissionPercent', 'taxPercent', 'ourShare', 
        'limitForeignCurrency', 'limitNationalCurrency', 'excessForeignCurrency', 'prioritySum',
        'cededShare', 'cededPremiumForeign', 'reinsuranceCommission', 
        'premiumRate', 'warrantyPeriod', 'numberOfSlips',
        'treatyPremium', 'aicCommission', 'aicRetention', 'aicPremium', 'maxRetentionPerRisk',
        'sumReinsuredForeign', 'sumReinsuredNational', 'receivedPremiumForeign', 'receivedPremiumNational'
    ];
    
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (value === '' ? 0 : Number(value)) : value
    }));
  };

  const handleChannelChange = (newChannel: Channel) => {
      setFormData(prev => ({
          ...prev,
          channel: newChannel,
          policyNumber: `${newChannel === 'Direct' ? 'D' : 'IN'}/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`
      }));
  };

  const handleIntermediaryChange = (type: IntermediaryType) => {
      setFormData(prev => ({ ...prev, intermediaryType: type }));
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
        await DB.savePolicy(updatedData);
        navigate('/');
    } catch (error: any) { 
        console.error(error); 
        alert(`Failed to activate: ${error.message || 'Unknown error'}`);
    } finally { setProcessingAction(null); }
  };

  const handleNTU = async (e: React.MouseEvent) => {
    e.preventDefault();
    setProcessingAction('ntu');
    try {
        await DB.savePolicy({ ...formData, status: PolicyStatus.NTU });
        navigate('/');
    } catch (error: any) { console.error(error); alert(`Failed: ${error.message}`); } finally { setProcessingAction(null); }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    setProcessingAction('cancel');
    try {
        await DB.savePolicy({ ...formData, status: PolicyStatus.CANCELLED });
        navigate('/');
    } catch (error: any) { console.error(error); alert(`Failed: ${error.message}`); } finally { setProcessingAction(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingAction('save');
    try {
        await DB.savePolicy(formData);
        navigate('/');
    } catch (error: any) { 
        console.error(error); 
        alert(`Failed to save: ${error.message || 'Check console for details.'}`); 
    } finally { setProcessingAction(null); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const sectionTitleClass = "text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";
  const inputClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900";
  const selectClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-900";

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <form onSubmit={handleSubmit}>
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur border-b border-gray-200 py-4 mb-6 flex items-center justify-between -mx-4 px-4 md:-mx-8 md:px-8">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Policy' : 'New Policy Record'}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                       Ref: {formData.policyNumber} 
                       <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${formData.status === PolicyStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                           {formData.status}
                       </span>
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={!!processingAction}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-70"
                >
                    {processingAction === 'save' ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                    Save
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Left Column (Main Data) */}
            <div className="xl:col-span-8 space-y-6">
                
                {/* 1. Channel & Intermediary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><ArrowRightLeft size={18} className="text-blue-500"/> Business Channel & Source</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        {/* Channel Selector */}
                        <div>
                            <label className={labelClass}>Business Channel</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button type="button" onClick={() => handleChannelChange('Direct')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.channel === 'Direct' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                    Direct Insurance
                                </button>
                                <button type="button" onClick={() => handleChannelChange('Inward')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.channel === 'Inward' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>
                                    Inward Reinsurance
                                </button>
                            </div>
                        </div>

                         {/* Intermediary Selector */}
                        <div>
                            <label className={labelClass}>Intermediary Source</label>
                            <select 
                                value={formData.intermediaryType} 
                                onChange={(e) => handleIntermediaryChange(e.target.value as IntermediaryType)}
                                className={selectClass}
                            >
                                <option value="Direct">Direct Client (No Intermediary)</option>
                                <option value="Broker">Insurance Broker</option>
                                <option value="Agent">Insurance Agent</option>
                                <option value="MGA">MGA / Partner</option>
                            </select>
                        </div>
                    </div>

                    {/* Conditional Name Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formData.intermediaryType !== 'Direct' && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <SearchableInput 
                                    label={`${formData.intermediaryType} Name`} 
                                    name="intermediaryName" 
                                    value={formData.intermediaryName || ''} 
                                    options={INTERMEDIARIES} 
                                    onChange={handleChange} 
                                    placeholder={`Select or type ${formData.intermediaryType} name...`}
                                    required
                                />
                            </div>
                        )}
                        
                        {formData.channel === 'Inward' && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <label className={labelClass}>Cedant (Reinsured) Name</label>
                                <input type="text" name="cedantName" value={formData.cedantName || ''} onChange={handleChange} className={`${inputClass} border-purple-300 bg-purple-50`} placeholder="Company sending the risk"/>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Risk & Core Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><Building2 size={18} className="text-blue-500"/> Risk Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                             <SearchableInput 
                                label="Original Insured Name" 
                                name="insuredName" 
                                value={formData.insuredName || ''} 
                                options={[]}
                                onChange={handleChange} 
                                placeholder="The ultimate policyholder"
                                required
                            />
                        </div>

                        <SearchableInput 
                            label="Territory (Country)" 
                            name="territory" 
                            value={formData.territory || 'Uzbekistan'} 
                            options={COUNTRIES} 
                            onChange={handleChange} 
                        />
                        
                        <SearchableInput 
                            label="City / Region" 
                            name="city" 
                            value={formData.city || ''} 
                            options={UZBEK_REGIONS} 
                            onChange={handleChange} 
                        />

                        <div>
                            <label className={labelClass}>Industry / Business</label>
                            <input type="text" name="industry" value={formData.industry || ''} onChange={handleChange} className={inputClass}/>
                        </div>

                        <div>
                             <SearchableInput 
                                label="Type / Product" 
                                name="typeOfInsurance" 
                                value={formData.typeOfInsurance || ''} 
                                options={INSURANCE_TYPES} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SearchableInput 
                                label="Class of Insurance" 
                                name="classOfInsurance" 
                                value={formData.classOfInsurance || ''} 
                                options={INSURANCE_CLASSES} 
                                onChange={handleChange} 
                            />
                        </div>
                         
                        {/* New Risk Fields */}
                        <div>
                             <label className={labelClass}>Risk Code</label>
                             <input type="text" name="riskCode" value={formData.riskCode || ''} onChange={handleChange} className={inputClass} placeholder="e.g. 03.11"/>
                        </div>
                        <div>
                             <label className={labelClass}>Jurisdiction</label>
                             <input type="text" name="jurisdiction" value={formData.jurisdiction || 'Uzbekistan'} onChange={handleChange} className={inputClass}/>
                        </div>
                         <div className="md:col-span-2">
                             <label className={labelClass}>Insured Risk / Object</label>
                             <input type="text" name="insuredRisk" value={formData.insuredRisk || ''} onChange={handleChange} className={inputClass} placeholder="Detailed description of the risk"/>
                        </div>
                    </div>
                </div>

                {/* 3. Extended Parties */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><Users size={18} className="text-blue-500"/> Additional Parties</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div>
                            <label className={labelClass}>Insured Address</label>
                            <input type="text" name="insuredAddress" value={formData.insuredAddress || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                         <div>
                            <label className={labelClass}>Borrower (Loan)</label>
                            <input type="text" name="borrower" value={formData.borrower || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                         <div>
                            <label className={labelClass}>Retrocedent</label>
                            <input type="text" name="retrocedent" value={formData.retrocedent || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                         <div>
                            <label className={labelClass}>Performer</label>
                            <input type="text" name="performer" value={formData.performer || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                    </div>
                </div>
                
                {/* 4. Financials */}
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
                         <div>
                            <label className={labelClass}>Equivalent in USD</label>
                            <input type="number" name="equivalentUSD" value={formData.equivalentUSD || ''} onChange={handleChange} className={inputClass} placeholder="Auto or Manual"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                         {/* Foreign Currency */}
                         <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                             <h4 className="font-bold text-blue-800 text-xs uppercase tracking-wider mb-2">Values in {formData.currency}</h4>
                             <div>
                                <label className={labelClass}>Sum Insured (100%)</label>
                                <input type="number" name="sumInsured" value={formData.sumInsured} onChange={handleChange} className={inputClass}/>
                             </div>
                             <div>
                                <label className={labelClass}>Gross Premium (100%)</label>
                                <input type="number" name="grossPremium" value={formData.grossPremium} onChange={handleChange} className={inputClass}/>
                             </div>
                         </div>

                         {/* National Currency */}
                         <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                             <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Values in National Currency</h4>
                             <div>
                                <label className={labelClass}>Sum Insured (National)</label>
                                <input type="number" name="sumInsuredNational" value={formData.sumInsuredNational || ''} onChange={handleChange} className={inputClass}/>
                             </div>
                             <div>
                                <label className={labelClass}>Premium (National)</label>
                                <input type="number" name="premiumNationalCurrency" value={formData.premiumNationalCurrency || ''} onChange={handleChange} className={inputClass}/>
                             </div>
                         </div>
                    </div>

                     {/* Detailed Limits */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-100 pt-5">
                         <div>
                            <label className={labelClass}>Limit ({formData.currency})</label>
                            <input type="number" name="limitForeignCurrency" value={formData.limitForeignCurrency || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                         <div>
                            <label className={labelClass}>Limit (National)</label>
                            <input type="number" name="limitNationalCurrency" value={formData.limitNationalCurrency || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                         <div>
                            <label className={labelClass}>Excess ({formData.currency})</label>
                            <input type="number" name="excessForeignCurrency" value={formData.excessForeignCurrency || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                          <div>
                            <label className={labelClass}>Priority Sum</label>
                            <input type="number" name="prioritySum" value={formData.prioritySum || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                          <div>
                            <label className={labelClass}>Premium Rate (%)</label>
                            <input type="number" step="0.0001" name="premiumRate" value={formData.premiumRate || ''} onChange={handleChange} className={inputClass}/>
                         </div>
                     </div>
                </div>

                {/* 5. Income / Costs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><Briefcase size={18} className="text-blue-500"/> Income & Costs</h3>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                         <div>
                             <label className={labelClass}>Our Share (%)</label>
                             <input type="number" step="0.01" name="ourShare" value={formData.ourShare} onChange={handleChange} className={`${inputClass} font-bold text-blue-700`}/>
                         </div>
                         <div>
                             <label className={labelClass}>Commission %</label>
                             <input type="number" step="0.01" name="commissionPercent" value={formData.commissionPercent} onChange={handleChange} className={inputClass}/>
                         </div>
                         <div>
                             <label className={labelClass}>Tax %</label>
                             <input type="number" step="0.01" name="taxPercent" value={formData.taxPercent} onChange={handleChange} className={inputClass}/>
                         </div>
                         <div>
                             <label className={labelClass}>Net Premium</label>
                             <input type="number" readOnly value={formData.netPremium || 0} className={`${inputClass} bg-gray-100 font-bold`}/>
                         </div>
                     </div>
                </div>

                {/* 6. Treaty / Inward Specifics */}
                {formData.channel === 'Inward' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-purple-500">
                    <h3 className={sectionTitleClass}><Globe size={18} className="text-purple-500"/> Treaty & AIC Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                             <label className={labelClass}>Treaty Placement</label>
                             <input type="text" name="treatyPlacement" value={formData.treatyPlacement || ''} onChange={handleChange} className={inputClass}/>
                        </div>
                         <div>
                             <label className={labelClass}>Treaty Premium</label>
                             <input type="number" name="treatyPremium" value={formData.treatyPremium || ''} onChange={handleChange} className={inputClass}/>
                        </div>
                        <div>
                             <label className={labelClass}>Max Retention / Risk</label>
                             <input type="number" name="maxRetentionPerRisk" value={formData.maxRetentionPerRisk || ''} onChange={handleChange} className={inputClass}/>
                        </div>

                         <div>
                             <label className={labelClass}>AIC Commission</label>
                             <input type="number" name="aicCommission" value={formData.aicCommission || ''} onChange={handleChange} className={inputClass}/>
                        </div>
                         <div>
                             <label className={labelClass}>AIC Retention</label>
                             <input type="number" name="aicRetention" value={formData.aicRetention || ''} onChange={handleChange} className={inputClass}/>
                        </div>
                         <div>
                             <label className={labelClass}>AIC Premium</label>
                             <input type="number" name="aicPremium" value={formData.aicPremium || ''} onChange={handleChange} className={inputClass}/>
                        </div>
                    </div>
                </div>
                )}

                {/* 7. OUTWARD REINSURANCE */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-amber-400">
                     <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                         <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                             <ArrowRightLeft size={18} className="text-amber-500"/> Outward Reinsurance
                         </h3>
                         <div className="flex items-center gap-2">
                             <label className="text-sm font-medium text-gray-600">Applicable?</label>
                             <input 
                                type="checkbox" 
                                checked={formData.hasOutwardReinsurance || false} 
                                onChange={(e) => setFormData({...formData, hasOutwardReinsurance: e.target.checked})}
                                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                             />
                         </div>
                     </div>
                     
                     {formData.hasOutwardReinsurance ? (
                        <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Reinsurer / Retrocessionaire Name</label>
                                    <input type="text" name="reinsurerName" value={formData.reinsurerName || ''} onChange={handleChange} className={inputClass} placeholder="Who are we ceding to?"/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className={labelClass}>Ceded Share (%)</label>
                                        <div className="relative">
                                            <input type="number" name="cededShare" value={formData.cededShare || ''} onChange={handleChange} className={inputClass}/>
                                            <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Reins. Comm (%)</label>
                                        <div className="relative">
                                            <input type="number" name="reinsuranceCommission" value={formData.reinsuranceCommission || ''} onChange={handleChange} className={inputClass}/>
                                            <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-amber-50 p-4 rounded-lg">
                                 <div>
                                    <label className={labelClass}>Premium Ceded ({formData.currency})</label>
                                    <input type="number" name="cededPremiumForeign" value={formData.cededPremiumForeign || ''} onChange={handleChange} className={inputClass}/>
                                 </div>
                                 <div className="md:col-span-2">
                                    <label className={labelClass}>Net Payable to Reinsurer</label>
                                    <input type="number" readOnly value={formData.netReinsurancePremium || ''} className={`${inputClass} bg-amber-100 font-bold text-amber-900`}/>
                                 </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5 text-xs text-gray-600 border-t pt-4">
                                <div>
                                     <label className="block mb-1">Sum Reinsured ({formData.currency})</label>
                                     <input type="number" name="sumReinsuredForeign" value={formData.sumReinsuredForeign || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                                </div>
                                <div>
                                     <label className="block mb-1">Sum Reinsured (UZS)</label>
                                     <input type="number" name="sumReinsuredNational" value={formData.sumReinsuredNational || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                                </div>
                                 <div>
                                     <label className="block mb-1">Received Premium ({formData.currency})</label>
                                     <input type="number" name="receivedPremiumForeign" value={formData.receivedPremiumForeign || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                                </div>
                                 <div>
                                     <label className="block mb-1">Received Premium (UZS)</label>
                                     <input type="number" name="receivedPremiumNational" value={formData.receivedPremiumNational || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                                </div>
                            </div>
                        </div>
                     ) : (
                         <div className="text-sm text-gray-400 italic">No reinsurance ceded for this policy. Check the box to add details.</div>
                     )}
                </div>
            </div>

            {/* Right Column (Reference & Workflow) */}
            <div className="xl:col-span-4 space-y-6">
                
                {/* VALIDATION WORKFLOW */}
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
                            {formData.status}
                        </h3>

                        {formData.status === PolicyStatus.PENDING && (
                            <div className="space-y-4">
                                <div className="border-t border-dashed border-amber-200 pt-4">
                                    <label className="block text-sm font-bold text-amber-900 mb-2">
                                        Upload Signed Document
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer bg-white border border-amber-300 rounded-lg px-4 py-2 text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 text-sm">
                                            <Upload size={16} /> {selectedFile ? selectedFile.name : 'Select File...'}
                                            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={handleNTU}
                                        className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold transition-colors"
                                    >
                                        Mark NTU
                                    </button>
                                    
                                    <button 
                                        type="button" 
                                        onClick={handleActivate}
                                        disabled={!!processingAction}
                                        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        {processingAction === 'activate' ? <Loader2 className="animate-spin" size={16}/> : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {formData.status === PolicyStatus.ACTIVE && (
                             <div className="mt-4 pt-4 border-t border-green-200">
                                <button 
                                    onClick={handleCancel}
                                    type="button" 
                                    className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold flex items-center justify-center gap-2"
                                >
                                    <XCircle size={16}/> Cancel Policy
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* References */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={sectionTitleClass}><FileText size={18} className="text-blue-500"/> References & Dates</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Policy / Ref Number</label>
                            <input type="text" name="policyNumber" value={formData.policyNumber || ''} onChange={handleChange} className={`${inputClass} font-mono font-bold text-gray-700`}/>
                        </div>
                        <div>
                            <label className={labelClass}>Secondary Policy Ref</label>
                            <input type="text" name="secondaryPolicyNumber" value={formData.secondaryPolicyNumber || ''} onChange={handleChange} className={inputClass}/>
                        </div>

                        <div>
                            <label className={labelClass}>Agreement / Slip No</label>
                            <input type="text" name="agreementNumber" value={formData.agreementNumber || ''} onChange={handleChange} className={inputClass}/>
                        </div>
                        
                         <div>
                            <label className={labelClass}>Bordereau No</label>
                            <input type="text" name="bordereauNo" value={formData.bordereauNo || ''} onChange={handleChange} className={inputClass}/>
                        </div>

                         <div>
                            <label className={labelClass}>Cover Note Ref</label>
                            <input type="text" name="coverNote" value={formData.coverNote || ''} onChange={handleChange} className={inputClass}/>
                        </div>
                         
                         <div className="flex items-center gap-2 py-2">
                             <input type="checkbox" name="invoiceIssued" checked={formData.invoiceIssued || false} onChange={e => setFormData({...formData, invoiceIssued: e.target.checked})} />
                             <label className="text-sm">Invoice Issued?</label>
                         </div>
                        
                        <div className="grid grid-cols-2 gap-3 border-t pt-3">
                            <div>
                                <label className={labelClass}>Inception</label>
                                <input type="date" name="inceptionDate" value={formData.inceptionDate} onChange={handleChange} className={inputClass}/>
                            </div>
                             <div>
                                <label className={labelClass}>Expiry</label>
                                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={inputClass}/>
                            </div>
                             <div>
                                <label className={labelClass}>Date of Slip</label>
                                <input type="date" name="dateOfSlip" value={formData.dateOfSlip || ''} onChange={handleChange} className={inputClass}/>
                            </div>
                             <div>
                                <label className={labelClass}>Accounting Date</label>
                                <input type="date" name="accountingDate" value={formData.accountingDate || ''} onChange={handleChange} className={inputClass}/>
                            </div>
                            <div>
                                <label className={labelClass}>Payment Date</label>
                                <input type="date" name="paymentDate" value={formData.paymentDate || ''} onChange={handleChange} className={inputClass}/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                     <h3 className={sectionTitleClass}><ShieldCheck size={18} className="text-blue-500"/> Conditions</h3>
                     <label className={labelClass}>Deductible</label>
                     <textarea rows={2} name="deductible" value={formData.deductible || ''} onChange={handleChange} className={inputClass} placeholder="e.g. 10% of claim amount"></textarea>
                     
                     <label className={labelClass + ' mt-3'}>Warranty Period (Days)</label>
                     <input type="number" name="warrantyPeriod" value={formData.warrantyPeriod || ''} onChange={handleChange} className={inputClass}/>
                     
                     <label className={labelClass + ' mt-3'}>Number of Slips</label>
                     <input type="number" name="numberOfSlips" value={formData.numberOfSlips || ''} onChange={handleChange} className={inputClass}/>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
};

export default PolicyForm;
