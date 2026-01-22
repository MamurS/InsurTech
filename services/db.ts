
import { Policy, Clause, ReinsuranceSlip, Currency, PolicyStatus, PaymentStatus, PolicyTemplate, User, DEFAULT_PERMISSIONS } from '../types';
import { supabase } from './supabase';

// Updated keys to version 2 to clear legacy data/credentials
const POLICIES_KEY = 'insurtech_policies_v2';
const CLAUSES_KEY = 'insurtech_clauses_v2';
const SLIPS_KEY = 'insurtech_slips_v2';
const TEMPLATES_KEY = 'insurtech_templates_v2';
const USERS_KEY = 'insurtech_users_v2';

const isSupabaseEnabled = () => !!supabase;

// Mock Data
const SEED_USERS: User[] = [
  {
    id: 'user_admin_001',
    email: 'admin2026',
    password: 'X7#k9@mP2$vL5nQ!', // Strong password generated for Super Admin
    name: 'Super Administrator',
    role: 'Super Admin',
    avatarUrl: 'SA',
    lastLogin: new Date().toISOString(),
    permissions: DEFAULT_PERMISSIONS['Super Admin']
  },
  {
    id: 'user_uw_002',
    email: 'underwriter@insurtech.com',
    password: 'password123',
    name: 'Senior Underwriter',
    role: 'Underwriter',
    avatarUrl: 'UW',
    lastLogin: new Date().toISOString(),
    permissions: DEFAULT_PERMISSIONS['Underwriter']
  },
  {
    id: 'user_viewer_003',
    email: 'auditor@insurtech.com',
    password: 'password123',
    name: 'External Auditor',
    role: 'Viewer',
    avatarUrl: 'EA',
    lastLogin: new Date().toISOString(),
    permissions: DEFAULT_PERMISSIONS['Viewer']
  }
];

