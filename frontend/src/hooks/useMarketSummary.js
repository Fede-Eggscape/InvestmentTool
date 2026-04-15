import { useQuery } from '@tanstack/react-query';
import { getMarketSummary } from '../api/marketApi';

export function useMarketSummary() {
  return useQuery({
    queryKey:  ['market', 'summary'],
    queryFn:   getMarketSummary,
    refetchInterval: 60_000,
    staleTime:       30_000,
  });
}
