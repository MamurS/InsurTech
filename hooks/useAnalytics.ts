import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

// =============================================
// TYPES
// =============================================

export type ChannelType = 'direct' | 'inward-foreign' | 'inward-domestic' | 'slip' | 'total';

export interface ChannelMetrics {
  channel: ChannelType;
  label: string;
  color: string;
  recordCount: number;
  activeCount: number;
  pendingCount: number;
  cancelledCount: number;
  grossWrittenPremium: number;
  netWrittenPremium: number;
  commission: number;
  avgPremium: number;
  avgOurShare: number;
  totalLimit: number;
  currencyBreakdown: Record<string, { count: number; premium: number }>;
  classBreakdown: Record<string, { count: number; premium: number }>;
  monthlyTrend: { month: string; gwp: number; nwp: number; count: number }[];
  topCedants: { name: string; premium: number; count: number }[];
}

export interface AnalyticsSummary {
  channels: ChannelMetrics[];
  total: ChannelMetrics;
  claims: ClaimsMetrics;
  lossRatioByClass: LossRatioData[];
  recentActivity: ActivityItem[];
}

export interface ClaimsMetrics {
  totalClaims: number;
  openClaims: number;
  closedClaims: number;
  totalIncurred: number;
  totalPaid: number;
  totalReserve: number;
  avgClaimSize: number;
  lossRatio: number;
}

export interface LossRatioData {
  class: string;
  earnedPremium: number;
  incurredLosses: number;
  lossRatio: number;
  claimCount: number;
}

export interface ActivityItem {
  id: string;
  type: 'policy' | 'inward' | 'claim' | 'slip';
  action: string;
  description: string;
  date: string;
  amount?: number;
}

// Channel configuration
const CHANNEL_CONFIG: Record<ChannelType, { label: string; color: string }> = {
  'direct': { label: 'Direct Insurance', color: '#3b82f6' },
  'inward-foreign': { label: 'Inward Foreign', color: '#8b5cf6' },
  'inward-domestic': { label: 'Inward Domestic', color: '#10b981' },
  'slip': { label: 'Reinsurance Slips', color: '#f59e0b' },
  'total': { label: 'Total Portfolio', color: '#1e293b' },
};

// =============================================
// HELPER FUNCTIONS
// =============================================

const getMonthKey = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (key: string): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [, month] = key.split('-');
  return months[parseInt(month) - 1] || key;
};

const normalizeStatus = (status: string): 'active' | 'pending' | 'cancelled' => {
  const s = status?.toUpperCase() || '';
  if (s.includes('ACTIVE') || s === 'BOUND' || s === 'SIGNED') return 'active';
  if (s.includes('PENDING') || s.includes('DRAFT') || s === 'QUOTED' || s === 'SENT') return 'pending';
  return 'cancelled';
};

/**
 * Convert an amount to USD based on currency and exchange rate.
 * Exchange rate is assumed to be local-currency-per-1-USD.
 */
const convertToUSD = (amount: number, currency: string, exchangeRate: number): number => {
  if (!amount || amount === 0) return 0;

  if (currency === 'USD') {
    return amount;
  } else if (currency === 'UZS') {
    // UZS amounts need to be divided by exchange rate
    return exchangeRate > 1 ? amount / exchangeRate : 0;
  } else {
    // EUR, GBP, etc. - use the amount as-is (close enough for reporting)
    return amount;
  }
};

/**
 * Normalize ourShare to percentage format.
 * Some records store as decimal (0.05 = 5%), others as percentage (5 = 5%).
 */
const normalizeOurShare = (ourShare: number): number => {
  if (ourShare > 0 && ourShare < 1) {
    // Looks like a decimal fraction, convert to percentage
    return ourShare * 100;
  }
  return ourShare;
};