const SEED_POLICIES: Policy[] = [
  // 1. Direct Insurance
  {
    id: '1',
    recordType: 'Direct',
    policyNumber: 'AIC/D/PROP/2023/001',
    agreementNumber: 'AIC/D/TPRP/00000016/0621/001',
    accountingDate: '2023-06-21',
    insuredName: 'Textile Manufacturing Corp',
    insuredAddress: 'Tashkent Industrial Zone',
    brokerName: 'Direct',
    industry: 'Textile',
    classOfInsurance: '8,9', // Class Code
    typeOfInsurance: 'Property Damage', // Type
    riskCode: '13',
    territory: 'Uzbekistan',
    city: 'Tashkent',
    jurisdiction: 'Uzbekistan',
    
    currency: Currency.USD,
    exchangeRate: 10567.60,
    
    sumInsured: 525000.00,
    sumInsuredNational: 5547990000.00,
    
    premiumRate: 0.70,
    grossPremium: 3675.00,
    premiumNationalCurrency: 38835930.00,
    
    commissionPercent: 0,
    netPremium: 3675.00,
    
    inceptionDate: '2023-06-21',
    expiryDate: '2024-06-20',
    issueDate: '2023-06-21',
    warrantyPeriod: 365,
    
    receivedPremiumForeign: 3675.00,
    receivedPremiumNational: 38835930.00,
    paymentDate: '2023-06-30',
    
    status: PolicyStatus.ACTIVE,
    paymentStatus: PaymentStatus.PAID,
    ourShare: 100,
    installments: [],
    claims: [],
    selectedClauseIds: ['c1', 'c2'],
    deductible: 'USD 5,000 each and every loss',
    isDeleted: false
  },
  // 2. Outward Reinsurance
  {
    id: '2',
    recordType: 'Outward',
    policyNumber: 'AIC/OUT/2023/045',
    slipNumber: 'RE/05/2021/01',
    agreementNumber: 'FAC/OUT/001',
    dateOfSlip: '2023-05-15',
    accountingDate: '2023-05-20',
    
    insuredName: 'Global Tech Solutions',
    reinsurerName: 'Lockton SCOR', 
    brokerName: 'Marsh',
    reinsurerRating: 'A+',
    
    industry: 'Technology',
    classOfInsurance: 'Professional Liability',
    typeOfInsurance: 'PI',
    territory: 'Worldwide',
    jurisdiction: 'UK',
    
    currency: Currency.USD,
    exchangeRate: 1,
    
    // Original (100%)
    sumInsured: 1000000.00,
    sumInsuredNational: 1000000.00,
    grossPremium: 15000.00, // 100% Premium
    premiumNationalCurrency: 15000.00,
    
    // Ceded (85% to Reinsurer)
    ourShare: 85, // Ceded Share
    sumReinsuredForeign: 850000.00, // 85% of 1M
    sumReinsuredNational: 850000.00,
    cededPremiumForeign: 12750.00, // 85% of 15k
    cededPremiumNational: 12750.00,
    
    reinsuranceCommission: 15, // Commission we receive
    netReinsurancePremium: 10837.50, // 12750 - 15% Comm
    
    commissionPercent: 0,
    netPremium: 15000.00,

    inceptionDate: '2023-06-01',
    expiryDate: '2024-05-31',
    issueDate: '2023-05-20',
    status: PolicyStatus.ACTIVE,
    paymentStatus: PaymentStatus.PENDING,
    
    installments: [],
    claims: [],
    selectedClauseIds: ['c1'],
    deductible: 'USD 25,000',
    isDeleted: false
  },
  // 3. Inward Reinsurance (Rich Data)
  {
    id: '3',
    recordType: 'Inward',
    policyNumber: 'AIC/IN/2023/88',
    slipNumber: 'FAC/KAP/002',
    dateOfSlip: '2023-02-15',
    accountingDate: '2023-02-28',
    agreementNumber: 'AGR-2023-999',
    
    cedantName: 'Kapital Sugurta',
    retrocedent: 'N/A',
    insuredName: 'Big Construction LLC',
    borrower: 'Big Construction LLC',
    performer: 'John Doe',
    
    industry: 'Construction',
    classOfInsurance: 'Engineering',
    typeOfInsurance: 'CAR',
    insuredRisk: 'Construction of 5-star Hotel',
    territory: 'Uzbekistan',
    jurisdiction: 'Uzbekistan',
    
    currency: Currency.EUR,
    exchangeRate: 12400,
    equivalentUSD: 27000.00,
    
    sumInsured: 5000000.00,
    sumInsuredNational: 62000000000.00,
    
    limitForeignCurrency: 1000000.00,
    limitNationalCurrency: 12400000000.00,
    excessForeignCurrency: 5000.00,
    prioritySum: 0,
    
    grossPremium: 25000.00, // Gross Reinsurance Premium
    premiumNationalCurrency: 310000000.00,
    
    inceptionDate: '2023-03-01',
    expiryDate: '2024-09-01',
    reinsuranceInceptionDate: '2023-03-01',
    reinsuranceExpiryDate: '2024-09-01',
    issueDate: '2023-02-28',
    
    status: PolicyStatus.ACTIVE,
    paymentStatus: PaymentStatus.PARTIAL,
    paymentDate: '2023-04-01',
    
    ourShare: 25, // MIG Share
    reinsuranceCommission: 20,
    netReinsurancePremium: 5000.00, 
    
    sumReinsuredForeign: 1250000.00, // 25% of 5M
    sumReinsuredNational: 15500000000.00,
    receivedPremiumForeign: 4000.00,
    
    treatyPlacement: 'QS Treaty 2023',
    treatyPremium: 500.00,
    aicCommission: 5,
    aicRetention: 10,
    aicPremium: 2000.00,
    
    numberOfSlips: 1,
    reinsurerRating: 'A-',
    invoiceIssued: true,
    bordereauNo: 'BORD-001',

    commissionPercent: 20,
    netPremium: 20000.00,
    installments: [],
    claims: [],
    selectedClauseIds: ['c5'],
    deductible: 'EUR 1,000',
    isDeleted: false
  }
];

const SEED_CLAUSES: Clause[] = [
  {
    id: 'c1',
    title: 'Sanctions Limitation and Exclusion Clause',
    content: 'No (re)insurer shall be deemed to provide cover and no (re)insurer shall be liable to pay any claim or provide any benefit hereunder to the extent that the provision of such cover, payment of such claim or provision of such benefit would expose that (re)insurer to any sanction, prohibition or restriction under United Nations resolutions or the trade or economic sanctions, laws or regulations of the European Union, United Kingdom or United States of America.',
    category: 'Exclusion',
    isStandard: true,
    isDeleted: false
  },
  {
    id: 'c2',
    title: 'Cyber Clarification Clause',
    content: 'Property damage caused by cyber attack is excluded unless physical damage ensues directly from fire or explosion.',
    category: 'Exclusion',
    isStandard: true,
    isDeleted: false
  },
  {
    id: 'c3',
    title: 'Premium Payment Warranty',
    content: 'It is a condition precedent to liability that the premium must be paid in full within 60 days of inception.',
    category: 'Warranty',
    isStandard: true,
    isDeleted: false
  },
  {
    id: 'c4',
    title: 'Professional Indemnity Retroactive Date',
    content: 'This policy covers claims made against the insured for wrongful acts committed after the Retroactive Date specified in the Schedule.',
    category: 'Condition',
    isStandard: false,
    isDeleted: false
  },
  {
    id: 'c5',
    title: 'Maintenance Period Clause',
    content: 'The insurance cover extends to the maintenance period of 12 months following the completion of the project.',
    category: 'Condition',
    isStandard: false,
    isDeleted: false
  }
];

