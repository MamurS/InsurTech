
import { Claim, ClaimLiabilityType, ClaimTransaction, Policy } from '../types';
import { supabase } from './supabase';
import { DB } from './db';

// --- LIABILITY LOGIC (Pure Function) ---
export const determineLiability = (
    policy: Policy,
    lossDate: string,
    reportDate: string,
    coverageBasis: 'occurrence' | 'claims_made' = 'occurrence',
    retroactiveDate?: string
): { type: ClaimLiabilityType; reason: string } => {

    const inception = new Date(policy.inceptionDate).getTime();
    const expiry = new Date(policy.expiryDate).getTime();
    const loss = new Date(lossDate).getTime();
    const report = new Date(reportDate).getTime();

    if (isNaN(loss)) return { type: 'INFORMATIONAL', reason: 'Invalid Loss Date' };

    if (coverageBasis === 'occurrence') {
        if (loss >= inception && loss <= expiry) {
            return { type: 'ACTIVE', reason: 'Loss occurred within policy period' };
        }
        return { type: 'INFORMATIONAL', reason: `Loss date outside period (${policy.inceptionDate} to ${policy.expiryDate})` };
    }

    if (coverageBasis === 'claims_made') {
        if (report < inception || report > expiry) {
            return { type: 'INFORMATIONAL', reason: 'Reported outside policy period' };
        }
        if (retroactiveDate) {
            const retro = new Date(retroactiveDate).getTime();
            if (loss < retro) {
                return { type: 'INFORMATIONAL', reason: 'Loss occurred before retroactive date' };
            }
        }
        return { type: 'ACTIVE', reason: 'Claims-made criteria met' };
    }

    return { type: 'INFORMATIONAL', reason: 'Default fallback' };
};

// --- DATA ACCESS ---

export const ClaimsService = {
    // Get all claims (Dashboard)
    getAllClaims: async (): Promise<Claim[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('claims')
            .select(`
                *,
                policy:policies(policyNumber, insuredName)
            `)
            .order('report_date', { ascending: false });
        
        if (error) {
            console.error("Error fetching claims", error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            policyId: row.policy_id,
            claimNumber: row.claim_number,
            liabilityType: row.liability_type,
            status: row.status,
            lossDate: row.loss_date,
            reportDate: row.report_date,
            description: row.description,
            claimantName: row.claimant_name,
            locationCountry: row.location_country,
            importedTotalIncurred: row.imported_total_incurred,
            
            // Join fields (handled loosely in type)
            policyNumber: row.policy?.policyNumber,
            insuredName: row.policy?.insuredName
        } as unknown as Claim));
    },

    // Get Single Claim with Transactions
    getClaimById: async (id: string): Promise<Claim | null> => {
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('claims')
            .select(`
                *,
                transactions:claim_transactions(*),
                policy:policies(*)
            `)
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            policyId: data.policy_id,
            claimNumber: data.claim_number,
            liabilityType: data.liability_type,
            status: data.status,
            lossDate: data.loss_date,
            reportDate: data.report_date,
            description: data.description,
            claimantName: data.claimant_name,
            locationCountry: data.location_country,
            importedTotalIncurred: data.imported_total_incurred,
            importedTotalPaid: data.imported_total_paid,
            // Attach full policy object for context if needed
            policyContext: data.policy ? {
                policyNumber: data.policy.policyNumber,
                currency: data.policy.currency,
                insuredName: data.policy.insuredName
            } : undefined,
            transactions: data.transactions?.map((t: any) => ({
                id: t.id,
                transactionType: t.transaction_type,
                transactionDate: t.transaction_date,
                amount100pct: t.amount_100pct,
                amountOurShare: t.amount_our_share,
                currency: t.currency,
                exchangeRate: t.exchange_rate,
                ourSharePercentage: t.our_share_percentage,
                notes: t.notes,
                payee: t.payee
            })).sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
        } as unknown as Claim;
    },

    createClaim: async (claim: Partial<Claim>): Promise<string | null> => {
        if (!supabase) {
            alert("Database connection required for Claims Module");
            return null;
        }

        const payload = {
            policy_id: claim.policyId,
            claim_number: claim.claimNumber,
            liability_type: claim.liabilityType,
            status: claim.status,
            loss_date: claim.lossDate,
            report_date: claim.reportDate,
            description: claim.description,
            claimant_name: claim.claimantName,
            location_country: claim.locationCountry,
            imported_total_incurred: claim.importedTotalIncurred || 0,
            imported_total_paid: claim.importedTotalPaid || 0
        };

        const { data, error } = await supabase
            .from('claims')
            .insert(payload)
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    },

    addTransaction: async (txn: Partial<ClaimTransaction>) => {
        if (!supabase) return;
        
        const { error } = await supabase.from('claim_transactions').insert({
            claim_id: txn.claimId,
            transaction_type: txn.transactionType,
            amount_100pct: txn.amount100pct,
            our_share_percentage: txn.ourSharePercentage,
            transaction_date: txn.transactionDate || new Date().toISOString(),
            currency: txn.currency,
            notes: txn.notes,
            payee: txn.payee
        });

        if (error) throw error;
    }
};
