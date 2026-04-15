import { useQuery } from '@tanstack/react-query';
import { getPrices } from '../api/binanceApi';

export function useBinancePrices() {
  return useQuery({
    queryKey: ['binance', 'prices'],
    queryFn: getPrices,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });
}
