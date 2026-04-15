import { useState, useMemo } from 'react';
import { useBinanceDual } from '../../hooks/useBinanceDual';
import DualRow from './DualRow';
import DualFilters from './DualFilters';
import SortableHeader from '../shared/SortableHeader';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorAlert from '../shared/ErrorAlert';
import StatusBar from '../layout/StatusBar';

const DEFAULT_FILTERS = { coin: '', signal: '', minApy: '', days: '' };
const DEFAULT_SORT = { field: 'bestDailyYield', dir: 'desc' };
const SIGNAL_ORDER = { STRONG_BUY: 0, BUY: 1, NEUTRAL: 2, CAUTION: 3 };

// Pick the best product per direction per coin (highest APR with best signal)
function pickBest(products) {
  const score = p => (SIGNAL_ORDER[p.signal] ?? 4) * 10000 - p.apy;
  const map = new Map();
  for (const p of products) {
    const key = `${p.coin}-${p.direction}`;
    if (!map.has(key) || score(p) < score(map.get(key))) {
      map.set(key, p);
    }
  }
  return map;
}

// Group products by coin → { coin, buy, sell }
function groupByCoin(products) {
  const best = pickBest(products);
  const coins = new Map();
  for (const p of products) {
    if (!coins.has(p.coin)) coins.set(p.coin, { coin: p.coin, buy: null, sell: null });
  }
  for (const [key, p] of best) {
    const [coin, dir] = key.split('-');
    if (coins.has(coin)) {
      coins.get(coin)[dir === 'BUY' ? 'buy' : 'sell'] = p;
    }
  }
  return Array.from(coins.values());
}

export default function DualTable() {
  const { data, isLoading, isError, error, dataUpdatedAt, refetch, isFetching } = useBinanceDual();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);

  const products = data?.products || [];
  const hasMock = products.some(p => p.isMock);

  // Group by coin
  const grouped = useMemo(() => groupByCoin(products), [products]);

  // Filter groups
  const filtered = useMemo(() => {
    return grouped.filter(g => {
      if (filters.coin && g.coin !== filters.coin) return false;
      if (filters.signal) {
        const match = [g.buy?.signal, g.sell?.signal].some(s => s === filters.signal);
        if (!match) return false;
      }
      if (filters.minApy) {
        const min = parseFloat(filters.minApy);
        const match = (g.buy?.apy ?? 0) >= min || (g.sell?.apy ?? 0) >= min;
        if (!match) return false;
      }
      if (filters.days) {
        const d = parseInt(filters.days);
        const match = g.buy?.daysToExpiry === d || g.sell?.daysToExpiry === d;
        if (!match) return false;
      }
      return true;
    });
  }, [grouped, filters]);

  // Sort groups — always defaults to best daily yield desc
  const sorted = useMemo(() => {
    const { field, dir } = sort;
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (field === 'bestDailyYield') {
        av = Math.max(a.buy?.dailyYield ?? 0, a.sell?.dailyYield ?? 0);
        bv = Math.max(b.buy?.dailyYield ?? 0, b.sell?.dailyYield ?? 0);
      } else if (field === 'coin') {
        av = a.coin; bv = b.coin;
      } else if (field === 'currentPrice') {
        av = (a.buy || a.sell)?.currentPrice ?? 0;
        bv = (b.buy || b.sell)?.currentPrice ?? 0;
      } else if (field === 'trend') {
        av = (a.buy || a.sell)?.trend ?? '';
        bv = (b.buy || b.sell)?.trend ?? '';
      } else if (field === 'buyApy') {
        av = a.buy?.apy ?? -1; bv = b.buy?.apy ?? -1;
      } else if (field === 'sellApy') {
        av = a.sell?.apy ?? -1; bv = b.sell?.apy ?? -1;
      } else {
        av = Math.max(a.buy?.dailyYield ?? 0, a.sell?.dailyYield ?? 0);
        bv = Math.max(b.buy?.dailyYield ?? 0, b.sell?.dailyYield ?? 0);
      }
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sort]);

  function toggleSort(field) {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' }
    );
  }

  // Stats from ungrouped products
  const strongBuy = products.filter(p => p.signal === 'STRONG_BUY').length;
  const buy       = products.filter(p => p.signal === 'BUY').length;
  const bestApy   = products.reduce((max, p) => p.apy > max ? p.apy : max, 0);

  if (isLoading) return <LoadingSpinner message="Cargando productos de Dual Investment..." />;
  if (isError)   return <ErrorAlert message={error?.message} onRetry={refetch} />;

  return (
    <div>
      <StatusBar updatedAt={dataUpdatedAt} intervalMs={60_000} isLoading={isFetching} isStale={data?._stale} />

      {/* Stats */}
      <div className="flex flex-wrap gap-4 px-6 py-3 bg-slate-900/50 border-b border-slate-800 text-sm">
        <Stat label="Monedas"       value={grouped.length} />
        <Stat label="Fuerte Compra" value={strongBuy}      color="text-emerald-400" />
        <Stat label="Compra"        value={buy}            color="text-emerald-600" />
        <Stat label="Mejor APR"     value={`${bestApy.toFixed(2)}%`} color="text-emerald-300" />
        {hasMock && (
          <div className="ml-auto flex items-center gap-1.5 text-yellow-600 text-xs bg-yellow-900/20 border border-yellow-800/50 px-3 py-1.5 rounded-full"
               title="Agregá BINANCE_API_KEY y BINANCE_API_SECRET en backend/.env para ver datos reales">
            ⚠ Datos de ejemplo — configurá API Key en backend/.env para datos reales
          </div>
        )}
      </div>

      <DualFilters filters={filters} onChange={setFilters} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-900 sticky top-0 z-10">
            <tr>
              <SortableHeader label="Moneda"        field="coin"           currentSort={sort} onSort={toggleSort} align="left"   />
              <SortableHeader label="Precio Actual" field="currentPrice"   currentSort={sort} onSort={toggleSort} align="right"  />
              <SortableHeader label="Tendencia"     field="trend"          currentSort={sort} onSort={toggleSort} align="center" />
              <SortableHeader label="Compra (BUY)"  field="buyApy"         currentSort={sort} onSort={toggleSort} align="left"   />
              <SortableHeader label="Venta (SELL)"  field="sellApy"        currentSort={sort} onSort={toggleSort} align="left"   />
              <SortableHeader label="Rend./Día"     field="bestDailyYield" currentSort={sort} onSort={toggleSort} align="right"  />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  No hay monedas que coincidan con los filtros
                </td>
              </tr>
            ) : (
              sorted.map((g, i) => (
                <DualRow
                  key={g.coin}
                  coin={g.coin}
                  buy={g.buy}
                  sell={g.sell}
                  isBestCoin={i === 0}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="px-6 py-2 text-xs text-slate-600 border-t border-slate-800 flex items-center gap-4">
          <span>Mostrando {sorted.length} de {grouped.length} monedas</span>
          <span className="text-emerald-700">● TOP = mejor rendimiento diario</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = 'text-slate-100' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