const createEmptyChannelMetrics = (channel: ChannelType): ChannelMetrics => ({
  channel,
  label: CHANNEL_CONFIG[channel].label,
  color: CHANNEL_CONFIG[channel].color,
  recordCount: 0,
  activeCount: 0,
  pendingCount: 0,
  cancelledCount: 0,
  grossWrittenPremium: 0,
  netWrittenPremium: 0,
  commission: 0,
  avgPremium: 0,
  avgOurShare: 0,
  totalLimit: 0,
  currencyBreakdown: {},
  classBreakdown: {},
  monthlyTrend: [],
  topCedants: [],
});

// =============================================
// MAIN ANALYTICS HOOK
// =============================================

export const useAnalyticsSummary = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      // Fetch all data sources in parallel
      const [policiesRes, inwardRes, slipsRes, claimsRes] = await Promise.all([
        supabase.from('policies').select('*').eq('isDeleted', false),
        supabase.from('inward_reinsurance').select('*').eq('is_deleted', false),
        supabase.from('slips').select('*').eq('isDeleted', false),
        supabase.from('claims').select('*'),
      ]);

      // Handle potential errors gracefully
      const policies = policiesRes.data || [];
      const inwardContracts = inwardRes.data || [];
      const slips = slipsRes.data || [];
      const claims = claimsRes.data || [];

      // Process each channel
      const directMetrics = processDirectPolicies(policies);
      const inwardForeignMetrics = processInwardReinsurance(
        inwardContracts.filter((c: any) => c.origin === 'FOREIGN'),
        'inward-foreign'
      );
      const inwardDomesticMetrics = processInwardReinsurance(
        inwardContracts.filter((c: any) => c.origin === 'DOMESTIC'),
        'inward-domestic'
      );
      const slipMetrics = processSlips(slips);

      // Calculate totals
      const channels = [directMetrics, inwardForeignMetrics, inwardDomesticMetrics, slipMetrics];
      const totalMetrics = calculateTotalMetrics(channels);

      // Process claims
      const claimsMetrics = processClaimsMetrics(claims, totalMetrics.netWrittenPremium);

      // Loss ratio by class (from policies + claims)
      const lossRatioByClass = calculateLossRatioByClass(policies, claims);

      setData({
        channels,
        total: totalMetrics,
        claims: claimsMetrics,
        lossRatioByClass,
        recentActivity: [],
      });
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, loading, error, refetch: fetchAnalytics };
};

// =============================================
// DATA PROCESSORS
// =============================================

