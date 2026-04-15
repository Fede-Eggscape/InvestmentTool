import { useState, useMemo } from 'react';
import { useMeteoraPools } from '../../hooks/useMeteoraPools';
import MeteoraRow from './MeteoraRow';
import MeteoraFilters from './MeteoraFilters';
import SortableHeader from '../shared/SortableHeader';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorAlert from '../shared/ErrorAlert';
import StatusBar from '../layout/StatusBar';
import { fmtCompact, fmtPercent } from '../../utils/formatters';
import { TARGET_COINS } from '../../constants/coins';

const DEFAULT_FILTERS = { coin: '', type: '', minApy: '', minTvl: '' };
const DEFAULT_SORT = { field: 'apy', dir: 'desc' };

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
      const av = a[field] ?? 0, bv = b[field] ?? 0;
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

  // Stats
  const totalTvl = pools.reduce((s, p) => s + p.tvl, 0);
  const bestApy = pools.reduce((max, p) => p.apy > max ? p.apy : max, 0);
  const avgDailyYield = pools.length
    ? pools.reduce((s, p) => s + p.dailyYield, 0) / pools.length
    : 0;

  if (isLoading) return <LoadingSpinner message="Cargando pools de Meteora..." />;

  return (
    <div>
      <StatusBar
        updatedAt={dataUpdatedAt}
        intervalMs={120_000}
        isLoading={isFetching}
        isStale={data?._stale}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-4 px-6 py-3 bg-slate-900/50 border-b border-slate-800 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Total pools:</span>
          <span className="text-slate-100 font-semibold">{pools.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">DLMM:</span>
          <span className="text-violet-400 font-semibold">{data?.dlmmCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Dynamic:</span>
          <span className="text-blue-400 font-semibold">{data?.dynamicCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">TVL total:</span>
          <span className="text-slate-100 font-semibold">{fmtCompact(totalTvl)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Mejor APY:</span>
          <span className="text-emerald-300 font-bold">{fmtPercent(bestApy)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Yield/Día promedio:</span>
          <span className="text-emerald-400 font-semibold">{fmtPercent(avgDailyYield)}</span>
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
          <p className="text-xs mt-2 text-slate-600">
            Monedas buscadas: {TARGET_COINS.join(', ')}
          </p>
        </div>
      )}

      {pools.length > 0 && (
        <>
          <MeteoraFilters filters={filters} onChange={setFilters} />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 sticky top-0 z-10">
                <tr>
                  <SortableHeader label="Par"         field="pair"       currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="Tipo"        field="type"       currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="APY"         field="apy"        currentSort={sort} onSort={toggleSort} align="right" />
                  <SortableHeader label="Fees 24h"    field="fees24h"    currentSort={sort} onSort={toggleSort} align="right" />
                  <SortableHeader label="TVL"         field="tvl"        currentSort={sort} onSort={toggleSort} align="right" />
                  <SortableHeader label="Volumen 24h" field="vol24h"     currentSort={sort} onSort={toggleSort} align="right" />
                  <SortableHeader label="Rend./Día"   field="dailyYield" currentSort={sort} onSort={toggleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      No hay pools que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  sorted.map((pool, i) => (
                    <MeteoraRow key={pool.id || i} pool={pool} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {sorted.length > 0 && (
            <div className="px-6 py-2 text-xs text-slate-600 border-t border-slate-800">
              Mostrando {sorted.length} de {pools.length} pools
            </div>
          )}
        </>
      )}
    </div>
  );
}
