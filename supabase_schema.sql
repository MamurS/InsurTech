
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Profile data linked to Auth)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  role text default 'Viewer',
  "avatarUrl" text,
  permissions jsonb,
  "lastLogin" timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Policies for Users
create policy "Public profiles are viewable by everyone" on public.users for select using (true);
create policy "Users can insert their own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
-- Note: For a real app, you'd want strict RLS (e.g., only Admins can update roles), 
-- but for this starter, we allow updates to facilitate the AdminConsole functioning.

-- 2. Policies Table
create table public.policies (
  id uuid default uuid_generate_v4() primary key,
  "recordType" text not null,
  "policyNumber" text,
  "secondaryPolicyNumber" text,
  "slipNumber" text,
  "agreementNumber" text,
  "bordereauNo" text,
  "invoiceIssued" boolean,
  "coverNote" text,
  
  "dateOfSlip" date,
  "accountingDate" date,
  "inceptionDate" date,
  "expiryDate" date,
  "issueDate" date,
  "reinsuranceInceptionDate" date,
  "reinsuranceExpiryDate" date,
  "paymentDate" date,
  "warrantyPeriod" integer,
  "activationDate" timestamp with time zone,

  "insuredName" text,
  "insuredAddress" text,
  "borrower" text,
  "cedantName" text,
  "retrocedent" text,
  "reinsurerName" text,
  "brokerName" text,
  "performer" text,
  
  industry text,
  territory text,
  city text,
  jurisdiction text,
  "classOfInsurance" text,
  "typeOfInsurance" text,
  "riskCode" text,
  "insuredRisk" text,
  
  currency text,
  "sumInsured" numeric,
  "sumInsuredNational" numeric,
  
  "limitForeignCurrency" numeric,
  "limitNationalCurrency" numeric,
  "excessForeignCurrency" numeric,
  "prioritySum" numeric,
  
  "premiumRate" numeric,
  "grossPremium" numeric,
  "premiumNationalCurrency" numeric,
  "exchangeRate" numeric,
  "equivalentUSD" numeric,

  "ourShare" numeric,
  "reinsuranceCommission" numeric,
  "netReinsurancePremium" numeric,
  
  "sumReinsuredForeign" numeric,
  "sumReinsuredNational" numeric,
  
  "cededPremiumForeign" numeric,
  "cededPremiumNational" numeric,

  "receivedPremiumForeign" numeric,
  "receivedPremiumNational" numeric,
  
  "numberOfSlips" integer,

  "treatyPlacement" text,
  "treatyPremium" numeric,
  "aicCommission" numeric,
  "aicRetention" numeric,
  "aicPremium" numeric,
  "maxRetentionPerRisk" numeric,
  "reinsurerRating" text,

  "netPremium" numeric,
  "commissionPercent" numeric,
  "taxPercent" numeric,
  deductible text,
  conditions text,

  status text,
  "paymentStatus" text,
  installments jsonb default '[]'::jsonb,
  claims jsonb default '[]'::jsonb,
  "selectedClauseIds" text[] default '{}',
  "isDeleted" boolean default false,

  "signedDocument" jsonb,
  "terminationDetails" jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.policies enable row level security;
create policy "Enable all access for authenticated users" on public.policies for all using (auth.role() = 'authenticated');


-- 3. Clauses Table
create table public.clauses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text,
  "isStandard" boolean default false,
  category text,
  "isDeleted" boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clauses enable row level security;
create policy "Enable all access for authenticated users" on public.clauses for all using (auth.role() = 'authenticated');


-- 4. Reinsurance Slips Table
create table public.slips (
  id uuid default uuid_generate_v4() primary key,
  "slipNumber" text not null,
  date date,
  "insuredName" text,
  "brokerReinsurer" text,
  "isDeleted" boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.slips enable row level security;
create policy "Enable all access for authenticated users" on public.slips for all using (auth.role() = 'authenticated');


-- 5. Templates Table
create table public.templates (
  id text primary key, -- Keeping text ID to support custom IDs like 'tpl_standard_01'
  name text,
  description text,
  content text,
  "isDeleted" boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.templates enable row level security;
create policy "Enable all access for authenticated users" on public.templates for all using (auth.role() = 'authenticated');
