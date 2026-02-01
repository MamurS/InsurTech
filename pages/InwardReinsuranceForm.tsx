
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { DB } from '../services/db';
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
import {
  Save, ArrowLeft, FileSpreadsheet, Building, Hash, DollarSign,
  Globe, Home, Layers, ArrowDownRight, Calendar, Percent, FileText
} from 'lucide-react';

interface InwardReinsuranceFormProps {
  origin?: InwardReinsuranceOrigin;
}

const InwardReinsuranceForm: React.FC<InwardReinsuranceFormProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Determine origin from URL path
  const pathOrigin: InwardReinsuranceOrigin = location.pathname.includes('/foreign') ? 'FOREIGN' : 'DOMESTIC';

  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tab states
  const [activeType, setActiveType] = useState<InwardReinsuranceType>('FAC');
  const [activeStructure, setActiveStructure] = useState<InwardReinsuranceStructure>('PROPORTIONAL');

  // Preset data
  const [typeOfCoverOptions, setTypeOfCoverOptions] = useState<InwardReinsurancePreset[]>([]);
  const [classOfCoverOptions, setClassOfCoverOptions] = useState<InwardReinsurancePreset[]>([]);
  const [industryOptions, setIndustryOptions] = useState<InwardReinsurancePreset[]>([]);

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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      // Load presets
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

        if (!error && data) {
          setTypeOfCoverOptions(data.filter(p => p.category === 'TYPE_OF_COVER'));
          setClassOfCoverOptions(data.filter(p => p.category === 'CLASS_OF_COVER'));
          setIndustryOptions(data.filter(p => p.category === 'INDUSTRY'));
        }
      }
    } catch (err) {
      console.error('Failed to load presets:', err);
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

        if (!error && data) {
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
  };

  // Handle type tab change
  const handleTypeChange = (type: InwardReinsuranceType) => {
    setActiveType(type);
    setFormData(prev => ({ ...prev, type }));
  };

  // Handle structure tab change
  const handleStructureChange = (structure: InwardReinsuranceStructure) => {
    setActiveStructure(structure);
    setFormData(prev => ({ ...prev, structure }));
  };

  // Calculate net premium
  useEffect(() => {
    const gross = formData.grossPremium || 0;
    const commission = formData.commissionPercent || 0;
    const net = gross * (1 - commission / 100);
    setFormData(prev => ({ ...prev, netPremium: Math.round(net * 100) / 100 }));
  }, [formData.grossPremium, formData.commissionPercent]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const now = new Date().toISOString();
      const dataToSave = {
        id: formData.id,
        contract_number: formData.contractNumber,
        origin: pathOrigin,
        type: activeType,
        structure: activeStructure,
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
        original_insured_name: formData.originalInsuredName || null,
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
        layer_number: activeStructure === 'NON_PROPORTIONAL' ? formData.layerNumber : null,
        excess_point: activeStructure === 'NON_PROPORTIONAL' ? formData.excessPoint : null,
        aggregate_limit: activeStructure === 'NON_PROPORTIONAL' ? formData.aggregateLimit : null,
        aggregate_deductible: activeStructure === 'NON_PROPORTIONAL' ? formData.aggregateDeductible : null,
        reinstatements: activeStructure === 'NON_PROPORTIONAL' ? formData.reinstatements : null,
        reinstatement_premium: activeStructure === 'NON_PROPORTIONAL' ? formData.reinstatementPremium : null,
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
      navigate(`/inward-reinsurance/${pathOrigin.toLowerCase()}`);
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  // Priority currencies
  const priorityCurrencies = ['UZS', 'USD', 'EUR'];
  const allCurrencies = Object.values(Currency);
  const sortedCurrencies = [
    ...priorityCurrencies,
    ...allCurrencies.filter(c => !priorityCurrencies.includes(c)).sort()
  ];

  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";
  const inputClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900";
  const selectClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-900";

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(`/inward-reinsurance/${pathOrigin.toLowerCase()}`)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {isEdit ? 'Edit' : 'New'} {pathOrigin === 'FOREIGN' ? 'Foreign' : 'Domestic'} Inward Reinsurance
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                {pathOrigin === 'FOREIGN' ? <Globe size={14} /> : <Home size={14} />}
                {pathOrigin === 'FOREIGN' ? 'Overseas/International' : 'Domestic'} Contract
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Contract'}
          </button>
        </div>

        {/* Type Tabs (FAC / TREATY) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => handleTypeChange('FAC')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeType === 'FAC'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet size={18} />
                <span>Facultative (FAC)</span>
              </div>
              <p className="text-xs font-normal mt-1 opacity-70">Individual risk placement</p>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('TREATY')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeType === 'TREATY'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Layers size={18} />
                <span>Treaty</span>
              </div>
              <p className="text-xs font-normal mt-1 opacity-70">Portfolio/program placement</p>
            </button>
          </div>

          {/* Structure Tabs (PROPORTIONAL / NON-PROPORTIONAL) */}
          <div className="flex border-b bg-gray-50">
            <button
              type="button"
              onClick={() => handleStructureChange('PROPORTIONAL')}
              className={`flex-1 py-3 px-6 text-center font-medium transition-colors text-sm ${
                activeStructure === 'PROPORTIONAL'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Proportional (Quota Share / Surplus)
            </button>
            <button
              type="button"
              onClick={() => handleStructureChange('NON_PROPORTIONAL')}
              className={`flex-1 py-3 px-6 text-center font-medium transition-colors text-sm ${
                activeStructure === 'NON_PROPORTIONAL'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Non-Proportional (XoL / Stop Loss)
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">

            {/* Contract Reference Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Contract Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="contractNumber"
                    value={formData.contractNumber}
                    onChange={handleChange}
                    required
                    placeholder="e.g., IR-2026-001"
                    className={`${inputClass} pl-9`}
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

            {/* Treaty-specific fields */}
            {activeType === 'TREATY' && (
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h3 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                  <Layers size={16} /> Treaty Details
                </h3>
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
              </div>
            )}

            {/* Cedant / Source Section */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Building size={16} /> Cedant / Source Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EntitySearchInput
                  label="Cedant Name"
                  value={formData.cedantName || ''}
                  onChange={(name, entityId) => setFormData(prev => ({
                    ...prev,
                    cedantName: name,
                    cedantEntityId: entityId
                  }))}
                  placeholder="Search for cedant entity..."
                  required
                />
                <EntitySearchInput
                  label="Broker (if applicable)"
                  value={formData.brokerName || ''}
                  onChange={(name, entityId) => setFormData(prev => ({
                    ...prev,
                    brokerName: name,
                    brokerEntityId: entityId
                  }))}
                  placeholder="Search for broker entity..."
                />
                {pathOrigin === 'FOREIGN' && (
                  <div>
                    <label className={labelClass}>Cedant Country</label>
                    <input
                      type="text"
                      name="cedantCountry"
                      value={formData.cedantCountry}
                      onChange={handleChange}
                      placeholder="e.g., United Kingdom"
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Period Section */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Calendar size={16} /> Contract Period
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePickerInput
                  label="Inception Date"
                  value={formData.inceptionDate ? new Date(formData.inceptionDate) : null}
                  onChange={(date) => setFormData(prev => ({ ...prev, inceptionDate: toISODateString(date) || '' }))}
                  required
                />
                <DatePickerInput
                  label="Expiry Date"
                  value={formData.expiryDate ? new Date(formData.expiryDate) : null}
                  onChange={(date) => setFormData(prev => ({ ...prev, expiryDate: toISODateString(date) || '' }))}
                  required
                />
              </div>
            </div>

            {/* Coverage Details Section */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText size={16} /> Coverage Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelClass}>Territory</label>
                  <input
                    type="text"
                    name="territory"
                    value={formData.territory}
                    onChange={handleChange}
                    placeholder="e.g., Worldwide excl. USA"
                    className={inputClass}
                  />
                </div>
                {activeType === 'FAC' && (
                  <div>
                    <label className={labelClass}>Original Insured Name</label>
                    <input
                      type="text"
                      name="originalInsuredName"
                      value={formData.originalInsuredName}
                      onChange={handleChange}
                      placeholder="Name of the original insured"
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
              <div className="mt-4">
                <label className={labelClass}>Risk Description</label>
                <textarea
                  name="riskDescription"
                  value={formData.riskDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the risk being covered..."
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            {/* Financial Terms Section */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign size={16} /> Financial Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {activeStructure === 'PROPORTIONAL' && (
                <div className="mt-4">
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
            </div>

            {/* Non-Proportional specific fields */}
            {activeStructure === 'NON_PROPORTIONAL' && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <ArrowDownRight size={16} /> Non-Proportional Structure
                </h3>
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
              </div>
            )}

            {/* Premium Section */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign size={16} /> Premium
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    className={`${inputClass} bg-gray-100`}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5">
                    <input
                      type="checkbox"
                      name="adjustablePremium"
                      checked={formData.adjustablePremium}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Adjustable Premium</span>
                  </label>
                </div>
              </div>
              {formData.adjustablePremium && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
              )}
            </div>

            {/* Notes Section */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Notes</h3>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Additional notes or comments..."
                className={`${inputClass} resize-none`}
              />
            </div>

          </div>
        </div>
      </form>
    </div>
  );
};

export default InwardReinsuranceForm;
