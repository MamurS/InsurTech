import React from 'react';
import { FileSignature } from 'lucide-react';

const MGADashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <FileSignature className="w-7 h-7 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MGA / Binding Authority</h1>
          <p className="text-sm text-slate-500">Manage binding authority agreements and bordereaux</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <FileSignature className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-600">Coming Soon</h2>
        <p className="text-slate-400 mt-2 max-w-md mx-auto">
          The MGA dashboard is under construction. Agreement management, bordereaux tracking, and performance analytics will appear here.
        </p>
      </div>
    </div>
  );
};

export default MGADashboard;
