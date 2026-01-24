
import { Policy, Clause, ReinsuranceSlip, PolicyTemplate, User, DEFAULT_PERMISSIONS } from '../types';
import { supabase } from './supabase';

// Local storage keys (Fallback for when no API keys are provided)
const POLICIES_KEY = 'insurtech_policies_v2';
const CLAUSES_KEY = 'insurtech_clauses_v2';
const SLIPS_KEY = 'insurtech_slips_v2';
const TEMPLATES_KEY = 'insurtech_templates_v2';
const USERS_KEY = 'insurtech_users_v2';

// Helper to check connection status
const isSupabaseEnabled = () => {
  return !!supabase;
};

// --- DATA ADAPTERS ---
// These map the new Frontend types (Channel, Intermediary) to the potentially old Database Schema (recordType)
// ensuring backward compatibility and preventing save errors.

const toAppPolicy = (dbRecord: any): Policy => {
  // If the record already has 'channel', use it. Otherwise, derive from 'recordType'.
  const derivedChannel = dbRecord.channel || (dbRecord.recordType === 'Inward' ? 'Inward' : 'Direct');
  
  // Map broker info
  const derivedIntermediaryType = dbRecord.intermediaryType || (dbRecord.brokerName ? 'Broker' : 'Direct');
  const derivedIntermediaryName = dbRecord.intermediaryName || dbRecord.brokerName;

  return {
    ...dbRecord,
    channel: derivedChannel,
    intermediaryType: derivedIntermediaryType,
    intermediaryName: derivedIntermediaryName,
    // Ensure numeric values are numbers
    sumInsured: Number(dbRecord.sumInsured || 0),
    grossPremium: Number(dbRecord.grossPremium || 0),
    ourShare: Number(dbRecord.ourShare || 100),
  } as Policy;
};

const toDbPolicy = (policy: Policy): any => {
  return {
    ...policy,
    // Map new fields BACK to old fields to satisfy DB constraints (NOT NULL columns)
    recordType: policy.channel, 
    brokerName: policy.intermediaryName, // Sync intermediary name to legacy broker column
    
    // Explicitly ensure numeric fields are safe
    sumInsured: policy.sumInsured || 0,
    grossPremium: policy.grossPremium || 0
  };
};

