import { useQuery } from '@tanstack/react-query';
import { getDual } from '../api/binanceApi';

export function useBinanceDual() {
  return useQuery({
    queryKey: ['binance', 'dual'],
    queryFn: getDual,
    refetchInterval: 60_000,
    staleTime: 55_000,
    retry: 2,
  });
}
