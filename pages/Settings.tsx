
import React, { useState, useEffect } from 'react';
import { DB } from '../services/db';
import { CBUService } from '../services/cbuService';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ContextBar } from '../components/ContextBar';
import { ExchangeRate, Currency } from '../types';
import {
  Save, Download, Upload, Database,
  Building, Globe, Moon, Bell, Shield,
  HardDrive, Check, RefreshCw, TrendingUp,
  AlertCircle, CheckCircle
} from 'lucide-react';

const SETTINGS_KEY = 'insurtech_app_settings';

interface AppSettings {
  companyName: string;
  currency: string;
  dateFormat: string;
  defaultCommission: number;
  defaultTax: number;
  enableNotifications: boolean;
  theme: 'light' | 'dark';
}

const DEFAULT_SETTINGS: AppSettings = {
  companyName: '',
  currency: 'USD',
  dateFormat: 'dd.mm.yyyy',
  defaultCommission: 15.0,
  defaultTax: 0,
  enableNotifications: true,
  theme: 'light'
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [storageStats, setStorageStats] = useState<{ used: string; items: number }>({ used: '0 KB', items: 0 });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [restoreConfirm, setRestoreConfirm] = useState<{ isOpen: boolean; file: File | null }>({ isOpen: false, file: null });
  const toast = useToast();

  // FX Rate state
  const [fxRates, setFxRates] = useState<ExchangeRate[]>([]);
  const [fxSyncing, setFxSyncing] = useState(false);
  const [fxLastSync, setFxLastSync] = useState<string | null>(null);
  const [fxError, setFxError] = useState<string | null>(null);

  useEffect(() => {
    // Load Settings
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      setSettings(JSON.parse(stored));
    }
    calculateStorage();
    loadFxRates();
  }, []);

  const loadFxRates = async () => {
    try {
      const rates = await DB.getExchangeRates();
      setFxRates(rates);
      if (rates.length > 0) {
        // Find the most recent date
        const latestDate = rates.reduce((latest, rate) => {
          return rate.date > latest ? rate.date : latest;
        }, rates[0].date);
        setFxLastSync(latestDate);
      }
    } catch (err) {
      console.error('Failed to load FX rates:', err);
    }
  };

  const handleSyncCBU = async () => {
    setFxSyncing(true);
    setFxError(null);
    try {
      const result = await CBUService.syncRates();
      toast.success(`Updated ${result.updated} exchange rates for ${result.date}`);
      await loadFxRates();
      setFxLastSync(result.date);
    } catch (err: any) {
      setFxError(err.message || 'Failed to sync rates');
      toast.error('Failed to fetch CBU rates');
    } finally {
      setFxSyncing(false);
    }
  };

  const calculateStorage = () => {
    let total = 0;
    let count = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += ((localStorage[x].length * 2));
        count++;
      }
    }
    const kb = (total / 1024).toFixed(2);
    setStorageStats({ used: `${kb} KB`, items: count });
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaveStatus('saved');
    
    // We do NOT reload the page to prevent crashes in some hosting environments.
    // Since components read settings from localStorage on render, 
    // simply navigating away from this page will reflect changes.
    setTimeout(() => {
        setSaveStatus('idle');
    }, 2000);
  };

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleBackup = async () => {
    const policies = await DB.getAllPolicies();
    const slips = await DB.getAllSlips();
    const clauses = await DB.getAllClauses();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      settings,
      data: { policies, slips, clauses }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insurtech_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRestoreConfirm({ isOpen: true, file });
    event.target.value = ''; // Reset input
  };

  const performRestore = () => {
    if (!restoreConfirm.file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const json = JSON.parse(raw);

        // Basic validation
        if (!json.data || !json.data.policies) throw new Error("Invalid backup format");

        // Restore
        localStorage.setItem('insurtech_policies', JSON.stringify(json.data.policies));
        localStorage.setItem('insurtech_slips', JSON.stringify(json.data.slips));
        localStorage.setItem('insurtech_clauses', JSON.stringify(json.data.clauses));

        if (json.settings) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(json.settings));
        }

        toast.success('System restored successfully. The page will now reload.');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error(err);
        toast.error('Failed to restore data. The file might be corrupted or incompatible.');
      }
    };
    reader.readAsText(restoreConfirm.file);
    setRestoreConfirm({ isOpen: false, file: null });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Context Bar */}
      <ContextBar
        status="ACTIVE"
        breadcrumbs={[
          { label: 'Configuration' },
          { label: 'Settings' }
        ]}
      />

      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-gray-800">Settings & Tools</h2>
            <p className="text-gray-500">Configure application preferences and manage data.</p>
        </div>
        <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
            {saveStatus === 'saved' ? <Check size={20} /> : <Save size={20} />}
            {saveStatus === 'saved' ? 'Saved' : 'Save Changes'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* General Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
                <Globe size={18} /> General Configuration
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <div className="relative">
                        <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            value={settings.companyName}
                            onChange={(e) => handleChange('companyName', e.target.value)}
                            className="w-full pl-10 p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                        <select 
                            value={settings.currency}
                            onChange={(e) => handleChange('currency', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="UZS">UZS (so'm)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                        <select 
                            value={settings.dateFormat}
                            onChange={(e) => handleChange('dateFormat', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        >
                            <option value="dd.mm.yyyy">dd.mm.yyyy</option>
                            <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                            <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                            <option value="mm.dd.yyyy">mm.dd.yyyy</option>
                            <option value="dd-mm-yyyy">dd-mm-yyyy</option>
                            <option value="mm-dd-yyyy">mm-dd-yyyy</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                     <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Moon size={16} /> Dark Mode <span className="text-xs text-gray-400 font-normal">(Coming Soon)</span>
                     </span>
                     <div className="w-10 h-6 bg-gray-200 rounded-full relative cursor-not-allowed">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                     </div>
                </div>
            </div>
        </div>

        {/* Policy Defaults */}
         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
                <Shield size={18} /> Policy Defaults
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-500 mb-4">Set default values for new policy records to speed up data entry.</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Commission %</label>
                        <input 
                            type="number" 
                            step="0.1"
                            value={settings.defaultCommission}
                            onChange={(e) => handleChange('defaultCommission', parseFloat(e.target.value))}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax %</label>
                        <input 
                            type="number" 
                            step="0.1"
                            value={settings.defaultTax}
                            onChange={(e) => handleChange('defaultTax', parseFloat(e.target.value))}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                     <input 
                        type="checkbox" 
                        id="notif" 
                        checked={settings.enableNotifications}
                        onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                     />
                     <label htmlFor="notif" className="text-sm text-gray-700 flex items-center gap-2">
                        Enable Expiry Notifications <Bell size={14} className="text-gray-400"/>
                     </label>
                </div>
            </div>
        </div>

        {/* Data Tools */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
                <Database size={18} /> Data Management
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Backup */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                            <Download size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800">Backup Data</h4>
                        <p className="text-xs text-gray-500 mb-4 mt-1">Export all policies, slips, and settings to a JSON file.</p>
                        <button onClick={handleBackup} className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                            Download Backup
                        </button>
                    </div>

                    {/* Restore */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors relative">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3">
                            <Upload size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800">Restore Data</h4>
                        <p className="text-xs text-gray-500 mb-4 mt-1">Import data from a backup file. Overwrites current data.</p>
                        <label className="w-full block text-center py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors cursor-pointer">
                            Select File
                            <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                        </label>
                    </div>

                    {/* Storage Info */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mb-3">
                            <HardDrive size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800">Local Storage</h4>
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Used Space:</span>
                                <span className="font-mono font-medium">{storageStats.used}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total Items:</span>
                                <span className="font-mono font-medium">{storageStats.items}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Exchange Rates */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp size={18} /> Exchange Rates (CBU)
            </span>
            <button
              onClick={handleSyncCBU}
              disabled={fxSyncing}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={16} className={fxSyncing ? 'animate-spin' : ''} />
              {fxSyncing ? 'Syncing...' : 'Sync from CBU'}
            </button>
          </div>
          <div className="p-6">
            {/* Status Bar */}
            <div className="flex items-center gap-4 mb-4 text-sm">
              {fxLastSync && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle size={14} />
                  Last sync: {fxLastSync}
                </span>
              )}
              {fxError && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle size={14} />
                  {fxError}
                </span>
              )}
            </div>

            {/* Rates Grid */}
            {fxRates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
                <p>No exchange rates loaded.</p>
                <p className="text-sm">Click "Sync from CBU" to fetch current rates.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {fxRates
                  .filter((r, i, arr) => arr.findIndex(x => x.currency === r.currency) === i)
                  .sort((a, b) => {
                    const priority = ['USD', 'EUR', 'RUB', 'GBP', 'CHF'];
                    const aIdx = priority.indexOf(a.currency);
                    const bIdx = priority.indexOf(b.currency);
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                    if (aIdx !== -1) return -1;
                    if (bIdx !== -1) return 1;
                    return a.currency.localeCompare(b.currency);
                  })
                  .map(rate => (
                    <div
                      key={rate.currency}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        {rate.currency}
                      </div>
                      <div className="text-lg font-bold text-gray-800 font-mono">
                        {rate.rate.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs text-gray-400">UZS</div>
                    </div>
                  ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">
              Source: Central Bank of Uzbekistan (cbu.uz). Rates are official daily rates in UZS.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={restoreConfirm.isOpen}
        title="Restore Data?"
        message="Restoring data will overwrite your current database. This action cannot be undone. Continue?"
        onConfirm={performRestore}
        onCancel={() => setRestoreConfirm({ isOpen: false, file: null })}
        variant="warning"
        confirmText="Restore"
      />
    </div>
  );
};

export default Settings;
