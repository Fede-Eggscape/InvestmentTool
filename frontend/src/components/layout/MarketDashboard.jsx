import { useState } from 'react';
import { useMarketSummary } from '../../hooks/useMarketSummary';
import CapitalAllocator from '../shared/CapitalAllocator';
import Tooltip from '../shared/Tooltip';

const SENTIMENT_UI = {
  emerald: { cls: 'bg-emerald-900/60 text-emerald-300 border-emerald-600/60' },
  red:     { cls: 'bg-red-900/60     text-red-300     border-red-700/60'     },
  orange:  { cls: 'bg-orange-900/60  text-orange-300  border-orange-700/60'  },
  slate:   { cls: 'bg-slate-800/80   text-slate-300   border-slate-700'      },
};

export default function MarketDashboard() {
  const { data, isLoading } = useMarketSummary();
  const [showAllocator, setShowAllocator] = useState(false);

  if (isLoading || !data) return null;

  const sUI = SENTIMENT_UI[data.sentimentColor] ?? SENTIMENT_UI.slate;

  return (
    <>
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">

        {/* Hero: resumen de las mejores opciones */}
        <div className="flex flex-wrap gap-3 items-stretch">

          {/* Sentimiento de mercado */}
          <Tooltip text="Estado general del mercado basado en las tendencias de todas las monedas monitoreadas." position="bottom">
            <div className={`flex flex-col justify-center px-4 py-3 rounded-xl border cursor-default min-w-[130px] ${sUI.cls}`}>
              <div className="text-xs opacity-60 uppercase tracking-wider mb-1 font-semibold">Mercado</div>
              <div className="font-black text-lg leading-tight">{data.sentiment}</div>
              <div className="text-xs opacity-60 mt-1 font-medium">
                <span className="text-emerald-400">{data.bullish}↑</span>{' '}
                <span className="text-slate-400">{data.neutral}→</span>{' '}
                <span className="text-red-400">{data.bearish}↓</span>
              </div>
            </div>
          </Tooltip>

          {/* Mejor Dual Investment */}
          {data.bestDual && (
            <Tooltip text={`Mejor producto de Dual Investment ahora. Dirección: ${data.bestDual.direction === 'BUY' ? 'Comprar (BUY)' : 'Vender (SELL)'}.`} position="bottom">
              <div className="flex flex-col justify-center px-4 py-3 rounded-xl border border-emerald-700/50 bg-emerald-950/40 cursor-default min-w-[190px]">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Mejor Dual Investment</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-300">{data.bestDual.apy.toFixed(1)}%</span>
                  <span className="text-white font-bold text-base">{data.bestDual.coin}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {data.bestDual.direction === 'BUY' ? '↓ Comprar' : '↑ Vender'} · APR anual
                </div>
              </div>
            </Tooltip>
          )}

          {/* Mejor Pool Meteora */}
          {data.bestPool && (
            <Tooltip text="Pool de liquidez con mejor evaluación en Meteora según rentabilidad, fiabilidad y volumen." position="bottom">
              <div className="flex flex-col justify-center px-4 py-3 rounded-xl border border-violet-700/50 bg-violet-950/40 cursor-default min-w-[190px]">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Mejor Pool Meteora</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white font-black text-base">{data.bestPool.pair}</span>
                  {data.bestPool.verdict && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 rounded-full font-bold">
                      {data.bestPool.verdict}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Calificación máxima</div>
              </div>
            </Tooltip>
          )}

          {/* Asignar capital */}
          <div className="ml-auto flex items-center">
            <Tooltip text="Ingresá un monto y el sistema te recomienda cómo distribuirlo entre los mejores productos disponibles." position="bottom">
              <button
                onClick={() => setShowAllocator(v => !v)}
                className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl border text-sm font-semibold transition-all h-full
                  ${showAllocator
                    ? 'bg-amber-900/60 text-amber-300 border-amber-700'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
              >
                <span className="text-xl">💰</span>
                <span className="text-xs">Asignar capital</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Stats secundarias */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs text-slate-500">
          <span>
            Cambio 24h{' '}
            <span className={`font-semibold ${data.avgChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.avgChange >= 0 ? '+' : ''}{data.avgChange}%
            </span>
          </span>
          {data.avgVol != null && (
            <span>
              Volatilidad{' '}
              <span className="text-slate-300 font-semibold">{data.avgVol}%</span>
            </span>
          )}
        </div>

      </div>

      {showAllocator && <CapitalAllocator onClose={() => setShowAllocator(false)} />}
    </>
  );
}
