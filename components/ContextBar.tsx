import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Save } from 'lucide-react';

type StatusType = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

interface ContextBarProps {
  status: StatusType;
  contractType: string;
  contractId?: string | null;
  uwYear: number;
  lastSaved: string;
  onSave: () => void;
  saving?: boolean;
  listUrl?: string;
  className?: string;
}

// Status badge colors matching the prototype
const statusConfig: Record<StatusType, { label: string; classes: string }> = {
  DRAFT: { label: 'Draft', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  PENDING: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACTIVE: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  EXPIRED: { label: 'Expired', classes: 'bg-red-50 text-red-600 border-red-200' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-red-50 text-red-600 border-red-200' }
};

export const ContextBar: React.FC<ContextBarProps> = ({
  status,
  contractType,
  contractId,
  uwYear,
  lastSaved,
  onSave,
  saving = false,
  listUrl,
  className = ''
}) => {
  const statusStyle = statusConfig[status] || statusConfig.DRAFT;

  return (
    <div className={`sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-3 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Left side - Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          {/* Status Badge */}
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusStyle.classes}`}>
            {statusStyle.label}
          </span>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          {listUrl ? (
            <Link to={listUrl} className="text-slate-600 hover:text-blue-600 transition-colors">
              Inward Reinsurance
            </Link>
          ) : (
            <span className="text-slate-600">Inward Reinsurance</span>
          )}

          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className="text-slate-600">{contractType}</span>

          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className="text-slate-900 font-medium">{contractId || 'New Contract'}</span>
        </div>

        {/* Right side: UW Year, Save state, Save button */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">UW {uwYear}</span>
          <span className="text-xs text-slate-400">{lastSaved}</span>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Contract</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContextBar;