function processDirectPolicies(policies: any[]): ChannelMetrics {
  const metrics = createEmptyChannelMetrics('direct');
  const monthlyData: Record<string, { gwp: number; nwp: number; count: number }> = {};
  const cedantData: Record<string, { premium: number; count: number }> = {};

  policies.forEach(p => {
    metrics.recordCount++;
    const status = normalizeStatus(p.status);
    if (status === 'active') metrics.activeCount++;
    else if (status === 'pending') metrics.pendingCount++;
    else metrics.cancelledCount++;

    // Get raw amounts in original currency
    const gwpOriginal = Number(p.grossPremium) || Number(p.gross_premium_original) || 0;
    const currency = p.currency || 'USD';
    const exchangeRate = Number(p.exchangeRate) || Number(p.exchange_rate) || 1;
    const commissionPct = Number(p.commissionPercent) || Number(p.commission_percent) || 0;

    // Convert to USD for aggregate totals
    const gwpUSD = convertToUSD(gwpOriginal, currency, exchangeRate);

    // Calculate NWP: use provided netPremium or derive from commission
    const nwpOriginal = Number(p.netPremium) || Number(p.net_premium_original);
    const nwpUSD = nwpOriginal
      ? convertToUSD(nwpOriginal, currency, exchangeRate)
      : gwpUSD * (1 - commissionPct / 100);

    // Normalize ourShare (some records store as decimal, e.g., 0.05 = 5%)
    const ourShareRaw = Number(p.ourShare) || Number(p.our_share) || 100;
    const ourShare = normalizeOurShare(ourShareRaw);

    const limit = Number(p.limitForeignCurrency) || Number(p.limit_foreign_currency) || Number(p.sumInsured) || 0;
    const limitUSD = convertToUSD(limit, currency, exchangeRate);
    const classOfIns = p.classOfInsurance || p.class_of_insurance || 'Other';
    const insuredName = p.insuredName || p.insured_name || 'Unknown';
    const inceptionDate = p.inceptionDate || p.inception_date;

    // Use USD-converted amounts for aggregate totals
    metrics.grossWrittenPremium += gwpUSD;
    metrics.netWrittenPremium += nwpUSD;
    metrics.commission += (gwpUSD * commissionPct / 100);
    metrics.totalLimit += limitUSD;
    metrics.avgOurShare += ourShare;

    // Currency breakdown - keep original currency amounts for display
    if (!metrics.currencyBreakdown[currency]) {
      metrics.currencyBreakdown[currency] = { count: 0, premium: 0 };
    }
    metrics.currencyBreakdown[currency].count++;
    metrics.currencyBreakdown[currency].premium += gwpOriginal;

    // Class breakdown - use USD for consistency
    if (!metrics.classBreakdown[classOfIns]) {
      metrics.classBreakdown[classOfIns] = { count: 0, premium: 0 };
    }
    metrics.classBreakdown[classOfIns].count++;
    metrics.classBreakdown[classOfIns].premium += gwpUSD;

    // Monthly trend - use USD
    const monthKey = getMonthKey(inceptionDate);
    if (monthKey) {
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { gwp: 0, nwp: 0, count: 0 };
      }
      monthlyData[monthKey].gwp += gwpUSD;
      monthlyData[monthKey].nwp += nwpUSD;
      monthlyData[monthKey].count++;
    }

    // Top cedants/insureds - use USD
    if (!cedantData[insuredName]) {
      cedantData[insuredName] = { premium: 0, count: 0 };
    }
    cedantData[insuredName].premium += gwpUSD;
    cedantData[insuredName].count++;
  });

  // Finalize metrics
  if (metrics.recordCount > 0) {
    metrics.avgPremium = metrics.grossWrittenPremium / metrics.recordCount;
    metrics.avgOurShare = metrics.avgOurShare / metrics.recordCount;
  }

  // Convert monthly data to array
  metrics.monthlyTrend = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, val]) => ({ month: getMonthLabel(key), ...val }));

  // Top cedants
  metrics.topCedants = Object.entries(cedantData)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 10);

  return metrics;
}

