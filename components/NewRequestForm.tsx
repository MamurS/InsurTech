import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { DB } from '../services/db';
import { LegalEntity, Currency, PolicyStatus, PaymentStatus } from '../types';
import { DatePickerInput, toISODateString, parseDate } from './DatePickerInput';
import { useToast } from '../context/ToastContext';
import {
  Search, ChevronDown, Building2, Loader2, Calendar,
  Shield, Users, Layers, DollarSign, Lock, Clock, Save, X, Globe, Check
} from 'lucide-react';

// ─── Insurance Classification (Uzbekistan) ──────────────────────
const INSURANCE_CLASSES: Record<string, string> = {
  '1': 'Accident',
  '2': 'Sickness',
  '3': 'Land Transport',
  '4': 'Railway',
  '5': 'Aviation',
  '6': 'Marine',
  '7': 'Goods in Transit',
  '8': 'Fire & Natural Disasters',
  '9': 'Property Damage',
  '10': 'Motor TPL',
  '11': 'Aviation Liability',
  '12': 'Marine Liability',
  '13': 'General Civil Liability',
  '14': 'Credit',
  '15': 'Suretyship',
  '16': 'Financial Risks',
  '17': 'Legal Expenses',
  '18': 'Health',
};

// ─── Full Country List ──────────────────────────────────────────
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia",
  "Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium",
  "Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria",
  "Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad",
  "Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic",
  "Côte d'Ivoire","DR Congo","Denmark","Djibouti","Dominica","Dominican Republic","East Timor","Ecuador",
  "Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland",
  "France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea",
  "Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq",
  "Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo",
  "Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania",
  "Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania",
  "Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique",
  "Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria",
  "North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama",
  "Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia",
  "Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa",
  "San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone",
  "Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
  "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Tajikistan","Tanzania",
  "Thailand","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu",
  "Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

// ─── Types ──────────────────────────────────────────────────────
interface InsuranceProduct {
  id: string;
  name: string;
  code: string;
  class_codes: string[];
  cover_sections: CoverSections | null;
  is_active: boolean;
}

interface CoverSections {
  sumInsured?: SumInsuredField[];
}

interface SumInsuredField {
  key: string;
  label: string;
  hasSubLimits?: boolean;
  subLimits?: { key: string; label: string }[];
  toggles?: { key: string; label: string }[];
}

interface FormData {
  // Section 1: Insured
  insuredName: string;
  insuredEntityId?: string;
  sector: string;
  insuredCountry: string;
  // Section 2: Cover
  productId?: string;
  productName: string;
  classCodes: string[];
  coverSections: CoverSections | null;
  // Section 3: Channel
  channel: 'Direct' | 'Broker' | 'Agent';
  intermediaryName: string;
  intermediaryEntityId?: string;
  // Section 4: Sums Insured
  currency: string;
  exchangeRate: number;
  sumInsuredAmounts: Record<string, number>;
  sumInsuredToggles: Record<string, boolean>;
  totalSumInsured: number;
  totalSumInsuredManual: boolean;
  // Section 5: Limit
  limitOfLiability: number;
  // Section 6: Period
  inceptionDate: string;
  expiryDate: string;
}

interface NewRequestFormProps {
  onSave: () => void;
  onCancel: () => void;
}

// ─── Section Card Wrapper ───────────────────────────────────────
const SectionCard: React.FC<{
  number: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ number, title, icon, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
        {number}
      </div>
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
    </div>
    <div className="px-5 py-4 space-y-4">
      {children}
    </div>
  </div>
);