export const DB = {
  // --- Policies ---
  getPolicies: async (): Promise<Policy[]> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase!.from('policies').select('*').order('created_at', { ascending: false });
      if (error) { console.error("Supabase Error:", error); return []; }
      return (data || []).map(toAppPolicy);
    }
    return getLocal(POLICIES_KEY, []);
  },

  getAllPolicies: async (): Promise<Policy[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('policies').select('*');
      return (data || []).map(toAppPolicy);
    }
    return getLocal(POLICIES_KEY, []);
  },

  getPolicy: async (id: string): Promise<Policy | undefined> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase!.from('policies').select('*').eq('id', id).single();
      if (error || !data) return undefined;
      return toAppPolicy(data);
    }
    const policies = getLocal(POLICIES_KEY, []);
    return policies.find((p: Policy) => p.id === id);
  },

  savePolicy: async (policy: Policy): Promise<void> => {
    if (isSupabaseEnabled()) {
      const dbPayload = toDbPolicy(policy);
      const { error } = await supabase!.from('policies').upsert(dbPayload);
      if (error) {
          console.error("Save Policy Error", error);
          throw error;
      }
      return;
    }
    const policies = getLocal(POLICIES_KEY, [] as Policy[]);
    const index = policies.findIndex((p: Policy) => p.id === policy.id);
    if (index >= 0) policies[index] = policy;
    else policies.push(policy);
    localStorage.setItem(POLICIES_KEY, JSON.stringify(policies));
  },

  deletePolicy: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('policies').update({ isDeleted: true }).eq('id', id);
      return;
    }
    const policies = getLocal(POLICIES_KEY, [] as Policy[]);
    const policy = policies.find((p: Policy) => p.id === id);
    if (policy) {
        policy.isDeleted = true;
        localStorage.setItem(POLICIES_KEY, JSON.stringify(policies));
    }
  },

  // --- Admin: Policy Management ---
  getDeletedPolicies: async (): Promise<Policy[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('policies').select('*').eq('isDeleted', true);
      return (data || []).map(toAppPolicy);
    }
    return getLocal(POLICIES_KEY, [] as Policy[]).filter((p: Policy) => p.isDeleted);
  },

  restorePolicy: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('policies').update({ isDeleted: false }).eq('id', id);
      return;
    }
    const policies = getLocal(POLICIES_KEY, [] as Policy[]);
    const policy = policies.find((p: Policy) => p.id === id);
    if (policy) {
        policy.isDeleted = false;
        localStorage.setItem(POLICIES_KEY, JSON.stringify(policies));
    }
  },

  hardDeletePolicy: async (id: string): Promise<void> => {
     if (isSupabaseEnabled()) {
      await supabase!.from('policies').delete().eq('id', id);
      return;
    }
    let policies = getLocal(POLICIES_KEY, [] as Policy[]);
    policies = policies.filter((p: Policy) => p.id !== id);
    localStorage.setItem(POLICIES_KEY, JSON.stringify(policies));
  },

  // --- Clauses ---
  getClauses: async (): Promise<Clause[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('clauses').select('*');
      return (data as Clause[] || []);
    }
    return getLocal(CLAUSES_KEY, []);
  },

  getAllClauses: async (): Promise<Clause[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('clauses').select('*');
      return data as Clause[] || [];
    }
    return getLocal(CLAUSES_KEY, []);
  },

  saveClause: async (clause: Clause): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('clauses').upsert(clause);
       return;
    }
    const clauses = getLocal(CLAUSES_KEY, [] as Clause[]);
    const index = clauses.findIndex((c: Clause) => c.id === clause.id);
    if (index >= 0) clauses[index] = clause;
    else clauses.push(clause);
    localStorage.setItem(CLAUSES_KEY, JSON.stringify(clauses));
  },

  deleteClause: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('clauses').update({ isDeleted: true }).eq('id', id);
      return;
    }
    const clauses = getLocal(CLAUSES_KEY, [] as Clause[]);
    const clause = clauses.find((c: Clause) => c.id === id);
    if (clause) {
        clause.isDeleted = true;
        localStorage.setItem(CLAUSES_KEY, JSON.stringify(clauses));
    }
  },

  getDeletedClauses: async (): Promise<Clause[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('clauses').select('*').eq('isDeleted', true);
      return data as Clause[] || [];
    }
    return getLocal(CLAUSES_KEY, [] as Clause[]).filter((c: Clause) => c.isDeleted);
  },

  restoreClause: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('clauses').update({ isDeleted: false }).eq('id', id);
      return;
    }
    const clauses = getLocal(CLAUSES_KEY, [] as Clause[]);
    const clause = clauses.find((c: Clause) => c.id === id);
    if (clause) {
        clause.isDeleted = false;
        localStorage.setItem(CLAUSES_KEY, JSON.stringify(clauses));
    }
  },

  hardDeleteClause: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('clauses').delete().eq('id', id);
      return;
    }
    let clauses = getLocal(CLAUSES_KEY, [] as Clause[]);
    clauses = clauses.filter((c: Clause) => c.id !== id);
    localStorage.setItem(CLAUSES_KEY, JSON.stringify(clauses));
  },

  // --- Templates ---
  getTemplates: async (): Promise<PolicyTemplate[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('templates').select('*');
      return (data as PolicyTemplate[] || []);
    }
    return getLocal(TEMPLATES_KEY, []);
  },

  saveTemplate: async (template: PolicyTemplate): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('templates').upsert(template);
       return;
    }
    const templates = getLocal(TEMPLATES_KEY, [] as PolicyTemplate[]);
    const index = templates.findIndex((t: PolicyTemplate) => t.id === template.id);
    if (index >= 0) templates[index] = template;
    else templates.push(template);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  },

  deleteTemplate: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('templates').delete().eq('id', id);
      return;
    }
    let templates = getLocal(TEMPLATES_KEY, [] as PolicyTemplate[]);
    templates = templates.filter((t: PolicyTemplate) => t.id !== id);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  },

  // --- Slips ---
  getSlips: async (): Promise<ReinsuranceSlip[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('slips').select('*').order('created_at', { ascending: false });
      return (data as ReinsuranceSlip[] || []);
    }
    return getLocal(SLIPS_KEY, []);
  },

  getAllSlips: async (): Promise<ReinsuranceSlip[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('slips').select('*');
      return data as ReinsuranceSlip[] || [];
    }
    return getLocal(SLIPS_KEY, []);
  },

  getSlip: async (id: string): Promise<ReinsuranceSlip | undefined> => {
     if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('slips').select('*').eq('id', id).single();
      return data as ReinsuranceSlip;
    }
    const slips = getLocal(SLIPS_KEY, [] as ReinsuranceSlip[]);
    return slips.find((s: ReinsuranceSlip) => s.id === id);
  },

  saveSlip: async (slip: ReinsuranceSlip): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('slips').upsert(slip);
       return;
    }
    const slips = getLocal(SLIPS_KEY, [] as ReinsuranceSlip[]);
    const index = slips.findIndex((s: ReinsuranceSlip) => s.id === slip.id);
    if (index >= 0) slips[index] = slip;
    else slips.push(slip);
    localStorage.setItem(SLIPS_KEY, JSON.stringify(slips));
  },

  deleteSlip: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      // Soft delete
      await supabase!.from('slips').update({ isDeleted: true }).eq('id', id);
      return;
    }
    const slips = getLocal(SLIPS_KEY, [] as ReinsuranceSlip[]);
    const slip = slips.find((s: ReinsuranceSlip) => s.id === id);
    if (slip) {
        slip.isDeleted = true;
        localStorage.setItem(SLIPS_KEY, JSON.stringify(slips));
    }
  },

  getDeletedSlips: async (): Promise<ReinsuranceSlip[]> => {
    if (isSupabaseEnabled()) {
       const { data } = await supabase!.from('slips').select('*').eq('isDeleted', true);
       return data as ReinsuranceSlip[] || [];
    }
    return getLocal(SLIPS_KEY, [] as ReinsuranceSlip[]).filter((s: ReinsuranceSlip) => s.isDeleted);
  },

  restoreSlip: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('slips').update({ isDeleted: false }).eq('id', id);
       return;
    }
    const slips = getLocal(SLIPS_KEY, [] as ReinsuranceSlip[]);
    const slip = slips.find((s: ReinsuranceSlip) => s.id === id);
    if (slip) {
        slip.isDeleted = false;
        localStorage.setItem(SLIPS_KEY, JSON.stringify(slips));
    }
  },

  hardDeleteSlip: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('slips').delete().eq('id', id);
      return;
    }
    let slips = getLocal(SLIPS_KEY, [] as ReinsuranceSlip[]);
    slips = slips.filter((s: ReinsuranceSlip) => s.id !== id);
    localStorage.setItem(SLIPS_KEY, JSON.stringify(slips));
  },

  // --- User Management ---
  getUsers: async (): Promise<User[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('users').select('*');
      return data as User[] || [];
    }
    return getLocal(USERS_KEY, SEED_USERS);
  },

  saveUser: async (user: User): Promise<void> => {
    if (isSupabaseEnabled()) {
       const { error } = await supabase!.from('users').upsert({
           id: user.id,
           email: user.email,
           name: user.name,
           role: user.role,
           avatarUrl: user.avatarUrl,
           permissions: user.permissions,
           lastLogin: user.lastLogin
       });
       if (error) throw error;
       return;
    }
    const users = getLocal(USERS_KEY, SEED_USERS);
    const index = users.findIndex((u: User) => u.id === user.id);
    if (index >= 0) users[index] = user;
    else users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  deleteUser: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('users').delete().eq('id', id);
      return;
    }
    let users = getLocal(USERS_KEY, SEED_USERS);
    users = users.filter((u: User) => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

const SEED_USERS: User[] = [
  {
    id: 'user_admin_001',
    email: 'admin2026',
    password: 'X7#k9@mP2$vL5nQ!', 
    name: 'Super Administrator',
    role: 'Super Admin',
    avatarUrl: 'SA',
    lastLogin: new Date().toISOString(),
    permissions: DEFAULT_PERMISSIONS['Super Admin']
  }
];

const getLocal = <T>(key: string, seed: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(stored);
};