function processInwardReinsurance(contracts: any[], channel: 'inward-foreign' | 'inward-domestic'): ChannelMetrics {
  const metrics = createEmptyChannelMetrics(channel);
  const monthlyData: Record<string, { gwp: number; nwp: number; count: number }> = {};
  const cedantData: Record<string, { premium: number; count: number }> = {};

  contracts.forEach(c => {
    metrics.recordCount++;
    const status = normalizeStatus(c.status);
    if (status === 'active') metrics.activeCount++;
    else if (status === 'pending') metrics.pendingCount++;
    else metrics.cancelledCount++;

    // Get raw amounts in original currency
    const gwpOriginal = Number(c.gross_premium) || 0;
    const currency = c.currency || 'USD';
    const exchangeRate = Number(c.exchange_rate) || 1;
    const commissionPct = Number(c.commission_percent) || 0;

    // Convert to USD for aggregate totals
    const gwpUSD = convertToUSD(gwpOriginal, currency, exchangeRate);

    // Calculate NWP: use provided net_premium or derive from commission
    const nwpOriginal = Number(c.net_premium);
    const nwpUSD = nwpOriginal
      ? convertToUSD(nwpOriginal, currency, exchangeRate)
      : gwpUSD * (1 - commissionPct / 100);

    // Normalize ourShare (some records store as decimal, e.g., 0.05 = 5%)
    const ourShareRaw = Number(c.our_share) || 100;
    const ourShare = normalizeOurShare(ourShareRaw);

    const limit = Number(c.limit_of_liability) || 0;
    const limitUSD = convertToUSD(limit, currency, exchangeRate);
    const classOfCover = c.class_of_cover || 'Other';
    const cedantName = c.cedant_name || 'Unknown';
    const inceptionDate = c.inception_date;

    // Use USD-converted amounts for aggregate totals
    metrics.grossWrittenPremium += gwpUSD;
    metrics.netWrittenPremium += nwpUSD;
    metrics.commission += (gwpUSD * commissionPct / 100);
    metrics.totalLimit += limitUSD;
    metrics.avgOurShare += ourShare;

    // Currency breakdown - keep original currency amounts for display
    if (!metrics.currencyBreakdown[currency]) {
      metrics.currencyBreakdown[currency] = { count: 0, premium: 0 };
    }
    metrics.currencyBreakdown[currency].count++;
    metrics.currencyBreakdown[currency].premium += gwpOriginal;

    // Class breakdown - use USD for consistency
    if (!metrics.classBreakdown[classOfCover]) {
      metrics.classBreakdown[classOfCover] = { count: 0, premium: 0 };
    }
    metrics.classBreakdown[classOfCover].count++;
    metrics.classBreakdown[classOfCover].premium += gwpUSD;

    // Monthly trend - use USD
    const monthKey = getMonthKey(inceptionDate);
    if (monthKey) {
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { gwp: 0, nwp: 0, count: 0 };
      }
      monthlyData[monthKey].gwp += gwpUSD;
      monthlyData[monthKey].nwp += nwpUSD;
      monthlyData[monthKey].count++;
    }

    // Top cedants - use USD
    if (!cedantData[cedantName]) {
      cedantData[cedantName] = { premium: 0, count: 0 };
    }
    cedantData[cedantName].premium += gwpUSD;
    cedantData[cedantName].count++;
  });

  // Finalize metrics
  if (metrics.recordCount > 0) {
    metrics.avgPremium = metrics.grossWrittenPremium / metrics.recordCount;
    metrics.avgOurShare = metrics.avgOurShare / metrics.recordCount;
  }

  // Convert monthly data to array
  metrics.monthlyTrend = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, val]) => ({ month: getMonthLabel(key), ...val }));

  // Top cedants
  metrics.topCedants = Object.entries(cedantData)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 10);

  return metrics;
}

function processSlips(slips: any[]): ChannelMetrics {
  const metrics = createEmptyChannelMetrics('slip');

  slips.forEach(s => {
    metrics.recordCount++;
    const status = normalizeStatus(s.status || 'Draft');
    if (status === 'active') metrics.activeCount++;
    else if (status === 'pending') metrics.pendingCount++;
    else metrics.cancelledCount++;

    const limit = Number(s.limit_of_liability) || Number(s.limitOfLiability) || 0;
    metrics.totalLimit += limit;
  });

  return metrics;
}

function calculateTotalMetrics(channels: ChannelMetrics[]): ChannelMetrics {
  const total = createEmptyChannelMetrics('total');
  const allMonthlyData: Record<string, { gwp: number; nwp: number; count: number }> = {};
  const allCedantData: Record<string, { premium: number; count: number }> = {};

  channels.forEach(ch => {
    total.recordCount += ch.recordCount;
    total.activeCount += ch.activeCount;
    total.pendingCount += ch.pendingCount;
    total.cancelledCount += ch.cancelledCount;
    total.grossWrittenPremium += ch.grossWrittenPremium;
    total.netWrittenPremium += ch.netWrittenPremium;
    total.commission += ch.commission;
    total.totalLimit += ch.totalLimit;

    // Merge currency breakdown
    Object.entries(ch.currencyBreakdown).forEach(([curr, data]) => {
      if (!total.currencyBreakdown[curr]) {
        total.currencyBreakdown[curr] = { count: 0, premium: 0 };
      }
      total.currencyBreakdown[curr].count += data.count;
      total.currencyBreakdown[curr].premium += data.premium;
    });

    // Merge class breakdown
    Object.entries(ch.classBreakdown).forEach(([cls, data]) => {
      if (!total.classBreakdown[cls]) {
        total.classBreakdown[cls] = { count: 0, premium: 0 };
      }
      total.classBreakdown[cls].count += data.count;
      total.classBreakdown[cls].premium += data.premium;
    });

    // Merge monthly trend
    ch.monthlyTrend.forEach(m => {
      if (!allMonthlyData[m.month]) {
        allMonthlyData[m.month] = { gwp: 0, nwp: 0, count: 0 };
      }
      allMonthlyData[m.month].gwp += m.gwp;
      allMonthlyData[m.month].nwp += m.nwp;
      allMonthlyData[m.month].count += m.count;
    });

    // Merge top cedants
    ch.topCedants.forEach(c => {
      if (!allCedantData[c.name]) {
        allCedantData[c.name] = { premium: 0, count: 0 };
      }
      allCedantData[c.name].premium += c.premium;
      allCedantData[c.name].count += c.count;
    });
  });

  // Calculate averages
  if (total.recordCount > 0) {
    total.avgPremium = total.grossWrittenPremium / total.recordCount;
    const totalOurShare = channels.reduce((sum, ch) => sum + (ch.avgOurShare * ch.recordCount), 0);
    total.avgOurShare = totalOurShare / total.recordCount;
  }

  // Convert monthly data
  total.monthlyTrend = Object.entries(allMonthlyData)
    .map(([month, val]) => ({ month, ...val }))
    .slice(-12);

  // Top cedants
  total.topCedants = Object.entries(allCedantData)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 10);

  return total;
}

