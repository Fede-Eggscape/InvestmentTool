import { TARGET_COINS } from '../../constants/coins';

export default function DualFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-slate-900 border-b border-slate-800">

      {/* Coin filter */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs">Moneda:</span>
        <select
          value={filters.coin}
          onChange={e => onChange({ ...filters, coin: e.target.value })}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="">Todas</option>
          {TARGET_COINS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Signal filter */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs">Señal:</span>
        <select
          value={filters.signal}
          onChange={e => onChange({ ...filters, signal: e.target.value })}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="">Todas</option>
          <option value="STRONG_BUY">Fuerte Compra</option>
          <option value="BUY">Compra</option>
          <option value="NEUTRAL">Neutral</option>
          <option value="CAUTION">Precaución</option>
        </select>
      </div>

      {/* APY min filter */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs">APR mín:</span>
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

      {/* Days filter */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs">Días:</span>
        <select
          value={filters.days}
          onChange={e => onChange({ ...filters, days: e.target.value })}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos</option>
          <option value="1">1 día</option>
          <option value="3">3 días</option>
          <option value="7">7 días</option>
          <option value="14">14 días</option>
          <option value="30">30 días</option>
        </select>
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({ coin: '', signal: '', minApy: '', days: '' })}
        className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors ml-auto"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