const SEED_SLIPS: ReinsuranceSlip[] = [
  { id: '1', slipNumber: 'RE/05/2021/01', date: '2021-05-01', insuredName: 'Company A', brokerReinsurer: 'A', isDeleted: false },
  { id: '2', slipNumber: 'RE/05/2021/02', date: '2021-05-01', insuredName: 'Company B', brokerReinsurer: 'A', isDeleted: false },
  { id: '3', slipNumber: 'RE/11/2021/02', date: '2021-10-22', insuredName: 'Company B', brokerReinsurer: 'Lockton', isDeleted: false },
  { id: '4', slipNumber: 'RE/11/2021/03', date: '2021-10-22', insuredName: 'Company B', brokerReinsurer: 'C', isDeleted: false },
  { id: '5', slipNumber: 'RE/01/2022/01', date: '2022-01-08', insuredName: 'Company C', brokerReinsurer: 'Lockton', isDeleted: false },
];

const SEED_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'tpl_standard_01',
    name: 'General Insurance Agreement',
    description: 'Standard template for property and general liability policies.',
    content: `
      <div style="font-family: serif; line-height: 1.6;">
        <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 40px; text-transform: uppercase;">Insurance Policy Schedule</h1>
        
        <p><strong>Policy Number:</strong> {{policyNumber}}</p>
        <p><strong>Insured Name:</strong> {{insuredName}}</p>
        <p><strong>Address:</strong> {{insuredAddress}}</p>
        
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ccc;">

        <p><strong>Period of Insurance:</strong><br>
        From: {{inceptionDate}}<br>
        To: {{expiryDate}}<br>
        (Both days inclusive local standard time at the address of the Insured)</p>

        <p><strong>Interest/Occupation:</strong><br>
        {{industry}} - {{classOfInsurance}}</p>

        <p><strong>Territorial Limits:</strong><br>
        {{territory}}</p>

        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ccc;">

        <p><strong>Sum Insured:</strong><br>
        {{currency}} {{sumInsured}}</p>

        <p><strong>Deductible / Excess:</strong><br>
        {{deductible}}</p>

        <p><strong>Premium:</strong><br>
        Gross Premium: {{currency}} {{grossPremium}}</p>

        <br><br>
        <p><strong>In witness whereof</strong>, the undersigned being fully authorized by the Insurer has signed this Policy on behalf of the InsurTech Solutions.</p>
        
        <br>
        <div style="margin-top: 50px;">
          <p><strong>Date of Issue:</strong> {{issueDate}}</p>
          <div style="margin-top: 40px; border-bottom: 1px solid black; width: 300px;"></div>
          <p>Authorized Signatory</p>
        </div>
      </div>
    `,
    isDeleted: false
  },
  {
    id: 'tpl_motor_01',
    name: 'Motor Fleet Certificate',
    description: 'Specific template for vehicle fleet insurance.',
    content: `
       <div style="font-family: sans-serif;">
         <div style="border: 2px solid #000; padding: 20px;">
           <h2 style="text-align: center;">CERTIFICATE OF MOTOR INSURANCE</h2>
           <p style="text-align: center; font-size: 12px;">Certificate Number: {{policyNumber}}</p>
           
           <table style="width: 100%; margin-top: 30px; border-collapse: collapse;">
             <tr>
               <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 40%;"><strong>1. Name of Policyholder:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #ddd;">{{insuredName}}</td>
             </tr>
              <tr>
               <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>2. Effective Date:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #ddd;">{{inceptionDate}}</td>
             </tr>
              <tr>
               <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>3. Date of Expiry:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #ddd;">{{expiryDate}}</td>
             </tr>
             <tr>
               <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>4. Vehicles Insured:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #ddd;">Any motor vehicle the property of the policyholder or for which they are legally responsible.</td>
             </tr>
           </table>

           <p style="margin-top: 30px; font-size: 11px;">
             I hereby certify that the policy to which this Certificate relates satisfies the requirements of the relevant law applicable in {{territory}}.
           </p>

           <div style="margin-top: 50px; text-align: right;">
             <p style="font-weight: bold;">InsurTech Solutions</p>
             <p>Authorised Insurers</p>
           </div>
         </div>
       </div>
    `,
    isDeleted: false
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

export const DB = {
  // --- Policies ---
  getPolicies: async (): Promise<Policy[]> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase!.from('policies').select('*');
      if (error) { console.error(error); return []; }
      return (data as unknown as Policy[]);
    }
    return getLocal(POLICIES_KEY, SEED_POLICIES);
  },

  getAllPolicies: async (): Promise<Policy[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('policies').select('*');
      return data as unknown as Policy[] || [];
    }
    return getLocal(POLICIES_KEY, SEED_POLICIES);
  },

  getPolicy: async (id: string): Promise<Policy | undefined> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase!.from('policies').select('*').eq('id', id).single();
      if (error) return undefined;
      return data as unknown as Policy;
    }
    const policies = getLocal(POLICIES_KEY, SEED_POLICIES);
    return policies.find(p => p.id === id);
  },

  savePolicy: async (policy: Policy): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('policies').upsert(policy);
      return;
    }
    const policies = getLocal(POLICIES_KEY, SEED_POLICIES);
    const index = policies.findIndex(p => p.id === policy.id);
    if (index >= 0) policies[index] = policy;
    else policies.push(policy);
    localStorage.setItem(POLICIES_KEY, JSON.stringify(policies));
  },

  deletePolicy: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      // Soft delete
      await supabase!.from('policies').update({ isDeleted: true }).eq('id', id);
      return;
    }
    const policies = getLocal(POLICIES_KEY, SEED_POLICIES);
    const policy = policies.find(p => p.id === id);
    if (policy) {
        policy.isDeleted = true;
        localStorage.setItem(POLICIES_KEY, JSON.stringify(policies));
    }
  },

  // --- Admin: Policy Management ---
  getDeletedPolicies: async (): Promise<Policy[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('policies').select('*').eq('isDeleted', true);
      return data as unknown as Policy[] || [];
    }
    return getLocal(POLICIES_KEY, SEED_POLICIES).filter(p => p.isDeleted);
  },

  restorePolicy: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('policies').update({ isDeleted: false }).eq('id', id);
      return;
    }
    const policies = getLocal(POLICIES_KEY, SEED_POLICIES);
    const policy = policies.find(p => p.id === id);
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
    let policies = getLocal(POLICIES_KEY, SEED_POLICIES);
    policies = policies.filter(p => p.id !== id);
    localStorage.setItem(POLICIES_KEY, JSON.stringify(policies));
  },

  // --- Clauses ---
  getClauses: async (): Promise<Clause[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('clauses').select('*');
      return (data as unknown as Clause[] || []);
    }
    return getLocal(CLAUSES_KEY, SEED_CLAUSES);
  },

  getAllClauses: async (): Promise<Clause[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('clauses').select('*');
      return data as unknown as Clause[] || [];
    }
    return getLocal(CLAUSES_KEY, SEED_CLAUSES);
  },

  saveClause: async (clause: Clause): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('clauses').upsert(clause);
       return;
    }
    const clauses = getLocal(CLAUSES_KEY, SEED_CLAUSES);
    const index = clauses.findIndex(c => c.id === clause.id);
    if (index >= 0) clauses[index] = clause;
    else clauses.push(clause);
    localStorage.setItem(CLAUSES_KEY, JSON.stringify(clauses));
  },

  deleteClause: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      // Soft delete
      await supabase!.from('clauses').update({ isDeleted: true }).eq('id', id);
      return;
    }
    const clauses = getLocal(CLAUSES_KEY, SEED_CLAUSES);
    const clause = clauses.find(c => c.id === id);
    if (clause) {
        clause.isDeleted = true;
        localStorage.setItem(CLAUSES_KEY, JSON.stringify(clauses));
    }
  },

  // --- Admin: Clause Management ---
  getDeletedClauses: async (): Promise<Clause[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('clauses').select('*').eq('isDeleted', true);
      return data as unknown as Clause[] || [];
    }
    return getLocal(CLAUSES_KEY, SEED_CLAUSES).filter(c => c.isDeleted);
  },

  restoreClause: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('clauses').update({ isDeleted: false }).eq('id', id);
      return;
    }
    const clauses = getLocal(CLAUSES_KEY, SEED_CLAUSES);
    const clause = clauses.find(c => c.id === id);
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
    let clauses = getLocal(CLAUSES_KEY, SEED_CLAUSES);
    clauses = clauses.filter(c => c.id !== id);
    localStorage.setItem(CLAUSES_KEY, JSON.stringify(clauses));
  },

  // --- Templates ---
  getTemplates: async (): Promise<PolicyTemplate[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('templates').select('*');
      return (data as unknown as PolicyTemplate[] || []);
    }
    return getLocal(TEMPLATES_KEY, SEED_TEMPLATES);
  },

  saveTemplate: async (template: PolicyTemplate): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('templates').upsert(template);
       return;
    }
    const templates = getLocal(TEMPLATES_KEY, SEED_TEMPLATES);
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) templates[index] = template;
    else templates.push(template);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  },

  deleteTemplate: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.from('templates').delete().eq('id', id);
      return;
    }
    let templates = getLocal(TEMPLATES_KEY, SEED_TEMPLATES);
    templates = templates.filter(t => t.id !== id);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  },

  // --- Slips ---
  getSlips: async (): Promise<ReinsuranceSlip[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('slips').select('*');
      return (data as unknown as ReinsuranceSlip[] || []);
    }
    return getLocal(SLIPS_KEY, SEED_SLIPS);
  },

  getAllSlips: async (): Promise<ReinsuranceSlip[]> => {
    if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('slips').select('*');
      return data as unknown as ReinsuranceSlip[] || [];
    }
    return getLocal(SLIPS_KEY, SEED_SLIPS);
  },

  getSlip: async (id: string): Promise<ReinsuranceSlip | undefined> => {
     if (isSupabaseEnabled()) {
      const { data } = await supabase!.from('slips').select('*').eq('id', id).single();
      return data as unknown as ReinsuranceSlip;
    }
    const slips = getLocal(SLIPS_KEY, SEED_SLIPS);
    return slips.find(s => s.id === id);
  },

  saveSlip: async (slip: ReinsuranceSlip): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('slips').upsert(slip);
       return;
    }
    const slips = getLocal(SLIPS_KEY, SEED_SLIPS);
    const index = slips.findIndex(s => s.id === slip.id);
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
    const slips = getLocal(SLIPS_KEY, SEED_SLIPS);
    const slip = slips.find(s => s.id === id);
    if (slip) {
        slip.isDeleted = true;
        localStorage.setItem(SLIPS_KEY, JSON.stringify(slips));
    }
  },

   // --- Admin: Slip Management ---
  getDeletedSlips: async (): Promise<ReinsuranceSlip[]> => {
    if (isSupabaseEnabled()) {
       const { data } = await supabase!.from('slips').select('*').eq('isDeleted', true);
       return data as unknown as ReinsuranceSlip[] || [];
    }
    return getLocal(SLIPS_KEY, SEED_SLIPS).filter(s => s.isDeleted);
  },

  restoreSlip: async (id: string): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('slips').update({ isDeleted: false }).eq('id', id);
       return;
    }
    const slips = getLocal(SLIPS_KEY, SEED_SLIPS);
    const slip = slips.find(s => s.id === id);
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
    let slips = getLocal(SLIPS_KEY, SEED_SLIPS);
    slips = slips.filter(s => s.id !== id);
    localStorage.setItem(SLIPS_KEY, JSON.stringify(slips));
  },

  // --- User Management ---
  getUsers: async (): Promise<User[]> => {
    if (isSupabaseEnabled()) {
      // Real auth would check supabase.auth.users() which isn't directly accessible via client usually,
      // but for this pattern we might store profile data in a table.
      const { data } = await supabase!.from('users').select('*');
      return data as unknown as User[] || [];
    }
    return getLocal(USERS_KEY, SEED_USERS);
  },

  saveUser: async (user: User): Promise<void> => {
    if (isSupabaseEnabled()) {
       await supabase!.from('users').upsert(user);
       return;
    }
    const users = getLocal(USERS_KEY, SEED_USERS);
    const index = users.findIndex(u => u.id === user.id);
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
    users = users.filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};