function processClaimsMetrics(claims: any[], totalNWP: number): ClaimsMetrics {
  const metrics: ClaimsMetrics = {
    totalClaims: claims.length,
    openClaims: 0,
    closedClaims: 0,
    totalIncurred: 0,
    totalPaid: 0,
    totalReserve: 0,
    avgClaimSize: 0,
    lossRatio: 0,
  };

  claims.forEach(c => {
    const status = c.status?.toLowerCase() || '';
    if (status === 'open' || status === 'notified') {
      metrics.openClaims++;
    } else if (status === 'closed' || status === 'settled') {
      metrics.closedClaims++;
    }

    // imported_total_incurred/imported_total_paid are the actual columns in claims table
    const incurred = Number(c.imported_total_incurred) || Number(c.total_incurred_our_share) || Number(c.totalIncurredOurShare) || 0;
    const paid = Number(c.imported_total_paid) || Number(c.total_paid_our_share) || Number(c.totalPaidOurShare) || 0;

    metrics.totalIncurred += incurred;
    metrics.totalPaid += paid;
  });

  metrics.totalReserve = metrics.totalIncurred - metrics.totalPaid;
  metrics.avgClaimSize = metrics.totalClaims > 0 ? metrics.totalIncurred / metrics.totalClaims : 0;
  metrics.lossRatio = totalNWP > 0 ? (metrics.totalIncurred / totalNWP) * 100 : 0;

  return metrics;
}

function calculateLossRatioByClass(policies: any[], claims: any[]): LossRatioData[] {
  const classData: Record<string, { premium: number; losses: number; claimCount: number }> = {};

  // Aggregate premium by class (converting to USD for consistency)
  policies.forEach(p => {
    const cls = p.classOfInsurance || p.class_of_insurance || 'Other';
    const currency = p.currency || 'USD';
    const exchangeRate = Number(p.exchangeRate) || Number(p.exchange_rate) || 1;
    const commissionPct = Number(p.commissionPercent) || Number(p.commission_percent) || 0;

    // Get NWP or derive from GWP and commission
    const gwpOriginal = Number(p.grossPremium) || Number(p.gross_premium_original) || 0;
    const nwpOriginal = Number(p.netPremium) || Number(p.net_premium_original);
    const gwpUSD = convertToUSD(gwpOriginal, currency, exchangeRate);
    const nwpUSD = nwpOriginal
      ? convertToUSD(nwpOriginal, currency, exchangeRate)
      : gwpUSD * (1 - commissionPct / 100);

    if (!classData[cls]) {
      classData[cls] = { premium: 0, losses: 0, claimCount: 0 };
    }
    classData[cls].premium += nwpUSD;
  });

  // Aggregate claims by class (via policy_id lookup)
  const policyMap = new Map(policies.map(p => [p.id, p]));
  claims.forEach(c => {
    const policy = policyMap.get(c.policy_id);
    if (policy) {
      const cls = policy.classOfInsurance || policy.class_of_insurance || 'Other';
      if (classData[cls]) {
        // imported_total_incurred is the actual column in claims table
        classData[cls].losses += Number(c.imported_total_incurred) || Number(c.total_incurred_our_share) || 0;
        classData[cls].claimCount++;
      }
    }
  });

  return Object.entries(classData)
    .map(([cls, data]) => ({
      class: cls.replace(/^\d+\s*-\s*/, ''),
      earnedPremium: Math.round(data.premium),
      incurredLosses: Math.round(data.losses),
      lossRatio: data.premium > 0 ? Math.round((data.losses / data.premium) * 100) : 0,
      claimCount: data.claimCount,
    }))
    .filter(d => d.earnedPremium > 0)
    .sort((a, b) => b.earnedPremium - a.earnedPremium)
    .slice(0, 10);
}

