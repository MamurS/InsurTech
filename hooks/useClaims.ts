
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClaimsService } from '../services/claimsService';
import { ClaimFilters, ClaimTransaction, Claim } from '../types';

export const useClaimsList = (filters: ClaimFilters) => {
  return useQuery({
    queryKey: ['claims', filters],
    queryFn: () => ClaimsService.getAllClaims(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching next page
  });
};

export const useClaimDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['claim', id],
    queryFn: () => (id ? ClaimsService.getClaimById(id) : null),
    enabled: !!id,
  });
};

export const useAddTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (txn: Partial<ClaimTransaction>) => ClaimsService.addTransaction(txn),
    onSuccess: (_, variables) => {
      // Invalidate specific claim to refresh totals
      queryClient.invalidateQueries({ queryKey: ['claim', variables.claimId] });
      // Invalidate list to refresh summary stats
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
};

export const useCreateClaim = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claim: Partial<Claim>) => ClaimsService.createClaim(claim),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
};
