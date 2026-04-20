import { useState, useMemo } from 'react';
import { useBinanceDual } from '../../hooks/useBinanceDual';
import DualCard from './DualRow';
import DualFilters from './DualFilters';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorAlert from '../shared/ErrorAlert';
import StatusBar from '../layout/StatusBar';

const DEFAULT_FILTERS = { coin: '', signal: '', minApy: '', days: '' };
const DEFAULT_SORT = { field: 'bestDailyYield', dir: 'desc' };
const SIGNAL_ORDER = { STRONG_BUY: 0, BUY: 1, NEUTRAL: 2, CAUTION: 3 };

function pickBest(products) {
  const score = p => (SIGNAL_ORDER[p.signal] ?? 4) * 10000 - p.apy;
  const map = new Map();
  for (const p of products) {
    const key = `${p.coin}-${p.direction}`;
    if (!map.has(key) || score(p) < score(map.get(key))) map.set(key, p);
  }
  return map;
}

function groupByCoin(products) {
  const best = pickBest(products);
  const coins = new Map();
  for (const p of products) {
    if (!coins.has(p.coin)) coins.set(p.coin, { coin: p.coin, buy: null, sell: null });
  }
  for (const [key, p] of best) {
    const [coin, dir] = key.split('-');
    if (coins.has(coin)) coins.get(coin)[dir === 'BUY' ? 'buy' : 'sell'] = p;
  }
  return Array.from(coins.values());
}

export default function DualTable() {
  const { data, isLoading, isError, error, dataUpdatedAt, refetch, isFetching } = useBinanceDual();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [selectedCoin, setSelectedCoin] = useState(null);

  const products = data?.products || [];
  const hasMock = products.some(p => p.isMock);
  const grouped = useMemo(() => groupByCoin(products), [products]);

  const filtered = useMemo(() => {
    return grouped.filter(g => {
      if (filters.coin && g.coin !== filters.coin) return false;
      if (filters.signal) {
        const match = [g.buy?.signal, g.sell?.signal].some(s => s === filters.signal);
        if (!match) return false;
      }
      if (filters.minApy) {
        const min = parseFloat(filters.minApy);
        if ((g.buy?.apy ?? 0) < min && (g.sell?.apy ?? 0) < min) return false;
      }
      if (filters.days) {
        const d = parseInt(filters.days);
        if (g.buy?.daysToExpiry !== d && g.sell?.daysToExpiry !== d) return false;
      }
      return true;
    });
  }, [grouped, filters]);

  const sorted = useMemo(() => {
    const { field, dir } = sort;
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (field === 'bestDailyYield') {
        av = Math.max(a.buy?.dailyYield ?? 0, a.sell?.dailyYield ?? 0);
        bv = Math.max(b.buy?.dailyYield ?? 0, b.sell?.dailyYield ?? 0);
      } else if (field === 'bestSignal') {
        av = Math.min(SIGNAL_ORDER[a.buy?.signal] ?? 4, SIGNAL_ORDER[a.sell?.signal] ?? 4);
        bv = Math.min(SIGNAL_ORDER[b.buy?.signal] ?? 4, SIGNAL_ORDER[b.sell?.signal] ?? 4);
      } else if (field === 'coin') {
        av = a.coin; bv = b.coin;
      } else {
        av = Math.max(a.buy?.dailyYield ?? 0, a.sell?.dailyYield ?? 0);
        bv = Math.max(b.buy?.dailyYield ?? 0, b.sell?.dailyYield ?? 0);
      }
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sort]);

  const strongBuy = products.filter(p => p.signal === 'STRONG_BUY').length;
  const bestApy = products.reduce((max, p) => p.apy > max ? p.apy : max, 0);

  if (isLoading) return <LoadingSpinner message="Cargando productos de Dual Investment..." />;
  if (isError) return <ErrorAlert message={error?.message} onRetry={refetch} />;

  return (
    <div>
      <StatusBar updatedAt={dataUpdatedAt} intervalMs={60_000} isLoading={isFetching} isStale={data?._stale} />

      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 px-6 py-3 bg-slate-900/50 border-b border-slate-800 text-sm items-center">
        <StatChip label="Monedas" value={grouped.length} />
        <StatChip label="Muy recomendadas" value={strongBuy} color="text-emerald-400" />
        <StatChip label="Mejor rendimiento" value={`${bestApy.toFixed(2)}%`} color="text-emerald-300" />

        {/* Sort controls */}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-slate-500">Ordenar:</span>
          <SortBtn label="Ganancia/día" active={sort.field === 'bestDailyYield'} onClick={() => setSort({ field: 'bestDailyYield', dir: 'desc' })} />
          <SortBtn label="Recomendación" active={sort.field === 'bestSignal'} onClick={() => setSort({ field: 'bestSignal', dir: 'asc' })} />
          <SortBtn label="Nombre" active={sort.field === 'coin'} onClick={() => setSort({ field: 'coin', dir: 'asc' })} />
        </div>

        {hasMock && (
          <div className="flex items-center gap-1.5 text-yellow-600 text-xs bg-yellow-900/20 border border-yellow-800/50 px-3 py-1.5 rounded-full"
            title="Agregá BINANCE_API_KEY y BINANCE_API_SECRET en backend/.env para ver datos reales">
            ⚠ Datos de ejemplo
          </div>
        )}
      </div>

      <DualFilters filters={filters} onChange={setFilters} />

      {/* Card grid */}
      <div className="px-6 py-5">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No hay monedas que coincidan con los filtros
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map((g, i) => (
              <DualCard
                key={g.coin}
                coin={g.coin}
                buy={g.buy}
                sell={g.sell}
                isBestCoin={i === 0}
                isSelected={selectedCoin === g.coin}
                onSelect={() => setSelectedCoin(selectedCoin === g.coin ? null : g.coin)}
              />
            ))}
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="px-6 pb-3 text-xs text-slate-600 border-t border-slate-800 pt-2 flex items-center gap-4">
          <span>Mostrando {sorted.length} de {grouped.length} monedas</span>
          <span className="text-emerald-700">● #1 = mejor rendimiento diario</span>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, color = 'text-slate-100' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function SortBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors
        ${active
          ? 'bg-blue-900/60 text-blue-300 border-blue-700'
          : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'}`}
    >
      {label}
    </button>
  );
}
