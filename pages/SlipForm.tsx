
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DB } from '../services/db';
import { ReinsuranceSlip, PolicyStatus, PolicyReinsurer, Currency } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Save, ArrowLeft, FileSpreadsheet, Building, Calendar, Hash, Activity, Plus, Trash2, DollarSign } from 'lucide-react';
import { CustomDateInput } from '../components/CustomDateInput';

const SlipForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<ReinsuranceSlip>({
    id: crypto.randomUUID(),
    slipNumber: '',
    date: new Date().toISOString().split('T')[0],
    insuredName: '',
    brokerReinsurer: '',
    status: PolicyStatus.ACTIVE,
    reinsurers: [],
    currency: Currency.USD,
    limitOfLiability: 0
  });

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const slip = await DB.getSlip(id);
        if (slip) {
          // Compatibility: If single field exists but no array, map it
          if ((!slip.reinsurers || slip.reinsurers.length === 0) && slip.brokerReinsurer) {
              slip.reinsurers = [{
                  id: crypto.randomUUID(),
                  name: slip.brokerReinsurer,
                  share: 100,
                  commission: 0
              }];
          }
          setFormData({
              ...slip,
              status: slip.status || PolicyStatus.ACTIVE,
              reinsurers: slip.reinsurers || [],
              currency: slip.currency || Currency.USD,
              limitOfLiability: slip.limitOfLiability || 0
          });
        } else {
          alert('Slip not found');
          navigate('/slips');
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id, isEdit, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: name === 'limitOfLiability' ? Number(value) : value 
    }));
  };

  // Wrapper for date change
  const handleDateChange = (e: { target: { name: string, value: string } }) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReinsurerChange = (index: number, field: keyof PolicyReinsurer, value: any) => {
      const updated = [...(formData.reinsurers || [])];
      updated[index] = { ...updated[index], [field]: value };
      setFormData(prev => ({ ...prev, reinsurers: updated }));
  };

  const addReinsurer = () => {
      setFormData(prev => ({
          ...prev,
          reinsurers: [...(prev.reinsurers || []), { id: crypto.randomUUID(), name: '', share: 0, commission: 0 }]
      }));
  };

  const removeReinsurer = (index: number) => {
      const updated = [...(formData.reinsurers || [])];
      updated.splice(index, 1);
      setFormData(prev => ({ ...prev, reinsurers: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Update main field for backward compatibility display in tables
    const primary = formData.reinsurers && formData.reinsurers.length > 0 ? formData.reinsurers[0].name : '';
    await DB.saveSlip({ ...formData, brokerReinsurer: primary || formData.brokerReinsurer });
    navigate('/slips');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";
  const inputClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm text-gray-900";
  const selectClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm text-gray-900";

  // Priority Currencies Sort
  const priorityCurrencies = ['UZS', 'USD', 'EUR'];
  const allCurrencies = Object.values(Currency);
  const sortedCurrencies = [
      ...priorityCurrencies,
      ...allCurrencies.filter(c => !priorityCurrencies.includes(c)).sort()
  ];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <form onSubmit={handleSubmit}>
         {/* Sticky Header - Use negative margin to span full width over layout padding */}
         <div className="sticky -mt-4 -mx-4 md:-mt-8 md:-mx-8 px-4 md:px-8 py-4 mb-6 bg-gray-50/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between shadow-sm z-40">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => navigate('/slips')} className="text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Slip' : 'New Slip Record'}</h2>
                    <p className="text-xs text-gray-500">
                       Outward Reinsurance Registry
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                 <button
                    type="button"
                    onClick={() => navigate('/slips')}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 rounded-lg shadow-sm transition-all"
                >
                    <Save size={18} /> Save Slip
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Info Panel */}
            <div className="md:col-span-1">
                <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 sticky top-32">
                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-4">
                        <FileSpreadsheet size={24} />
                    </div>
                    <h3 className="font-bold text-amber-900 mb-2">Slip Registry</h3>
                    <p className="text-sm text-amber-800/80 leading-relaxed mb-4">
                        Register a new Outward Reinsurance Slip. Support for multiple reinsurers (panel) is now enabled.
                    </p>
                    <div className="text-xs text-amber-700 font-mono bg-amber-100/50 p-2 rounded">
                        Current Date: {formatDate(new Date().toISOString())}
                    </div>
                </div>
            </div>

            {/* Form Fields */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b border-gray-100">Slip Details</h3>
                
                <div className="space-y-5">
                    <div>
                        <label className={labelClass}><span className="flex items-center gap-2"><Hash size={14}/> Slip Number</span></label>
                        <input 
                            required
                            type="text" 
                            name="slipNumber" 
                            value={formData.slipNumber} 
                            onChange={handleChange}
                            placeholder="e.g. RE/05/2021/01"
                            className={`${inputClass} font-mono`}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                             <CustomDateInput 
                                label="Date" 
                                name="date" 
                                value={formData.date} 
                                onChange={handleDateChange} 
                                required
                             />
                        </div>
                        <div>
                            <label className={labelClass}><span className="flex items-center gap-2"><Activity size={14}/> Status</span></label>
                            <select 
                                name="status" 
                                value={formData.status || PolicyStatus.ACTIVE} 
                                onChange={handleChange} 
                                className={inputClass}
                            >
                                <option value={PolicyStatus.ACTIVE}>Active</option>
                                <option value={PolicyStatus.PENDING}>Pending</option>
                                <option value={PolicyStatus.CANCELLED}>Cancelled</option>
                                <option value={PolicyStatus.NTU}>NTU</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}><span className="flex items-center gap-2"><Building size={14}/> Insured Name</span></label>
                        <input 
                            required
                            type="text" 
                            name="insuredName" 
                            value={formData.insuredName} 
                            onChange={handleChange}
                            placeholder="e.g. Company A"
                            className={inputClass}
                        />
                    </div>

                    {/* Financials Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-gray-100">
                        <div>
                            <label className={labelClass}><span className="flex items-center gap-2"><DollarSign size={14}/> Currency</span></label>
                            <select 
                                name="currency" 
                                value={formData.currency} 
                                onChange={handleChange} 
                                className={selectClass}
                            >
                                {sortedCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Limit of Liability</label>
                            <input 
                                type="number" 
                                name="limitOfLiability" 
                                value={formData.limitOfLiability || ''} 
                                onChange={handleChange}
                                placeholder="0.00"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* REINSURERS PANEL */}
                    <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-bold text-gray-800 mb-3">Reinsurance Market / Panel</label>
                        <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                             <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="px-3 py-2 w-1/2">Market Name</th>
                                        <th className="px-3 py-2">Share %</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {formData.reinsurers?.map((reinsurer, idx) => (
                                        <tr key={reinsurer.id}>
                                            <td className="px-3 py-2">
                                                <input 
                                                    type="text" 
                                                    value={reinsurer.name}
                                                    onChange={(e) => handleReinsurerChange(idx, 'name', e.target.value)}
                                                    className="w-full border-none focus:ring-0 text-sm"
                                                    placeholder="e.g. Swiss Re"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input 
                                                    type="number" 
                                                    value={reinsurer.share || ''}
                                                    onChange={(e) => handleReinsurerChange(idx, 'share', Number(e.target.value))}
                                                    className="w-full border-none focus:ring-0 text-sm"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button type="button" onClick={() => removeReinsurer(idx)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!formData.reinsurers || formData.reinsurers.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-3 py-4 text-center text-gray-400 text-xs italic">
                                                No markets added. Click below to add.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                             </table>
                        </div>
                        <button type="button" onClick={addReinsurer} className="text-xs font-bold text-amber-600 flex items-center gap-1 hover:text-amber-800">
                            <Plus size={12}/> Add Market
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
};

export default SlipForm;