// =============================================
// LEGACY HOOKS (for backwards compatibility)
// =============================================

export interface KPIData {
  grossWrittenPremium: number;
  netWrittenPremium: number;
  activePolicies: number;
  openClaims: number;
  lossRatio: number;
  avgPremium: number;
}

export interface PremiumTrendData {
  month: string;
  gwp: number;
  nwp: number;
}

export interface LossRatioByClassData {
  class: string;
  earnedPremium: number;
  incurredLosses: number;
  lossRatio: number;
}

export interface TopCedantData {
  name: string;
  premium: number;
  policies: number;
}

export interface RecentClaimData {
  id: string;
  claimNumber: string;
  insuredName: string;
  lossDate: string;
  incurred: number;
  status: string;
}

export const useKPISummary = () => {
  const { data, loading, error } = useAnalyticsSummary();

  const kpiData: KPIData | null = data ? {
    grossWrittenPremium: data.total.grossWrittenPremium,
    netWrittenPremium: data.total.netWrittenPremium,
    activePolicies: data.total.activeCount,
    openClaims: data.claims.openClaims,
    lossRatio: Math.round(data.claims.lossRatio * 10) / 10,
    avgPremium: Math.round(data.total.avgPremium),
  } : null;

  return { data: kpiData, loading, error };
};

export const usePremiumTrend = () => {
  const { data, loading } = useAnalyticsSummary();
  const trendData: PremiumTrendData[] = data?.total.monthlyTrend.map(m => ({
    month: m.month,
    gwp: Math.round(m.gwp),
    nwp: Math.round(m.nwp),
  })) || [];
  return { data: trendData, loading };
};

export const useLossRatioByClass = () => {
  const { data, loading } = useAnalyticsSummary();
  return { data: data?.lossRatioByClass || [], loading };
};

export const useTopCedants = (limit: number = 10) => {
  const { data, loading } = useAnalyticsSummary();
  const topData: TopCedantData[] = data?.total.topCedants.slice(0, limit).map(c => ({
    name: c.name,
    premium: c.premium,
    policies: c.count,
  })) || [];
  return { data: topData, loading };
};

export const useRecentClaims = (limit: number = 10) => {
  const [data, setData] = useState<RecentClaimData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!supabase) {
          setData([]);
          setLoading(false);
          return;
        }

        const { data: claims } = await supabase
          .from('claims')
          .select('id, claim_number, claimant_name, loss_date, imported_total_incurred, status')
          .order('imported_total_incurred', { ascending: false, nullsFirst: false })
          .limit(limit);

        const result = claims?.map(c => ({
          id: c.id,
          claimNumber: c.claim_number,
          insuredName: c.claimant_name || 'Unknown',
          lossDate: c.loss_date,
          incurred: c.imported_total_incurred || 0,
          status: c.status,
        })) || [];

        setData(result);
      } catch (err) {
        console.error('Failed to fetch recent claims:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [limit]);

  return { data, loading };
};