// ─── Searchable Dropdown (strict selection only) ────────────────
// User types to filter, but MUST select from the dropdown list.
// Free-text is NOT allowed — this ensures data integrity.
const SearchableDropdown: React.FC<{
  label: string;
  value: string;
  options: { id: string; label: string; sublabel?: string; icon?: React.ReactNode }[];
  onSelect: (id: string, label: string) => void;
  onClear: () => void;
  required?: boolean;
  placeholder?: string;
  loading?: boolean;
  error?: string;
}> = ({ label, value, options, onSelect, onClear, required, placeholder, loading, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return options.slice(0, 50);
    const term = searchTerm.toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(term) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(term))
    ).slice(0, 50);
  }, [options, searchTerm]);

  const handleOpen = () => {
    setIsOpen(true);
    setSearchTerm('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Selected value display / click to open */}
      {!isOpen ? (
        <div
          onClick={handleOpen}
          className={`w-full p-2.5 bg-white border rounded-lg text-sm cursor-pointer flex items-center justify-between min-h-[42px] ${
            error ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          {value ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-slate-900">{value}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <span className="text-slate-400">{placeholder || 'Select...'}</span>
          )}
          <ChevronDown size={14} className="text-slate-400 shrink-0 ml-2" />
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder || 'Type to filter...'}
            autoComplete="off"
            className="w-full p-2.5 bg-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 pr-8"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          </div>
        </div>
      )}

      {/* Dropdown list */}
      {isOpen && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {filtered.length > 0 ? filtered.map(opt => (
            <li
              key={opt.id}
              onClick={() => {
                onSelect(opt.id, opt.label);
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-2 ${
                opt.label === value ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50'
              }`}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">{opt.label}</div>
                {opt.sublabel && <div className="text-xs text-slate-500 truncate">{opt.sublabel}</div>}
              </div>
              {opt.label === value && <Check size={14} className="text-blue-600 shrink-0 ml-auto" />}
            </li>
          )) : (
            <li className="px-3 py-3 text-sm text-slate-500 text-center">
              {loading ? 'Loading...' : 'No results found'}
            </li>
          )}
        </ul>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

// ─── Product Search (strict selection, loads all products) ──────
const ProductSearch: React.FC<{
  value: string;
  onSelect: (product: InsuranceProduct) => void;
  onClear: () => void;
  error?: string;
}> = ({ value, onSelect, onClear, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all active products once
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from('insurance_products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setAllProducts((data as InsuranceProduct[]) || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return allProducts;
    const term = searchTerm.toLowerCase();
    return allProducts.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term)
    );
  }, [searchTerm, allProducts]);

  const handleOpen = () => {
    setIsOpen(true);
    setSearchTerm('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">
        Type of Insurance Cover <span className="text-red-500">*</span>
      </label>

      {!isOpen ? (
        <div
          onClick={handleOpen}
          className={`w-full p-2.5 bg-white border rounded-lg text-sm cursor-pointer flex items-center justify-between min-h-[42px] ${
            error ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          {value ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-slate-900">{value}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <span className="text-slate-400">Select insurance product...</span>
          )}
          <ChevronDown size={14} className="text-slate-400 shrink-0 ml-2" />
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to filter products..."
            autoComplete="off"
            className="w-full p-2.5 bg-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 pr-8"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          </div>
        </div>
      )}

      {isOpen && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {filtered.length > 0 ? filtered.map(p => (
            <li
              key={p.id}
              onClick={() => {
                onSelect(p);
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 ${
                p.name === value ? 'bg-blue-50' : 'hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.code} · Classes: {(p.class_codes || []).join(', ')}
                  </div>
                </div>
                {p.name === value && <Check size={14} className="text-blue-600 shrink-0" />}
              </div>
            </li>
          )) : (
            <li className="px-3 py-3 text-sm text-slate-500 text-center">
              {loading ? 'Loading products...' : 'No products found'}
            </li>
          )}
        </ul>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────
export const NewRequestForm: React.FC<NewRequestFormProps> = ({ onSave, onCancel }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormData>({
    insuredName: '',
    sector: '',
    insuredCountry: '',
    productName: '',
    classCodes: [],
    coverSections: null,
    channel: 'Direct',
    intermediaryName: '',
    currency: 'USD',
    exchangeRate: 1,
    sumInsuredAmounts: {},
    sumInsuredToggles: {},
    totalSumInsured: 0,
    totalSumInsuredManual: false,
    limitOfLiability: 0,
    inceptionDate: '',
    expiryDate: '',
  });

  const [fxDisplay, setFxDisplay] = useState('');

  // ─── Entity data for dropdowns ──────────────────────────────
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);

  useEffect(() => {
    DB.getLegalEntities().then(data => {
      setEntities(data);
      setEntitiesLoading(false);
    }).catch(() => setEntitiesLoading(false));
  }, []);

  // Build entity dropdown options
  const insuredOptions = useMemo(() =>
    entities.map(e => ({
      id: e.id,
      label: e.fullName,
      sublabel: e.shortName || undefined,
      icon: <Building2 size={14} className="text-slate-400" />,
    })), [entities]);

  const intermediaryOptions = useMemo(() =>
    entities
      .filter(e => e.type === form.channel)
      .map(e => ({
        id: e.id,
        label: e.fullName,
        sublabel: e.shortName || undefined,
        icon: <Building2 size={14} className="text-slate-400" />,
      })), [entities, form.channel]);

  // Country dropdown options
  const countryOptions = useMemo(() =>
    COUNTRIES.map(c => ({
      id: c,
      label: c,
      icon: <Globe size={14} className="text-slate-400" />,
    })), []);

  // Fetch exchange rate when currency changes
  useEffect(() => {
    if (!supabase || form.currency === 'UZS') {
      setForm(f => ({ ...f, exchangeRate: 1 }));
      setFxDisplay('');
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('fx_rates')
          .select('rate')
          .eq('currency', form.currency)
          .order('date', { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          const rate = Number(data[0].rate);
          setForm(f => ({ ...f, exchangeRate: rate }));
          setFxDisplay(`1 ${form.currency} = ${rate.toLocaleString('en-US', { maximumFractionDigits: 2 })} UZS`);
        } else {
          setFxDisplay('Rate not found');
        }
      } catch {
        setFxDisplay('Rate lookup failed');
      }
    })();
  }, [form.currency]);

  // Auto-calculate total sum insured
  useEffect(() => {
    if (form.totalSumInsuredManual) return;
    const fields = form.coverSections?.sumInsured || [];
    let total = 0;
    for (const field of fields) {
      total += form.sumInsuredAmounts[field.key] || 0;
      if (field.toggles) {
        for (const toggle of field.toggles) {
          if (form.sumInsuredToggles[toggle.key]) {
            total += form.sumInsuredAmounts[toggle.key] || 0;
          }
        }
      }
    }
    setForm(f => ({ ...f, totalSumInsured: total }));
  }, [form.sumInsuredAmounts, form.sumInsuredToggles, form.coverSections, form.totalSumInsuredManual]);

  // Duration calculation
  const durationDays = (() => {
    if (!form.inceptionDate || !form.expiryDate) return null;
    const d1 = new Date(form.inceptionDate);
    const d2 = new Date(form.expiryDate);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  })();

  const updateForm = (updates: Partial<FormData>) => setForm(f => ({ ...f, ...updates }));
  const setAmount = (key: string, val: number) => setForm(f => ({ ...f, sumInsuredAmounts: { ...f.sumInsuredAmounts, [key]: val } }));
  const setToggle = (key: string, val: boolean) => setForm(f => ({ ...f, sumInsuredToggles: { ...f.sumInsuredToggles, [key]: val } }));

  // ─── Handlers ───────────────────────────────────────────────
  const handleInsuredSelect = (entityId: string, _label: string) => {
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;
    updateForm({
      insuredName: entity.fullName,
      insuredEntityId: entity.id,
      sector: entity.lineOfBusiness || '',
      insuredCountry: entity.country || '',
    });
  };

  const handleProductSelect = (product: InsuranceProduct) => {
    updateForm({
      productId: product.id,
      productName: product.name,
      classCodes: product.class_codes || [],
      coverSections: product.cover_sections as CoverSections | null,
      sumInsuredAmounts: {},
      sumInsuredToggles: {},
      totalSumInsured: 0,
      totalSumInsuredManual: false,
    });
  };

  const handleIntermediarySelect = (entityId: string, _label: string) => {
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;
    updateForm({
      intermediaryName: entity.fullName,
      intermediaryEntityId: entity.id,
    });
  };

  // ─── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.insuredEntityId) newErrors.insuredName = 'Please select an insured from the list';
    if (!form.productId) newErrors.productName = 'Please select a product from the list';
    if (!form.inceptionDate) newErrors.inceptionDate = 'Required';
    if (!form.expiryDate) newErrors.expiryDate = 'Required';
    if ((form.channel === 'Broker' || form.channel === 'Agent') && !form.intermediaryEntityId) {
      newErrors.intermediaryName = 'Please select from the list';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill in all required fields');
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      if (!supabase) throw new Error('Database not connected');

      const policyData = {
        insuredName: form.insuredName,
        insuredCountry: form.insuredCountry,
        industry: form.sector,
        classOfInsurance: form.classCodes.join(', '),
        typeOfInsurance: form.productName,
        channel: form.channel === 'Direct' ? 'Direct' : 'Direct',
        intermediaryType: form.channel,
        intermediaryName: form.channel !== 'Direct' ? form.intermediaryName : null,
        currency: form.currency,
        exchangeRate: form.exchangeRate,
        sumInsured: form.totalSumInsured,
        sumInsuredNational: form.totalSumInsured * form.exchangeRate,
        limitForeignCurrency: form.limitOfLiability,
        limitNationalCurrency: form.limitOfLiability * form.exchangeRate,
        inceptionDate: form.inceptionDate,
        expiryDate: form.expiryDate,
        status: PolicyStatus.DRAFT,
        paymentStatus: PaymentStatus.PENDING,
        recordType: 'Direct',
        ourShare: 100,
        isDeleted: false,
      };

      const { error } = await supabase.from('policies').insert(policyData);
      if (error) throw error;

      toast.success('Request saved as draft');
      onSave();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ─── Amount Input with proper currency badge ────────────────
  const AmountInput: React.FC<{ label: string; amountKey: string; indent?: boolean }> = ({ label, amountKey, indent }) => (
    <div className={`flex items-center gap-3 ${indent ? 'ml-6' : ''}`}>
      {indent && <span className="text-slate-300 text-xs">├</span>}
      <label className="text-sm text-slate-600 w-48 shrink-0">{label}</label>
      <div className="relative flex-1 max-w-xs">
        <input
          type="text"
          inputMode="numeric"
          value={form.sumInsuredAmounts[amountKey] ? Number(form.sumInsuredAmounts[amountKey]).toLocaleString('en-US') : ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, '');
            setAmount(amountKey, Number(raw) || 0);
          }}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          placeholder="0"
          className="w-full p-2 pr-16 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded select-none pointer-events-none">
          {form.currency}
        </span>
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────
  const sumInsuredFields = form.coverSections?.sumInsured || [];

  return (
    <div className="space-y-5 pb-24">
      {/* Section 1: Insured Party */}
      <SectionCard number={1} title="Insured Party" icon={<Users size={16} />}>
        <SearchableDropdown
          label="Insured Name"
          value={form.insuredName}
          options={insuredOptions}
          onSelect={handleInsuredSelect}
          onClear={() => updateForm({ insuredName: '', insuredEntityId: undefined, sector: '', insuredCountry: '' })}
          required
          placeholder="Search for insured entity..."
          loading={entitiesLoading}
          error={errors.insuredName}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Sector / Industry</label>
            <input
              type="text"
              value={form.sector}
              onChange={(e) => updateForm({ sector: e.target.value })}
              placeholder="e.g. Oil & Gas, Agriculture..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <SearchableDropdown
            label="Country"
            value={form.insuredCountry}
            options={countryOptions}
            onSelect={(_id, label) => updateForm({ insuredCountry: label })}
            onClear={() => updateForm({ insuredCountry: '' })}
            placeholder="Select country..."
          />
        </div>
      </SectionCard>

      {/* Section 2: Insurance Cover */}
      <SectionCard number={2} title="Insurance Cover" icon={<Shield size={16} />}>
        <ProductSearch
          value={form.productName}
          onSelect={handleProductSelect}
          onClear={() => updateForm({ productName: '', productId: undefined, classCodes: [], coverSections: null })}
          error={errors.productName}
        />

        {form.classCodes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Class of Insurance</label>
            <div className="flex flex-wrap gap-2">
              {form.classCodes.map(code => (
                <span key={code} className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                  Class {code} — {INSURANCE_CLASSES[code] || 'Unknown'}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 3: Channel & Intermediary */}
      <SectionCard number={3} title="Channel & Intermediary" icon={<Layers size={16} />}>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Channel <span className="text-red-500">*</span>
          </label>
          <select
            value={form.channel}
            onChange={(e) => updateForm({ channel: e.target.value as any, intermediaryName: '', intermediaryEntityId: undefined })}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="Direct">Direct</option>
            <option value="Broker">Broker</option>
            <option value="Agent">Agent</option>
          </select>
        </div>

        {(form.channel === 'Broker' || form.channel === 'Agent') && (
          <SearchableDropdown
            label={`${form.channel} Name`}
            value={form.intermediaryName}
            options={intermediaryOptions}
            onSelect={handleIntermediarySelect}
            onClear={() => updateForm({ intermediaryName: '', intermediaryEntityId: undefined })}
            required
            placeholder={`Search for ${form.channel.toLowerCase()}...`}
            loading={entitiesLoading}
            error={errors.intermediaryName}
          />
        )}
      </SectionCard>

      {/* Section 4: Sums Insured */}
      <SectionCard number={4} title="Sums Insured" icon={<DollarSign size={16} />}>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => updateForm({ currency: e.target.value })}
              className="p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[100px]"
            >
              {Object.values(Currency).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {fxDisplay && (
            <div className="mt-5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Exchange rate: {fxDisplay}
            </div>
          )}
        </div>

        {sumInsuredFields.length > 0 ? (
          <div className="space-y-3 mt-2">
            {sumInsuredFields.map(field => (
              <div key={field.key} className="space-y-2">
                <AmountInput label={field.label} amountKey={field.key} />

                {/* Toggles (e.g. Business Interruption) */}
                {field.toggles?.map(toggle => (
                  <div key={toggle.key} className="ml-6 space-y-1">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.sumInsuredToggles[toggle.key] || false}
                        onChange={(e) => setToggle(toggle.key, e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {toggle.label}
                    </label>
                    {form.sumInsuredToggles[toggle.key] && (
                      <AmountInput label={toggle.label} amountKey={toggle.key} indent />
                    )}
                  </div>
                ))}

                {/* Sub-limits (e.g. Buildings, Machinery) */}
                {field.hasSubLimits && field.subLimits?.map(sub => (
                  <AmountInput key={sub.key} label={sub.label} amountKey={sub.key} indent />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600 w-48 shrink-0">Sum Insured</label>
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                inputMode="numeric"
                value={form.totalSumInsured ? Number(form.totalSumInsured).toLocaleString('en-US') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  updateForm({ totalSumInsured: Number(raw) || 0, totalSumInsuredManual: true });
                }}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                placeholder="0"
                className="w-full p-2 pr-16 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded select-none pointer-events-none">
                {form.currency}
              </span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
          <label className="text-sm font-semibold text-slate-700 w-48 shrink-0">Total Sum Insured</label>
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              inputMode="numeric"
              value={form.totalSumInsured ? Number(form.totalSumInsured).toLocaleString('en-US') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                updateForm({ totalSumInsured: Number(raw) || 0, totalSumInsuredManual: true });
              }}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              className="w-full p-2 pr-16 border-2 border-blue-200 bg-blue-50/50 rounded-lg text-sm text-right font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded select-none pointer-events-none">
              {form.currency}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Section 5: Limit of Liability */}
      <SectionCard number={5} title="Limit of Liability" icon={<Lock size={16} />}>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600 w-48 shrink-0">Limit of Liability</label>
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              inputMode="numeric"
              value={form.limitOfLiability ? Number(form.limitOfLiability).toLocaleString('en-US') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                updateForm({ limitOfLiability: Number(raw) || 0 });
              }}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              placeholder="0"
              className="w-full p-2 pr-16 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded select-none pointer-events-none">
              {form.currency}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Section 6: Insurance Period */}
      <SectionCard number={6} title="Insurance Period" icon={<Clock size={16} />}>
        <div className="grid grid-cols-3 gap-4">
          <DatePickerInput
            label="Inception Date"
            value={parseDate(form.inceptionDate)}
            onChange={(d) => updateForm({ inceptionDate: toISODateString(d) || '' })}
            required
          />
          <DatePickerInput
            label="Expiry Date"
            value={parseDate(form.expiryDate)}
            onChange={(d) => updateForm({ expiryDate: toISODateString(d) || '' })}
            required
            minDate={parseDate(form.inceptionDate) || undefined}
          />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Duration</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
              {durationDays ? `${durationDays} days` : '—'}
            </div>
          </div>
        </div>
        {errors.inceptionDate && <p className="text-red-500 text-xs">{errors.inceptionDate}</p>}
        {errors.expiryDate && <p className="text-red-500 text-xs">{errors.expiryDate}</p>}
      </SectionCard>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {form.productName && <span>Product: {form.productName}</span>}
            {form.totalSumInsured > 0 && <span className="ml-4">Total SI: {form.totalSumInsured.toLocaleString()} {form.currency}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
