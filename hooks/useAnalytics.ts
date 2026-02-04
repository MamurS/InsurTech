import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

// Types for analytics data
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

// Hook to fetch KPI summary
export const useKPISummary = () => {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        if (!supabase) {
          // Fallback mock data for development
          setData({
            grossWrittenPremium: 2450000,
            netWrittenPremium: 1890000,
            activePolicies: 156,
            openClaims: 23,
            lossRatio: 58.5,
            avgPremium: 15700
          });
          setLoading(false);
          return;
        }

        // Fetch policies data
        const { data: policies, error: policyError } = await supabase
          .from('policies')
          .select('gross_premium_original, net_premium_original, status')
          .eq('is_deleted', false);

        if (policyError) throw policyError;

        // Fetch claims data
        const { data: claims } = await supabase
          .from('claims')
          .select('status, total_incurred_our_share, total_paid_our_share');

        // Calculate KPIs
        const activePolicies = policies?.filter(p => p.status === 'Active').length || 0;
        const gwp = policies?.reduce((sum, p) => sum + (p.gross_premium_original || 0), 0) || 0;
        const nwp = policies?.reduce((sum, p) => sum + (p.net_premium_original || 0), 0) || 0;
        const openClaims = claims?.filter(c => c.status === 'Open' || c.status === 'Notified').length || 0;
        const totalIncurred = claims?.reduce((sum, c) => sum + (c.total_incurred_our_share || 0), 0) || 0;
        const lossRatio = nwp > 0 ? (totalIncurred / nwp) * 100 : 0;

        setData({
          grossWrittenPremium: gwp,
          netWrittenPremium: nwp,
          activePolicies,
          openClaims,
          lossRatio: Math.round(lossRatio * 10) / 10,
          avgPremium: activePolicies > 0 ? Math.round(gwp / activePolicies) : 0
        });
      } catch (err: any) {
        console.error('Failed to fetch KPIs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  return { data, loading, error };
};

// Hook to fetch premium trend (last 12 months)
export const usePremiumTrend = () => {
  const [data, setData] = useState<PremiumTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        if (!supabase) {
          // Mock data
          const mockData: PremiumTrendData[] = [
            { month: 'Jan', gwp: 180000, nwp: 145000 },
            { month: 'Feb', gwp: 210000, nwp: 168000 },
            { month: 'Mar', gwp: 195000, nwp: 156000 },
            { month: 'Apr', gwp: 240000, nwp: 192000 },
            { month: 'May', gwp: 225000, nwp: 180000 },
            { month: 'Jun', gwp: 260000, nwp: 208000 },
            { month: 'Jul', gwp: 235000, nwp: 188000 },
            { month: 'Aug', gwp: 280000, nwp: 224000 },
            { month: 'Sep', gwp: 255000, nwp: 204000 },
            { month: 'Oct', gwp: 290000, nwp: 232000 },
            { month: 'Nov', gwp: 275000, nwp: 220000 },
            { month: 'Dec', gwp: 310000, nwp: 248000 },
          ];
          setData(mockData);
          setLoading(false);
          return;
        }

        // Fetch policies with inception dates
        const { data: policies, error } = await supabase
          .from('policies')
          .select('inception_date, gross_premium_original, net_premium_original')
          .eq('is_deleted', false)
          .gte('inception_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        // Group by month
        const monthlyData: Record<string, { gwp: number; nwp: number }> = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        policies?.forEach(policy => {
          const date = new Date(policy.inception_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { gwp: 0, nwp: 0 };
          }
          monthlyData[monthKey].gwp += policy.gross_premium_original || 0;
          monthlyData[monthKey].nwp += policy.net_premium_original || 0;
        });

        // Convert to array and sort
        const trendData = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([key, values]) => ({
            month: monthNames[parseInt(key.split('-')[1]) - 1],
            gwp: Math.round(values.gwp),
            nwp: Math.round(values.nwp)
          }));

        setData(trendData);
      } catch (err) {
        console.error('Failed to fetch premium trend:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, []);

  return { data, loading };
};

// Hook to fetch loss ratio by class
export const useLossRatioByClass = () => {
  const [data, setData] = useState<LossRatioByClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!supabase) {
          // Mock data
          setData([
            { class: 'Property', earnedPremium: 850000, incurredLosses: 425000, lossRatio: 50 },
            { class: 'Motor', earnedPremium: 620000, incurredLosses: 434000, lossRatio: 70 },
            { class: 'Liability', earnedPremium: 480000, incurredLosses: 216000, lossRatio: 45 },
            { class: 'Marine', earnedPremium: 320000, incurredLosses: 176000, lossRatio: 55 },
            { class: 'Engineering', earnedPremium: 280000, incurredLosses: 112000, lossRatio: 40 },
          ]);
          setLoading(false);
          return;
        }

        // Fetch policies and claims to compute client-side
        const { data: policies } = await supabase
          .from('policies')
          .select('id, class_of_insurance, net_premium_original')
          .eq('is_deleted', false);

        const { data: claims } = await supabase
          .from('claims')
          .select('policy_id, total_incurred_our_share');

        // Group by class
        const classData: Record<string, { premium: number; losses: number }> = {};

        policies?.forEach(policy => {
          const cls = policy.class_of_insurance || 'Other';
          if (!classData[cls]) {
            classData[cls] = { premium: 0, losses: 0 };
          }
          classData[cls].premium += policy.net_premium_original || 0;
        });

        claims?.forEach(claim => {
          const policy = policies?.find(p => p.id === claim.policy_id);
          if (policy) {
            const cls = policy.class_of_insurance || 'Other';
            if (classData[cls]) {
              classData[cls].losses += claim.total_incurred_our_share || 0;
            }
          }
        });

        const result = Object.entries(classData)
          .map(([cls, values]) => ({
            class: cls.replace(/^\d+\s*-\s*/, ''), // Remove "01 - " prefix
            earnedPremium: Math.round(values.premium),
            incurredLosses: Math.round(values.losses),
            lossRatio: values.premium > 0 ? Math.round((values.losses / values.premium) * 100) : 0
          }))
          .filter(d => d.earnedPremium > 0)
          .sort((a, b) => b.earnedPremium - a.earnedPremium)
          .slice(0, 8);

        setData(result);
      } catch (err) {
        console.error('Failed to fetch loss ratio by class:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading };
};

// Hook to fetch top cedants/insureds
export const useTopCedants = (limit: number = 10) => {
  const [data, setData] = useState<TopCedantData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!supabase) {
          // Mock data
          setData([
            { name: 'Uzbekistan Airways', premium: 450000, policies: 5 },
            { name: 'Almalyk MMC', premium: 380000, policies: 3 },
            { name: 'Navoi Mining', premium: 320000, policies: 4 },
            { name: 'UzAuto Motors', premium: 285000, policies: 6 },
            { name: 'Coca-Cola Uzbekistan', premium: 245000, policies: 2 },
          ]);
          setLoading(false);
          return;
        }

        const { data: policies, error } = await supabase
          .from('policies')
          .select('insured_name, gross_premium_original')
          .eq('is_deleted', false);

        if (error) throw error;

        // Group by insured name
        const cedantData: Record<string, { premium: number; count: number }> = {};

        policies?.forEach(policy => {
          const name = policy.insured_name || 'Unknown';
          if (!cedantData[name]) {
            cedantData[name] = { premium: 0, count: 0 };
          }
          cedantData[name].premium += policy.gross_premium_original || 0;
          cedantData[name].count += 1;
        });

        const result = Object.entries(cedantData)
          .map(([name, values]) => ({
            name,
            premium: Math.round(values.premium),
            policies: values.count
          }))
          .sort((a, b) => b.premium - a.premium)
          .slice(0, limit);

        setData(result);
      } catch (err) {
        console.error('Failed to fetch top cedants:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [limit]);

  return { data, loading };
};

// Hook to fetch recent/large claims
export const useRecentClaims = (limit: number = 10) => {
  const [data, setData] = useState<RecentClaimData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!supabase) {
          // Mock data
          setData([
            { id: '1', claimNumber: 'CLM-2026-001', insuredName: 'ABC Corp', lossDate: '2026-01-15', incurred: 125000, status: 'Open' },
            { id: '2', claimNumber: 'CLM-2026-002', insuredName: 'XYZ Ltd', lossDate: '2026-01-20', incurred: 85000, status: 'Open' },
            { id: '3', claimNumber: 'CLM-2025-089', insuredName: 'Demo Inc', lossDate: '2025-12-10', incurred: 210000, status: 'Closed' },
          ]);
          setLoading(false);
          return;
        }

        const { data: claims, error } = await supabase
          .from('claims')
          .select('id, claim_number, claimant_name, loss_date, total_incurred_our_share, status')
          .order('total_incurred_our_share', { ascending: false })
          .limit(limit);

        if (error) throw error;

        const result = claims?.map(c => ({
          id: c.id,
          claimNumber: c.claim_number,
          insuredName: c.claimant_name || 'Unknown',
          lossDate: c.loss_date,
          incurred: c.total_incurred_our_share || 0,
          status: c.status
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
