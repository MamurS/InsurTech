import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  InwardReinsurance,
  InwardReinsuranceOrigin,
  InwardReinsuranceType,
  InwardReinsuranceStructure,
  InwardReinsuranceStatus,
  InwardReinsurancePreset,
  Currency
} from '../types';
import { useToast } from '../context/ToastContext';
import { EntitySearchInput } from '../components/EntitySearchInput';
import { DatePickerInput, toISODateString } from '../components/DatePickerInput';
import { SegmentedControl } from '../components/SegmentedControl';
import { FormContextBar } from '../components/FormContextBar';
import {
  ArrowLeft, FileSpreadsheet, Building, Hash, DollarSign,
  Globe, Home, Layers, ArrowDownRight, Calendar, Percent, FileText,
  ChevronDown, ChevronUp, User
} from 'lucide-react';

// Collapsible Section Component
interface FormSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
          {icon}
          {title}
        </div>
        {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-4 pt-0 border-t border-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
};

const InwardReinsuranceForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Determine origin from URL path
  const pathOrigin: InwardReinsuranceOrigin = location.pathname.includes('/foreign') ? 'FOREIGN' : 'DOMESTIC';

  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'unsaved' | 'saving' | 'saved'>('unsaved');

  // Tab states
  const [activeType, setActiveType] = useState<InwardReinsuranceType>('FAC');
  const [activeStructure, setActiveStructure] = useState<InwardReinsuranceStructure>('PROPORTIONAL');

  // Preset data
  const [typeOfCoverOptions, setTypeOfCoverOptions] = useState<InwardReinsurancePreset[]>([]);
  const [classOfCoverOptions, setClassOfCoverOptions] = useState<InwardReinsurancePreset[]>([]);
  const [industryOptions, setIndustryOptions] = useState<InwardReinsurancePreset[]>([]);

  // Migration state
  const [migrationRequired, setMigrationRequired] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<InwardReinsurance>>({
    id: crypto.randomUUID(),
    contractNumber: '',
    origin: pathOrigin,
    type: 'FAC',
    structure: 'PROPORTIONAL',
    status: 'DRAFT',
    cedantName: '',
    brokerName: '',
    inceptionDate: '',
    expiryDate: '',
    typeOfCover: '',
    classOfCover: '',
    industry: '',
    territory: '',
    originalInsuredName: '',
    riskDescription: '',
    currency: Currency.USD,
    limitOfLiability: 0,
    deductible: 0,
    retention: 0,
    ourShare: 100,
    grossPremium: 0,
    commissionPercent: 0,
    netPremium: 0,
    minimumPremium: 0,
    depositPremium: 0,
    adjustablePremium: false,
    treatyName: '',
    treatyNumber: '',
    layerNumber: 1,
    excessPoint: 0,
    aggregateLimit: 0,
    aggregateDeductible: 0,
    reinstatements: 0,
    reinstatementPremium: 0,
    notes: '',
    uwYear: new Date().getFullYear()
  });

  // Helper function to check migration errors
  const checkMigrationError = (error: any): boolean => {
    const errorStr = JSON.stringify(error);
    return (
      error?.code === 'PGRST205' ||
      error?.code === '42P01' ||
      error?.status === 404 ||
      error?.statusCode === 404 ||
      error?.message?.includes('inward_reinsurance') ||
      error?.message?.includes('schema cache') ||
      error?.message?.includes('does not exist') ||
      errorStr?.includes('PGRST205') ||
      errorStr?.includes('inward_reinsurance') ||
      errorStr?.includes('schema cache')
    );
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      await loadPresets();

      if (isEdit && id) {
        const contract = await loadContract(id);
        if (contract) {
          setFormData(contract);
          setActiveType(contract.type);
          setActiveStructure(contract.structure);
        } else {
          toast.error('Contract not found');
          navigate(`/inward-reinsurance/${pathOrigin.toLowerCase()}`);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id, isEdit, pathOrigin]);

  // Update origin when path changes
  useEffect(() => {
    if (!isEdit) {
      setFormData(prev => ({ ...prev, origin: pathOrigin }));
    }
  }, [pathOrigin, isEdit]);

  // Load presets from database
  const loadPresets = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('inward_reinsurance_presets')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          if (checkMigrationError(error)) {
            setMigrationRequired(true);
          }
          console.error('Failed to load presets:', error);
          return;
        }

        if (data) {
          setTypeOfCoverOptions(data.filter(p => p.category === 'TYPE_OF_COVER'));
          setClassOfCoverOptions(data.filter(p => p.category === 'CLASS_OF_COVER'));
          setIndustryOptions(data.filter(p => p.category === 'INDUSTRY'));
        }
      }
    } catch (err: any) {
      console.error('Failed to load presets:', err);
      if (checkMigrationError(err)) {
        setMigrationRequired(true);
      }
    }
  };

  // Load contract from database
  const loadContract = async (contractId: string): Promise<InwardReinsurance | null> => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('inward_reinsurance')
          .select('*')
          .eq('id', contractId)
          .single();

        if (error) {
          if (checkMigrationError(error)) {
            setMigrationRequired(true);
          }
          console.error('Failed to load contract:', error);
          return null;
        }

        if (data) {
          return {
            id: data.id,
            contractNumber: data.contract_number,
            origin: data.origin,
            type: data.type,
            structure: data.structure,
            status: data.status,
            cedantName: data.cedant_name,
            cedantEntityId: data.cedant_entity_id,
            cedantCountry: data.cedant_country,
            brokerName: data.broker_name,
            brokerEntityId: data.broker_entity_id,
            inceptionDate: data.inception_date,
            expiryDate: data.expiry_date,
            uwYear: data.uw_year,
            typeOfCover: data.type_of_cover,
            classOfCover: data.class_of_cover,
            industry: data.industry,
            territory: data.territory,
            originalInsuredName: data.original_insured_name,
            riskDescription: data.risk_description,
            currency: data.currency,
            limitOfLiability: data.limit_of_liability,
            deductible: data.deductible,
            retention: data.retention,
            ourShare: data.our_share,
            grossPremium: data.gross_premium,
            commissionPercent: data.commission_percent,
            netPremium: data.net_premium,
            minimumPremium: data.minimum_premium,
            depositPremium: data.deposit_premium,
            adjustablePremium: data.adjustable_premium,
            treatyName: data.treaty_name,
            treatyNumber: data.treaty_number,
            layerNumber: data.layer_number,
            excessPoint: data.excess_point,
            aggregateLimit: data.aggregate_limit,
            aggregateDeductible: data.aggregate_deductible,
            reinstatements: data.reinstatements,
            reinstatementPremium: data.reinstatement_premium,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            createdBy: data.created_by,
            isDeleted: data.is_deleted
          };
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to load contract:', err);
      return null;
    }
  };

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              type === 'number' ? Number(value) : value
    }));
    setSaveState('unsaved');
  };

  // Handle type change
  const handleTypeChange = (type: string) => {
    setActiveType(type as InwardReinsuranceType);
    setFormData(prev => ({ ...prev, type: type as InwardReinsuranceType }));
    setSaveState('unsaved');
  };

  // Handle structure change
  const handleStructureChange = (structure: string) => {
    setActiveStructure(structure as InwardReinsuranceStructure);
    setFormData(prev => ({ ...prev, structure: structure as InwardReinsuranceStructure }));
    setSaveState('unsaved');
  };

  // Calculate net premium
  useEffect(() => {
    const gross = formData.grossPremium || 0;
    const commission = formData.commissionPercent || 0;
    const net = gross * (1 - commission / 100);
    setFormData(prev => ({ ...prev, netPremium: Math.round(net * 100) / 100 }));
  }, [formData.grossPremium, formData.commissionPercent]);

  // Handle form submit
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setSaveState('saving');

    try {
      const now = new Date().toISOString();
      const dataToSave = {
        id: formData.id,
        contract_number: formData.contractNumber,
        origin: pathOrigin,
        type: activeType,
        structure: activeType === 'TREATY' ? activeStructure : 'PROPORTIONAL',
        status: formData.status || 'DRAFT',
        cedant_name: formData.cedantName,
        cedant_entity_id: formData.cedantEntityId || null,
        cedant_country: formData.cedantCountry || null,
        broker_name: formData.brokerName || null,
        broker_entity_id: formData.brokerEntityId || null,
        inception_date: formData.inceptionDate,
        expiry_date: formData.expiryDate,
        uw_year: formData.uwYear,
        type_of_cover: formData.typeOfCover,
        class_of_cover: formData.classOfCover,
        industry: formData.industry || null,
        territory: formData.territory || null,
        original_insured_name: activeType === 'FAC' ? formData.originalInsuredName : null,
        risk_description: formData.riskDescription || null,
        currency: formData.currency,
        limit_of_liability: formData.limitOfLiability,
        deductible: formData.deductible || null,
        retention: formData.retention || null,
        our_share: formData.ourShare,
        gross_premium: formData.grossPremium,
        commission_percent: formData.commissionPercent || null,
        net_premium: formData.netPremium || null,
        minimum_premium: formData.minimumPremium || null,
        deposit_premium: formData.depositPremium || null,
        adjustable_premium: formData.adjustablePremium || false,
        treaty_name: activeType === 'TREATY' ? formData.treatyName : null,
        treaty_number: activeType === 'TREATY' ? formData.treatyNumber : null,
        layer_number: activeType === 'TREATY' && activeStructure === 'NON_PROPORTIONAL' ? formData.layerNumber : null,
        excess_point: activeType === 'TREATY' && activeStructure === 'NON_PROPORTIONAL' ? formData.excessPoint : null,
        aggregate_limit: activeType === 'TREATY' && activeStructure === 'NON_PROPORTIONAL' ? formData.aggregateLimit : null,
        aggregate_deductible: activeType === 'TREATY' && activeStructure === 'NON_PROPORTIONAL' ? formData.aggregateDeductible : null,
        reinstatements: activeType === 'TREATY' && activeStructure === 'NON_PROPORTIONAL' ? formData.reinstatements : null,
        reinstatement_premium: activeType === 'TREATY' && activeStructure === 'NON_PROPORTIONAL' ? formData.reinstatementPremium : null,
        notes: formData.notes || null,
        updated_at: now,
        is_deleted: false
      };

      if (!isEdit) {
        (dataToSave as any).created_at = now;
      }

      if (supabase) {
        if (isEdit) {
          const { error } = await supabase
            .from('inward_reinsurance')
            .update(dataToSave)
            .eq('id', formData.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('inward_reinsurance')
            .insert([dataToSave]);

          if (error) throw error;
        }
      }

      toast.success(isEdit ? 'Contract updated successfully!' : 'Contract created successfully!');
      setSaveState('saved');
      navigate(`/inward-reinsurance/${pathOrigin.toLowerCase()}`);
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveState('unsaved');
      if (checkMigrationError(err)) {
        setMigrationRequired(true);
        toast.error('Database tables not found. Please run the migration script.');
      } else {
        toast.error('Failed to save: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  // Show migration required message
  if (migrationRequired) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => navigate(`/inward-reinsurance/${pathOrigin.toLowerCase()}`)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {pathOrigin === 'FOREIGN' ? 'Foreign' : 'Domestic'} Inward Reinsurance
          </h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-800">Database Setup Required</h3>
              <p className="text-amber-700 mt-1">
                The Inward Reinsurance tables have not been created in the database yet.
              </p>
              <p className="text-amber-600 mt-2 text-sm">
                To use this feature, please run the migration script in your Supabase SQL Editor:
              </p>
              <code className="block mt-2 p-3 bg-amber-100 rounded-lg text-sm text-amber-900 font-mono">
                supabase_inward_reinsurance_migration.sql
              </code>
              <p className="text-amber-600 mt-3 text-sm">
                You can find this file in the root directory of the project.
              </p>
              <button
                onClick={() => { setMigrationRequired(false); window.location.reload(); }}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
              >
                Retry After Running Migration
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Priority currencies
  const priorityCurrencies = ['UZS', 'USD', 'EUR'];
  const allCurrencies = Object.values(Currency);
  const sortedCurrencies = [
    ...priorityCurrencies,
    ...allCurrencies.filter(c => !priorityCurrencies.includes(c)).sort()
  ];

  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
  const inputClass = "w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-slate-900";
  const selectClass = "w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-slate-900";

  // Breadcrumb items
  const breadcrumbs = [
    { label: 'Inward Reinsurance', href: `/inward-reinsurance/${pathOrigin.toLowerCase()}` },
    { label: activeType === 'FAC' ? 'Facultative' : 'Treaty' },
    { label: isEdit ? (formData.contractNumber || 'Edit Contract') : 'New Contract' }
  ];

  return (
    <div className="pb-20">
      <form onSubmit={handleSubmit}>
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => navigate(`/inward-reinsurance/${pathOrigin.toLowerCase()}`)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isEdit ? 'Edit' : 'New'} {pathOrigin === 'FOREIGN' ? 'Foreign' : 'Domestic'} Inward Reinsurance
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
              {pathOrigin === 'FOREIGN' ? <Globe size={12} /> : <Home size={12} />}
              {pathOrigin === 'FOREIGN' ? 'Overseas/International' : 'Domestic'} Contract
            </p>
          </div>
        </div>

        {/* Sticky Context Bar */}
        <FormContextBar
          status={(formData.status as InwardReinsuranceStatus) || 'DRAFT'}
          breadcrumbs={breadcrumbs}
          uwYear={formData.uwYear}
          saveState={saveState}
          onSave={() => handleSubmit()}
          saving={saving}
          className="mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6"
        />

        {/* Contract Information Section */}
        <FormSection
          title="Contract Information"
          icon={<FileSpreadsheet size={16} />}
          className="mb-4"
        >
          {/* Compact Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <SegmentedControl
              label="Contract Type"
              options={[
                { value: 'FAC', label: 'Facultative' },
                { value: 'TREATY', label: 'Treaty' }
              ]}
              value={activeType}
              onChange={handleTypeChange}
              size="md"
            />

            {/* Structure - Only visible for Treaty */}
            <div className={`transition-all duration-300 ${activeType === 'TREATY' ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <SegmentedControl
                label="Structure"
                options={[
                  { value: 'PROPORTIONAL', label: 'Prop' },
                  { value: 'NON_PROPORTIONAL', label: 'Non-Prop' }
                ]}
                value={activeStructure}
                onChange={handleStructureChange}
                size="md"
                disabled={activeType !== 'TREATY'}
              />
            </div>

            <div>
              <label className={labelClass}>
                Contract Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="contractNumber"
                  value={formData.contractNumber}
                  onChange={handleChange}
                  required
                  placeholder="IR-2026-001"
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>UW Year</label>
              <input
                type="number"
                name="uwYear"
                value={formData.uwYear}
                onChange={handleChange}
                min={2000}
                max={2100}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </FormSection>

        {/* Treaty Details - Only for Treaty */}
        <div className={`transition-all duration-300 ease-in-out ${
          activeType === 'TREATY' ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0 overflow-hidden mb-0'
        }`}>
          <FormSection
            title="Treaty Details"
            icon={<Layers size={16} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Treaty Name</label>
                <input
                  type="text"
                  name="treatyName"
                  value={formData.treatyName}
                  onChange={handleChange}
                  placeholder="e.g., Property Quota Share 2026"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Treaty Number</label>
                <input
                  type="text"
                  name="treatyNumber"
                  value={formData.treatyNumber}
                  onChange={handleChange}
                  placeholder="e.g., TRT-2026-001"
                  className={inputClass}
                />
              </div>
            </div>
          </FormSection>
        </div>

        {/* Cedant / Source Information */}
        <FormSection
          title="Cedant / Source Information"
          icon={<Building size={16} />}
          className="mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EntitySearchInput
              label="Cedant Name"
              value={formData.cedantName || ''}
              onChange={(name, entityId) => {
                setFormData(prev => ({
                  ...prev,
                  cedantName: name,
                  cedantEntityId: entityId
                }));
                setSaveState('unsaved');
              }}
              placeholder="Search for cedant entity..."
              required
            />
            <EntitySearchInput
              label="Broker (if applicable)"
              value={formData.brokerName || ''}
              onChange={(name, entityId) => {
                setFormData(prev => ({
                  ...prev,
                  brokerName: name,
                  brokerEntityId: entityId
                }));
                setSaveState('unsaved');
              }}
              placeholder="Search for broker entity..."
            />
            {pathOrigin === 'FOREIGN' && (
              <div>
                <label className={labelClass}>Cedant Country</label>
                <input
                  type="text"
                  name="cedantCountry"
                  value={formData.cedantCountry || ''}
                  onChange={handleChange}
                  placeholder="e.g., United Kingdom"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </FormSection>

        {/* Contract Period */}
        <FormSection
          title="Contract Period"
          icon={<Calendar size={16} />}
          className="mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePickerInput
              label="Inception Date"
              value={formData.inceptionDate ? new Date(formData.inceptionDate) : null}
              onChange={(date) => {
                setFormData(prev => ({ ...prev, inceptionDate: toISODateString(date) || '' }));
                setSaveState('unsaved');
              }}
              required
            />
            <DatePickerInput
              label="Expiry Date"
              value={formData.expiryDate ? new Date(formData.expiryDate) : null}
              onChange={(date) => {
                setFormData(prev => ({ ...prev, expiryDate: toISODateString(date) || '' }));
                setSaveState('unsaved');
              }}
              required
            />
          </div>
        </FormSection>

        {/* Coverage Details */}
        <FormSection
          title="Coverage Details"
          icon={<FileText size={16} />}
          className="mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelClass}>
                Type of Cover <span className="text-red-500">*</span>
              </label>
              <select
                name="typeOfCover"
                value={formData.typeOfCover}
                onChange={handleChange}
                required
                className={selectClass}
              >
                <option value="">Select Type of Cover</option>
                {typeOfCoverOptions.length > 0 ? (
                  typeOfCoverOptions.map(opt => (
                    <option key={opt.id} value={opt.value}>{opt.value}</option>
                  ))
                ) : (
                  <>
                    <option value="Property">Property</option>
                    <option value="Casualty">Casualty</option>
                    <option value="Marine">Marine</option>
                    <option value="Aviation">Aviation</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Motor">Motor</option>
                    <option value="Life">Life</option>
                    <option value="Health">Health</option>
                    <option value="Specialty">Specialty</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Class of Cover <span className="text-red-500">*</span>
              </label>
              <select
                name="classOfCover"
                value={formData.classOfCover}
                onChange={handleChange}
                required
                className={selectClass}
              >
                <option value="">Select Class of Cover</option>
                {classOfCoverOptions.length > 0 ? (
                  classOfCoverOptions.map(opt => (
                    <option key={opt.id} value={opt.value}>{opt.value}</option>
                  ))
                ) : (
                  <>
                    <option value="All Risks">All Risks</option>
                    <option value="Fire & Allied Perils">Fire & Allied Perils</option>
                    <option value="Machinery Breakdown">Machinery Breakdown</option>
                    <option value="Business Interruption">Business Interruption</option>
                    <option value="General Liability">General Liability</option>
                    <option value="Professional Liability">Professional Liability</option>
                    <option value="Product Liability">Product Liability</option>
                    <option value="Cargo">Cargo</option>
                    <option value="Hull">Hull</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className={labelClass}>Industry</label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">Select Industry</option>
                {industryOptions.length > 0 ? (
                  industryOptions.map(opt => (
                    <option key={opt.id} value={opt.value}>{opt.value}</option>
                  ))
                ) : (
                  <>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Oil & Gas">Oil & Gas</option>
                    <option value="Construction">Construction</option>
                    <option value="Retail">Retail</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Technology">Technology</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Real Estate">Real Estate</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Territory</label>
              <input
                type="text"
                name="territory"
                value={formData.territory || ''}
                onChange={handleChange}
                placeholder="e.g., Worldwide excl. USA"
                className={inputClass}
              />
            </div>
            {activeType === 'FAC' && (
              <div>
                <label className={labelClass}>Original Insured Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="originalInsuredName"
                    value={formData.originalInsuredName || ''}
                    onChange={handleChange}
                    placeholder="Name of the original insured"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Risk Description</label>
            <textarea
              name="riskDescription"
              value={formData.riskDescription || ''}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the risk being covered..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </FormSection>

        {/* Financial Terms */}
        <FormSection
          title="Financial Terms"
          icon={<DollarSign size={16} />}
          className="mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={labelClass}>Currency <span className="text-red-500">*</span></label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className={selectClass}
              >
                {sortedCurrencies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Limit of Liability <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="limitOfLiability"
                value={formData.limitOfLiability}
                onChange={handleChange}
                required
                min={0}
                step="0.01"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Deductible</label>
              <input
                type="number"
                name="deductible"
                value={formData.deductible}
                onChange={handleChange}
                min={0}
                step="0.01"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Our Share (%) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="ourShare"
                  value={formData.ourShare}
                  onChange={handleChange}
                  required
                  min={0}
                  max={100}
                  step="0.01"
                  className={`${inputClass} pr-8`}
                />
                <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {activeStructure === 'PROPORTIONAL' && (
            <div className="max-w-xs">
              <label className={labelClass}>Retention</label>
              <input
                type="number"
                name="retention"
                value={formData.retention}
                onChange={handleChange}
                min={0}
                step="0.01"
                placeholder="Cedant's retention amount"
                className={inputClass}
              />
            </div>
          )}
        </FormSection>

        {/* Non-Proportional Structure - Only for Treaty + Non-Prop */}
        <div className={`transition-all duration-300 ease-in-out ${
          activeType === 'TREATY' && activeStructure === 'NON_PROPORTIONAL'
            ? 'max-h-[500px] opacity-100 mb-4'
            : 'max-h-0 opacity-0 overflow-hidden mb-0'
        }`}>
          <FormSection
            title="Non-Proportional Structure"
            icon={<ArrowDownRight size={16} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Layer Number</label>
                <input
                  type="number"
                  name="layerNumber"
                  value={formData.layerNumber}
                  onChange={handleChange}
                  min={1}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Excess Point (Attachment)</label>
                <input
                  type="number"
                  name="excessPoint"
                  value={formData.excessPoint}
                  onChange={handleChange}
                  min={0}
                  step="0.01"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Aggregate Limit</label>
                <input
                  type="number"
                  name="aggregateLimit"
                  value={formData.aggregateLimit}
                  onChange={handleChange}
                  min={0}
                  step="0.01"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Aggregate Deductible</label>
                <input
                  type="number"
                  name="aggregateDeductible"
                  value={formData.aggregateDeductible}
                  onChange={handleChange}
                  min={0}
                  step="0.01"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Number of Reinstatements</label>
                <input
                  type="number"
                  name="reinstatements"
                  value={formData.reinstatements}
                  onChange={handleChange}
                  min={0}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Reinstatement Premium (%)</label>
                <input
                  type="number"
                  name="reinstatementPremium"
                  value={formData.reinstatementPremium}
                  onChange={handleChange}
                  min={0}
                  max={100}
                  step="0.01"
                  className={inputClass}
                />
              </div>
            </div>
          </FormSection>
        </div>

        {/* Premium */}
        <FormSection
          title="Premium"
          icon={<DollarSign size={16} />}
          className="mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={labelClass}>Gross Premium <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="grossPremium"
                value={formData.grossPremium}
                onChange={handleChange}
                required
                min={0}
                step="0.01"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Commission (%)</label>
              <input
                type="number"
                name="commissionPercent"
                value={formData.commissionPercent}
                onChange={handleChange}
                min={0}
                max={100}
                step="0.01"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Net Premium</label>
              <input
                type="number"
                name="netPremium"
                value={formData.netPremium}
                readOnly
                className={`${inputClass} bg-slate-50`}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer p-2.5">
                <input
                  type="checkbox"
                  name="adjustablePremium"
                  checked={formData.adjustablePremium}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Adjustable Premium</span>
              </label>
            </div>
          </div>

          {/* Adjustable Premium Fields */}
          <div className={`transition-all duration-300 ease-in-out ${
            formData.adjustablePremium ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Minimum Premium</label>
                <input
                  type="number"
                  name="minimumPremium"
                  value={formData.minimumPremium}
                  onChange={handleChange}
                  min={0}
                  step="0.01"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Deposit Premium</label>
                <input
                  type="number"
                  name="depositPremium"
                  value={formData.depositPremium}
                  onChange={handleChange}
                  min={0}
                  step="0.01"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Notes */}
        <FormSection
          title="Notes"
          icon={<FileText size={16} />}
          defaultOpen={false}
        >
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={4}
            placeholder="Additional notes or comments..."
            className={`${inputClass} resize-none`}
          />
        </FormSection>
      </form>
    </div>
  );
};

export default InwardReinsuranceForm;
