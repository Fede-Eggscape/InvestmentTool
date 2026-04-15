import { useQuery } from '@tanstack/react-query';
import { getCombined } from '../api/meteoraApi';

export function useMeteoraPools() {
  return useQuery({
    queryKey: ['meteora', 'combined'],
    queryFn: getCombined,
    refetchInterval: 120_000,
    staleTime: 110_000,
    retry: 2,
  });
}
