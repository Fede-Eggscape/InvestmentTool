import { TARGET_COINS } from '../../constants/coins';

export default function MeteoraFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-slate-900 border-b border-slate-800">
      {/* Token filter */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs">Token:</span>
        <select
          value={filters.coin}
          onChange={e => onChange({ ...filters, coin: e.target.value })}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos</option>
          {TARGET_COINS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs">Tipo:</span>
        <select
          value={filters.type}
          onChange={e => onChange({ ...filters, type: e.target.value })}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="">Ambos</option>
          <option value="DLMM">DLMM</option>
          <option value="Dynamic">Dynamic</option>
        </select>
      </div>

      {/* APY min */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs">APY mín:</span>
        <input
          type="number"
          value={filters.minApy}
          onChange={e => onChange({ ...filters, minApy: e.target.value })}
          placeholder="0"
          min="0"
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 w-16 focus:outline-none focus:border-blue-500"
        />
        <span className="text-slate-500 text-xs">%</span>
      </div>

      {/* TVL min */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs">TVL mín (USD):</span>
        <input
          type="number"
          value={filters.minTvl}
          onChange={e => onChange({ ...filters, minTvl: e.target.value })}
          placeholder="0"
          min="0"
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 w-24 focus:outline-none focus:border-blue-500"
        />
      </div>

      <button
        onClick={() => onChange({ coin: '', type: '', minApy: '', minTvl: '' })}
        className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors ml-auto"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
