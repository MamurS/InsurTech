
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  UZS = 'UZS',
  GBP = 'GBP',
}

export enum PolicyStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending Confirmation', // Firm Order received, waiting for signed slip
  ACTIVE = 'Active', // Bound / Signed
  NTU = 'Not Taken Up', // Deal failed before signing
  EXPIRED = 'Expired',
  CANCELLED = 'Cancelled', // Cancelled after being active
  EARLY_TERMINATION = 'Early Termination', // Terminated early with reason
}

export enum PaymentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  PARTIAL = 'Partial',
}

// Restructured Architecture types
export type Channel = 'Direct' | 'Inward';
export type IntermediaryType = 'Direct' | 'Broker' | 'Agent' | 'MGA';

export type UserRole = 'Super Admin' | 'Admin' | 'Underwriter' | 'Viewer';

export interface UserPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canBind: boolean; // Activate policies
  canCancel: boolean; // NTU or Early Termination
  canManageUsers: boolean; // Admin Console Access
}

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  'Super Admin': { canView: true, canCreate: true, canEdit: true, canDelete: true, canBind: true, canCancel: true, canManageUsers: true },
  'Admin': { canView: true, canCreate: true, canEdit: true, canDelete: true, canBind: true, canCancel: true, canManageUsers: true },
  'Underwriter': { canView: true, canCreate: true, canEdit: true, canDelete: false, canBind: true, canCancel: true, canManageUsers: false },
  'Viewer': { canView: true, canCreate: false, canEdit: false, canDelete: false, canBind: false, canCancel: false, canManageUsers: false }
};

export interface User {
  id: string;
  email: string;
  password?: string; // Added for internal auth
  name: string;
  role: UserRole;
  avatarUrl?: string;
  lastLogin?: string;
  permissions: UserPermissions;
}

export interface Installment {
  date: string;
  amount: number;
  currency: Currency;
  isPaid: boolean;
}

export interface Claim {
  id: string;
  dateOfLoss: string;
  description: string;
  reserveAmount: number;
  paidAmount: number;
  status: 'Open' | 'Closed';
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  isStandard: boolean;
  category: 'General' | 'Exclusion' | 'Condition' | 'Warranty';
  isDeleted?: boolean;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description?: string;
  content: string; // HTML or Markdown content with {{placeholders}}
  isDeleted?: boolean;
}

export interface ReinsuranceSlip {
  id: string;
  slipNumber: string; // No Slip
  date: string; // Date
  insuredName: string; // Insured
  brokerReinsurer: string; // Broker/Reinsurer
  isDeleted?: boolean;
}

export interface TerminationDetails {
  terminationDate: string;
  initiator: 'Broker' | 'Cedant' | 'Us' | 'Other';
  reason: string;
}

export interface Policy {
  id: string;
  
  // --- Architecture ---
  channel: Channel; // Direct Insurance or Inward Reinsurance
  intermediaryType: IntermediaryType; // Broker, Agent, MGA, or Direct
  intermediaryName?: string; // Name of the Broker/Agent/MGA

  // --- Identifiers & Reference ---
  policyNumber: string; // Internal Policy No / Reference Link
  secondaryPolicyNumber?: string; // Secondary Policy No (often empty in Direct)
  slipNumber?: string; // Number of Reinsurance Slip
  agreementNumber?: string; // No of Insurance Agreement
  bordereauNo?: string; // Bordereau No
  invoiceIssued?: boolean; // Invoice (Yes/No)
  coverNote?: string; // Cover Note reference
  
  // --- Dates ---
  dateOfSlip?: string; // Date of Slip
  accountingDate?: string; // Accounting Date / Дата бухг. начисления
  inceptionDate: string; // Insurance Period Start
  expiryDate: string; // Insurance Period End
  issueDate: string;
  reinsuranceInceptionDate?: string; // Reinsurance Period Start
  reinsuranceExpiryDate?: string; // Reinsurance Period End
  paymentDate?: string; // Date of Payment (Received)
  warrantyPeriod?: number; // Warranty Period (days) / Гарантийный период
  activationDate?: string; // Date when policy was officially bound/validated

  // --- Parties ---
  insuredName: string; // Original Insured
  insuredAddress?: string;
  borrower?: string; // 1c / Borrower / Заемщик
  cedantName?: string; // Reinsured / Cedant (For Inward)
  retrocedent?: string; // Retrocedent / Ретроцедент
  performer?: string; // Performer / Исполнитель
  
  // --- Risk Details ---
  industry: string;
  territory: string; // Country / Страна
  city?: string; // City / Город
  jurisdiction: string;
  classOfInsurance: string; // Class (e.g., "8,9" or name)
  typeOfInsurance?: string; // Type of Insurance / Вид страхования
  riskCode?: string; // Code / Код
  insuredRisk?: string; // Insured Risks / Объект страхования
  
  // --- Financials (Sums & Limits) ---
  currency: Currency;
  sumInsured: number; // Sum Insured in FC (100%)
  sumInsuredNational?: number; // Sum Insured in Sums (National)
  
  limitForeignCurrency?: number; // Limit in FC
  limitNationalCurrency?: number; // Limit in National Currency
  excessForeignCurrency?: number; // In excess of in FC
  prioritySum?: number; // Priority in Sums
  
  // --- Financials (Premiums) ---
  premiumRate?: number; // Rate / Ставка (%)
  grossPremium: number; // Premium in FC / Gross Reinsurance Premium (100%)
  premiumNationalCurrency?: number; // Premium in National Currency
  exchangeRate: number; 
  equivalentUSD?: number; // Equivalent in USD

  // --- Our Share (Inward/Direct) ---
  ourShare: number; // Percentage of risk we accept
  
  // --- Outward Reinsurance / Retrocession (Ceding) ---
  hasOutwardReinsurance?: boolean;
  reinsurerName?: string; // Who are we ceding to?
  cededShare?: number; // Percentage we are ceding
  cededPremiumForeign?: number; // Premium we pay to reinsurer
  reinsuranceCommission?: number; // Commission we receive from reinsurer
  netReinsurancePremium?: number; // Net Payable to Reinsurer
  
  sumReinsuredForeign?: number; // Sum Reinsured / Обязательства перестраховщика (FC)
  sumReinsuredNational?: number; // Sum Reinsured (Sums)
  
  receivedPremiumForeign?: number; // Received Premium in FC
  receivedPremiumNational?: number; // Received Premium in National Currency
  
  numberOfSlips?: number; // Number of slips

  // --- AIC / Treaty Specifics (Inward) ---
  treatyPlacement?: string; // Treaty Placement
  treatyPremium?: number; // Treaty Premium
  aicCommission?: number; // AIC Commission
  aicRetention?: number; // AIC Retention
  aicPremium?: number; // AIC Premium
  maxRetentionPerRisk?: number; // Maximum Retention per risk
  reinsurerRating?: string; // Reinsurer Rating

  // --- Standard Fields ---
  netPremium: number; // Calculated net
  commissionPercent: number; // Acquisition Cost / Commission to Intermediary
  taxPercent?: number;
  deductible?: string;
  conditions?: string;

  // --- Tracking ---
  status: PolicyStatus;
  paymentStatus: PaymentStatus;
  installments: Installment[];
  claims: Claim[];
  selectedClauseIds: string[];
  isDeleted?: boolean;

  // --- Documents ---
  signedDocument?: {
    fileName: string;
    uploadDate: string;
    // In a real app, this would be a blob URL or storage path
    url?: string; 
  };
  
  // --- Early Termination ---
  terminationDetails?: TerminationDetails;
}
