
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DB } from '../services/db';
import { ReinsuranceSlip, PolicyStatus } from '../types';
import { Save, ArrowLeft, FileSpreadsheet, Building, Calendar, Hash, Activity } from 'lucide-react';

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
    status: PolicyStatus.ACTIVE // Default
  });

  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        const slip = await DB.getSlip(id);
        if (slip) {
          setFormData({
              ...slip,
              status: slip.status || PolicyStatus.ACTIVE // Backward compat
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await DB.saveSlip(formData);
    navigate('/slips');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  // Shared Styles
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";
  // Added text-gray-900 to ensure visibility
  const inputClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm text-gray-900";

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <form onSubmit={handleSubmit}>
         {/* Sticky Header */}
         <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-200 py-4 mb-6 flex items-center justify-between -mx-4 px-4 md:-mx-8 md:px-8">
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
                        Use this form to register a new Outward Reinsurance Slip number. 
                        Ensure the number is unique and follows the company naming convention (e.g., RE/MM/YYYY/NN).
                    </p>
                    <div className="text-xs text-amber-700 font-mono bg-amber-100/50 p-2 rounded">
                        Current Date: {new Date().toLocaleDateString()}
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
                             <label className={labelClass}><span className="flex items-center gap-2"><Calendar size={14}/> Date</span></label>
                            <input 
                                required
                                type="date" 
                                name="date" 
                                value={formData.date} 
                                onChange={handleChange}
                                className={inputClass}
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

                    <div>
                        <label className={labelClass}>Broker / Reinsurer</label>
                        <input 
                            required
                            type="text" 
                            name="brokerReinsurer" 
                            value={formData.brokerReinsurer} 
                            onChange={handleChange}
                            placeholder="e.g. Marsh / Lockton"
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
};

export default SlipForm;
