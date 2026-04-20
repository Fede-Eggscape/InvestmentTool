import { useState, useMemo } from 'react';
import { useMeteoraPools } from '../../hooks/useMeteoraPools';
import MeteoraCard from './MeteoraRow';
import MeteoraFilters from './MeteoraFilters';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorAlert from '../shared/ErrorAlert';
import StatusBar from '../layout/StatusBar';
import { fmtCompact, fmtPercent } from '../../utils/formatters';
import { TARGET_COINS } from '../../constants/coins';

const DEFAULT_FILTERS = { coin: '', type: '', minApy: '', minTvl: '' };
const DEFAULT_SORT = { field: 'apy', dir: 'desc' };

const VERDICT_ORDER = { EXCELENTE: 0, BUENA: 1, ACEPTABLE: 2, 'PRECAUCIÓN': 3, EVITAR: 4 };

export default function MeteoraTable() {
  const { data, isLoading, isError, error, dataUpdatedAt, refetch, isFetching } = useMeteoraPools();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);

  const pools = data?.pools || [];

  const filtered = useMemo(() => {
    let list = [...pools];
    if (filters.coin) {
      const c = filters.coin.toUpperCase();
      list = list.filter(p => p.pair.toUpperCase().includes(c));
    }
    if (filters.type) list = list.filter(p => p.type === filters.type);
    if (filters.minApy) list = list.filter(p => p.apy >= parseFloat(filters.minApy));
    if (filters.minTvl) list = list.filter(p => p.tvl >= parseFloat(filters.minTvl));
    return list;
  }, [pools, filters]);

  const sorted = useMemo(() => {
    const { field, dir } = sort;
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (field === 'verdict') {
        av = VERDICT_ORDER[a.analysis?.verdict] ?? 5;
        bv = VERDICT_ORDER[b.analysis?.verdict] ?? 5;
      } else {
        av = a[field] ?? 0;
        bv = b[field] ?? 0;
      }
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sort]);

  const totalTvl = pools.reduce((s, p) => s + p.tvl, 0);
  const bestApy = pools.reduce((max, p) => p.apy > max ? p.apy : max, 0);
  const excellentCount = pools.filter(p => p.analysis?.verdict === 'EXCELENTE' || p.analysis?.verdict === 'BUENA').length;

  if (isLoading) return <LoadingSpinner message="Cargando pools de Meteora..." />;

  return (
    <div>
      <StatusBar updatedAt={dataUpdatedAt} intervalMs={120_000} isLoading={isFetching} isStale={data?._stale} />

      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 px-6 py-3 bg-slate-900/50 border-b border-slate-800 text-sm items-center">
        <StatChip label="Total pools" value={pools.length} />
        <StatChip label="Recomendadas" value={excellentCount} color="text-emerald-400" />
        <StatChip label="Mejor APY" value={`${bestApy.toFixed(1)}%`} color="text-emerald-300" />
        <StatChip label="TVL total" value={fmtCompact(totalTvl)} />

        {/* Sort controls */}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-slate-500">Ordenar:</span>
          <SortBtn label="APY" active={sort.field === 'apy'} onClick={() => setSort({ field: 'apy', dir: 'desc' })} />
          <SortBtn label="Calificación" active={sort.field === 'verdict'} onClick={() => setSort({ field: 'verdict', dir: 'asc' })} />
          <SortBtn label="TVL" active={sort.field === 'tvl'} onClick={() => setSort({ field: 'tvl', dir: 'desc' })} />
          <SortBtn label="Rend./Día" active={sort.field === 'dailyYield'} onClick={() => setSort({ field: 'dailyYield', dir: 'desc' })} />
        </div>
      </div>

      {isError && (
        <div className="px-6 py-3 bg-red-900/20 border-b border-red-800/50 text-red-400 text-sm flex items-center justify-between">
          <span>Error cargando pools: {error?.message}</span>
          <button onClick={refetch} className="text-xs underline hover:text-red-200">Reintentar</button>
        </div>
      )}

      {pools.length === 0 && !isLoading && !isError && (
        <div className="px-6 py-8 text-center text-slate-500">
          <p className="text-lg mb-2">Sin pools disponibles</p>
          <p className="text-sm">Las APIs de Meteora pueden no estar accesibles desde este servidor.</p>
          <p className="text-xs mt-2 text-slate-600">Monedas buscadas: {TARGET_COINS.join(', ')}</p>
        </div>
      )}

      {pools.length > 0 && (
        <>
          <MeteoraFilters filters={filters} onChange={setFilters} />

          <div className="px-6 py-5">
            {sorted.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No hay pools que coincidan con los filtros
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map((pool, i) => (
                  <MeteoraCard key={pool.id || i} pool={pool} isFirst={i === 0} />
                ))}
              </div>
            )}
          </div>

          {sorted.length > 0 && (
            <div className="px-6 pb-3 text-xs text-slate-600 border-t border-slate-800 pt-2">
              Mostrando {sorted.length} de {pools.length} pools
            </div>
          )}
        </>
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
