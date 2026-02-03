import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Save, Clock } from 'lucide-react';

type StatusType = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface FormContextBarProps {
  status: StatusType;
  breadcrumbs: BreadcrumbItem[];
  uwYear?: number;
  saveState?: 'unsaved' | 'saving' | 'saved';
  lastSaved?: Date;
  onSave: () => void;
  saving?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700' },
  PENDING: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  ACTIVE: { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  EXPIRED: { label: 'Expired', bg: 'bg-red-100', text: 'text-red-700' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' }
};

export const FormContextBar: React.FC<FormContextBarProps> = ({
  status,
  breadcrumbs,
  uwYear,
  saveState = 'unsaved',
  lastSaved,
  onSave,
  saving = false,
  className = ''
}) => {
  const statusStyle = statusConfig[status] || statusConfig.DRAFT;

  const getSaveStateText = () => {
    if (saveState === 'saving') return 'Saving...';
    if (saveState === 'saved' && lastSaved) {
      const minutes = Math.floor((Date.now() - lastSaved.getTime()) / 60000);
      if (minutes < 1) return 'Saved just now';
      if (minutes === 1) return 'Saved 1 min ago';
      return `Saved ${minutes} mins ago`;
    }
    return 'Not saved yet';
  };

  return (
    <div
      className={`
        sticky top-0 z-10
        bg-white/80 backdrop-blur-sm
        border-b border-slate-200
        px-4 py-3
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          {/* Status Badge */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>

          {/* Breadcrumb items */}
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight size={14} className="text-slate-400" />
              {item.href ? (
                <Link
                  to={item.href}
                  className="text-slate-600 hover:text-blue-600 hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-900 font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right side - UW Year, Save State, Save Button */}
        <div className="flex items-center gap-4">
          {/* UW Year */}
          {uwYear && (
            <span className="text-sm text-slate-600 font-medium">
              UW {uwYear}
            </span>
          )}

          {/* Save State */}
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} />
            {getSaveStateText()}
          </span>

          {/* Save Button */}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="
              flex items-center gap-2
              px-4 py-2
              bg-blue-600 text-white
              text-sm font-medium
              rounded-lg
              hover:bg-blue-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              shadow-sm
            "
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
                <Save size={16} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormContextBar;
