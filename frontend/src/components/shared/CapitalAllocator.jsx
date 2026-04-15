import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllocations } from '../../api/marketApi';
import { InfoTip } from './Tooltip';

function fmt$(n) {
  if (n == null) return '—';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function CapitalAllocator({ onClose }) {
  const [capital, setCapital] = useState(1000);
  const [input,   setInput]   = useState('1000');

  const { data, isLoading, refetch } = useQuery({
    queryKey:  ['market', 'allocate', capital],
    queryFn:   () => getAllocations(capital),
    staleTime: 60_000,
  });

  function applyCapital() {
    const v = parseFloat(input);
    if (v > 0) setCapital(v);
  }

  const typeColor = { DCI: 'text-blue-300 bg-blue-900/30 border-blue-800', POOL: 'text-violet-300 bg-violet-900/30 border-violet-800' };

  return (
    <div className="bg-slate-900/95 border-b border-amber-800/40 px-6 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1">
              💰 Asignación de Capital Sugerida
              <InfoTip text="El algoritmo puntúa cada producto por señal técnica, APY y confiabilidad, y distribuye el capital en los mejores. La reserva queda fuera para mantener liquidez." position="right" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribución óptima basada en señales y confiabilidad actual</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors">×</button>
        </div>

        {/* Capital input */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs text-slate-400 flex items-center">
            Capital total:
            <InfoTip text="Ingresá cuánto dinero querés invertir en total. El sistema calculará cuánto poner en cada producto." position="right" />
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
            <input
              type="number"
              value={input}
              onChange={e => setInput(e.target.value)}
              onBlur={applyCapital}
              onKeyDown={e => e.key === 'Enter' && applyCapital()}
              className="bg-slate-800 border border-slate-700 rounded px-6 py-1.5 text-sm text-slate-100 w-36 focus:outline-none focus:border-amber-600"
            />
          </div>
          <button
            onClick={applyCapital}
            className="px-3 py-1.5 bg-amber-900/60 border border-amber-700 text-amber-300 text-xs rounded font-semibold hover:bg-amber-900/80"
          >
            Calcular
          </button>
          {isLoading && <span className="text-xs text-slate-500 animate-pulse">Calculando...</span>}
        </div>

        {data && (
          <>
            {/* Allocation cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              {data.allocations.map((op, i) => (
                <div key={i} className={`rounded-lg border p-3 ${typeColor[op.type] || 'text-slate-300 bg-slate-800 border-slate-700'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold opacity-70">{op.type}</span>
                      <div className="text-sm font-bold text-slate-100 mt-0.5">{op.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-amber-300">{fmt$(op.amount)}</div>
                      <div className="text-xs text-slate-400">{op.pct}%</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mb-1">{op.details}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-semibold">{op.apy?.toFixed(1)}% APY</span>
                    <span className="text-xs text-slate-500 text-right max-w-32">{op.risk}</span>
                  </div>
                  {/* Allocation bar */}
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${op.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Reserve */}
            <div className="flex items-center gap-3 text-xs text-slate-500 border-t border-slate-800 pt-3">
              <span className="flex items-center">
                Reserva de liquidez ({data.reservePct}%):
                <InfoTip text="Porcentaje que se recomienda NO invertir para mantener flexibilidad ante oportunidades o imprevistos." position="top" />
              </span>
              <span className="text-yellow-400 font-bold">{fmt$(data.reserveAmount)}</span>
              <span className="text-slate-600">— Mantener disponible sin invertir</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
