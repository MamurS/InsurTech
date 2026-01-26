
import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCreateClaim, usePoliciesDropdown } from '../hooks/useClaims';
import { determineLiability } from '../services/claimsService';
import { ClaimLiabilityType } from '../types';

interface RegisterClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const generateClaimNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CLM-${year}-${random}`;
};

const RegisterClaimModal: React.FC<RegisterClaimModalProps> = ({ isOpen, onClose }) => {
    // Fetch policies for dropdown
    const { data: policies, isLoading: policiesLoading } = usePoliciesDropdown();
    const createClaimMutation = useCreateClaim();

    // Form state
    const [selectedPolicyId, setSelectedPolicyId] = useState('');
    const [claimNumber, setClaimNumber] = useState(generateClaimNumber());
    const [lossDate, setLossDate] = useState('');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [causeOfLoss, setCauseOfLoss] = useState('');
    const [claimantName, setClaimantName] = useState('');
    const [locationCountry, setLocationCountry] = useState('');
    const [initialReserve, setInitialReserve] = useState<number | ''>('');
    
    // Calculated liability
    const [liabilityType, setLiabilityType] = useState<ClaimLiabilityType | null>(null);
    const [liabilityReason, setLiabilityReason] = useState('');

    // Get selected policy details
    const selectedPolicy = policies?.find(p => p.id === selectedPolicyId);

    // Auto-calculate liability when policy and loss date change
    useEffect(() => {
        if (selectedPolicy && lossDate) {
            const result = determineLiability(
                { 
                    inceptionDate: selectedPolicy.inceptionDate, 
                    expiryDate: selectedPolicy.expiryDate 
                } as any,
                lossDate,
                reportDate
            );
            setLiabilityType(result.type);
            setLiabilityReason(result.reason);
        } else {
            setLiabilityType(null);
            setLiabilityReason('');
        }
    }, [selectedPolicyId, lossDate, reportDate, selectedPolicy]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedPolicyId('');
            setClaimNumber(generateClaimNumber());
            setLossDate('');
            setReportDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setCauseOfLoss('');
            setClaimantName('');
            setLocationCountry('');
            setInitialReserve('');
            setLiabilityType(null);
            setLiabilityReason('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!selectedPolicyId || !lossDate || !description || !liabilityType) {
            alert('Please fill in all required fields');
            return;
        }

        createClaimMutation.mutate({
            policyId: selectedPolicyId,
            claimNumber,
            lossDate,
            reportDate,
            description,
            // Assuming description holds causeOfLoss for now or map it if schema supports
            claimantName,
            locationCountry,
            liabilityType,
            status: 'OPEN',
            initialReserve: liabilityType === 'ACTIVE' && initialReserve ? Number(initialReserve) : undefined,
            currency: selectedPolicy?.currency,
            ourSharePercentage: selectedPolicy?.ourShare
        }, {
            onSuccess: () => {
                onClose();
            },
            onError: (error) => {
                alert('Error creating claim: ' + error.message);
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">Register New Claim</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6">
                    {/* Policy Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Policy <span className="text-red-500">*</span>
                        </label>
                        {policiesLoading ? (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <Loader2 size={16} className="animate-spin" /> Loading policies...
                            </div>
                        ) : (
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                value={selectedPolicyId}
                                onChange={(e) => setSelectedPolicyId(e.target.value)}
                            >
                                <option value="">Select a policy...</option>
                                {policies?.map(policy => (
                                    <option key={policy.id} value={policy.id}>
                                        {policy.policyNumber} - {policy.insuredName}
                                    </option>
                                ))}
                            </select>
                        )}
                        {selectedPolicy && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                                <span className="font-bold">Period:</span> {selectedPolicy.inceptionDate} to {selectedPolicy.expiryDate} &bull; 
                                <span className="font-bold ml-2">Currency:</span> {selectedPolicy.currency} &bull; 
                                <span className="font-bold ml-2">Our Share:</span> {selectedPolicy.ourShare}%
                            </div>
                        )}
                    </div>

                    {/* Claim Number */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Claim Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                            value={claimNumber}
                            onChange={(e) => setClaimNumber(e.target.value)}
                        />
                    </div>

                    {/* Dates Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Loss Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={lossDate}
                                onChange={(e) => setLossDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Report Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Liability Type Display */}
                    {liabilityType && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${
                            liabilityType === 'ACTIVE' 
                                ? 'bg-blue-50 border border-blue-200' 
                                : 'bg-amber-50 border border-amber-200'
                        }`}>
                            {liabilityType === 'ACTIVE' ? (
                                <CheckCircle className="text-blue-600 flex-shrink-0" size={20} />
                            ) : (
                                <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                            )}
                            <div>
                                <div className={`font-bold text-sm ${liabilityType === 'ACTIVE' ? 'text-blue-800' : 'text-amber-800'}`}>
                                    {liabilityType === 'ACTIVE' ? 'Active Liability' : 'Informational Only'}
                                </div>
                                <div className={`text-xs ${liabilityType === 'ACTIVE' ? 'text-blue-600' : 'text-amber-600'}`}>{liabilityReason}</div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the loss event..."
                        />
                    </div>

                    {/* Cause of Loss */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cause of Loss</label>
                        <select
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            value={causeOfLoss}
                            onChange={(e) => setCauseOfLoss(e.target.value)}
                        >
                            <option value="">Select cause...</option>
                            <option value="Fire">Fire</option>
                            <option value="Water Damage">Water Damage</option>
                            <option value="Theft">Theft</option>
                            <option value="Collision">Collision</option>
                            <option value="Natural Disaster">Natural Disaster</option>
                            <option value="Machinery Breakdown">Machinery Breakdown</option>
                            <option value="Liability">Liability</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Claimant and Location Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Claimant Name</label>
                            <input
                                type="text"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={claimantName}
                                onChange={(e) => setClaimantName(e.target.value)}
                                placeholder="If different from insured"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Location / Country</label>
                            <input
                                type="text"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={locationCountry}
                                onChange={(e) => setLocationCountry(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Initial Reserve - Only for ACTIVE claims */}
                    {liabilityType === 'ACTIVE' && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Initial Reserve (100% Gross)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    value={initialReserve}
                                    onChange={(e) => setInitialReserve(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="0.00"
                                />
                                {selectedPolicy && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                        {selectedPolicy.currency}
                                    </div>
                                )}
                            </div>
                            {initialReserve && selectedPolicy && (
                                <div className="mt-2 text-xs text-blue-600 font-medium">
                                    Net Reserve (Our share {selectedPolicy.ourShare}%): {(Number(initialReserve) * selectedPolicy.ourShare / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} {selectedPolicy.currency}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                        disabled={createClaimMutation.isPending}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={createClaimMutation.isPending || !selectedPolicyId || !lossDate || !description}
                        className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm transition-colors"
                    >
                        {createClaimMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                        Register Claim
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegisterClaimModal;
