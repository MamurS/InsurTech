import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, FileText, AlertTriangle,
  PieChart as PieChartIcon, BarChart3, Activity, RefreshCw, Download
} from 'lucide-react';
import {
  useKPISummary,
  usePremiumTrend,
  useLossRatioByClass,
  useTopCedants,
  useRecentClaims
} from '../hooks/useAnalytics';

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, trend, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            <span className="text-slate-400">vs last period</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

// Chart Card Wrapper
interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children, loading }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
    <div className="px-5 py-4 border-b border-slate-100">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-5">
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

// Format currency
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
};

// Chart colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Analytics: React.FC = () => {
  const { data: kpis, loading: kpisLoading } = useKPISummary();
  const { data: premiumTrend, loading: trendLoading } = usePremiumTrend();
  const { data: lossRatioData, loading: lossRatioLoading } = useLossRatioByClass();
  const { data: topCedants, loading: cedantsLoading } = useTopCedants(5);
  const { data: recentClaims, loading: claimsLoading } = useRecentClaims(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <BarChart3 size={28} />
            Analytics Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Portfolio performance and key metrics overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium">
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Gross Written Premium"
          value={kpis ? formatCurrency(kpis.grossWrittenPremium) : '-'}
          subtitle="Total GWP year to date"
          icon={<DollarSign className="w-5 h-5 text-white" />}
          color="bg-blue-500"
        />
        <KPICard
          title="Net Written Premium"
          value={kpis ? formatCurrency(kpis.netWrittenPremium) : '-'}
          subtitle="After cessions"
          icon={<Activity className="w-5 h-5 text-white" />}
          color="bg-emerald-500"
        />
        <KPICard
          title="Loss Ratio"
          value={kpis ? `${kpis.lossRatio}%` : '-'}
          subtitle="Incurred / Earned"
          icon={<PieChartIcon className="w-5 h-5 text-white" />}
          color={kpis && kpis.lossRatio > 70 ? "bg-red-500" : "bg-amber-500"}
        />
        <KPICard
          title="Active Policies"
          value={kpis ? kpis.activePolicies.toString() : '-'}
          subtitle={kpis ? `${kpis.openClaims} open claims` : ''}
          icon={<FileText className="w-5 h-5 text-white" />}
          color="bg-violet-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Premium Trend Chart */}
        <ChartCard
          title="Premium Trend"
          subtitle="Monthly GWP and NWP (Last 12 months)"
          loading={trendLoading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={premiumTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="gwp"
                stroke="#3b82f6"
                strokeWidth={2}
                name="GWP"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="nwp"
                stroke="#10b981"
                strokeWidth={2}
                name="NWP"
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Loss Ratio by Class */}
        <ChartCard
          title="Loss Ratio by Class"
          subtitle="Premium vs Incurred Losses"
          loading={lossRatioLoading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={lossRatioData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="class"
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                width={100}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'lossRatio' ? `${value}%` : formatCurrency(value),
                  name === 'lossRatio' ? 'Loss Ratio' : name
                ]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar
                dataKey="lossRatio"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
                name="Loss Ratio %"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cedants/Insureds */}
        <ChartCard
          title="Top Clients by Premium"
          subtitle="Largest insureds/cedants"
          loading={cedantsLoading}
        >
          <div className="space-y-3">
            {topCedants.map((cedant, index) => (
              <div key={cedant.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-700' : 'bg-slate-300'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{cedant.name}</p>
                    <p className="text-xs text-slate-500">{cedant.policies} policies</p>
                  </div>
                </div>
                <span className="font-semibold text-slate-800">{formatCurrency(cedant.premium)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Recent/Large Claims */}
        <ChartCard
          title="Large Claims"
          subtitle="Highest incurred amounts"
          loading={claimsLoading}
        >
          <div className="space-y-3">
            {recentClaims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    claim.status === 'Open' ? 'bg-amber-100' : 'bg-slate-100'
                  }`}>
                    <AlertTriangle size={16} className={
                      claim.status === 'Open' ? 'text-amber-600' : 'text-slate-400'
                    } />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{claim.claimNumber}</p>
                    <p className="text-xs text-slate-500">{claim.insuredName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-800">{formatCurrency(claim.incurred)}</span>
                  <p className={`text-xs ${claim.status === 'Open' ? 'text-amber-600' : 'text-slate-400'}`}>
                    {claim.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Portfolio Distribution (Pie Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Premium by Class"
          subtitle="Portfolio distribution"
          loading={lossRatioLoading}
        >
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={lossRatioData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="earnedPremium"
                nameKey="class"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {lossRatioData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Premium']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Quick Stats */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Quick Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{kpis?.activePolicies || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Active Policies</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{kpis?.openClaims || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Open Claims</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">
                {kpis ? formatCurrency(kpis.avgPremium) : '-'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Avg Premium</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-violet-600">
                {lossRatioData.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Classes Written</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
