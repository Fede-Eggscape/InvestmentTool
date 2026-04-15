import { useState } from 'react';
import { useMarketSummary } from '../../hooks/useMarketSummary';
import CapitalAllocator from '../shared/CapitalAllocator';
import Tooltip, { InfoTip } from '../shared/Tooltip';

export default function MarketDashboard() {
  const { data, isLoading } = useMarketSummary();
  const [showAllocator, setShowAllocator] = useState(false);

  if (isLoading || !data) return null;

  const sentimentConfig = {
    emerald: { cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/60', icon: '🟢' },
    red:     { cls: 'bg-red-900/50     text-red-300     border-red-700/60',     icon: '🔴' },
    orange:  { cls: 'bg-orange-900/50  text-orange-300  border-orange-700/60',  icon: '🟡' },
    slate:   { cls: 'bg-slate-800/80   text-slate-400   border-slate-700',      icon: '⚪' },
  }[data.sentimentColor] ?? { cls: 'bg-slate-800 text-slate-400 border-slate-700', icon: '⚪' };

  return (
    <>
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">

        {/* Sentiment badge */}
        <Tooltip text="Resumen del estado general del mercado basado en las tendencias de todas las monedas monitoreadas." position="bottom">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-xs tracking-wide cursor-default ${sentimentConfig.cls}`}>
            <span>{sentimentConfig.icon}</span>
            Mercado: {data.sentiment}
          </span>
        </Tooltip>

        {/* Divider */}
        <span className="text-slate-700 hidden sm:block">|</span>

        {/* Coin breakdown */}
        <div className="flex items-center gap-2 text-xs">
          <Tooltip text="Monedas con precio en alza en las últimas 24h." position="bottom">
            <span className="flex items-center gap-1 cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-emerald-400 font-semibold">{data.bullish}</span>
              <span className="text-slate-600">alcistas</span>
            </span>
          </Tooltip>
          <span className="text-slate-700">·</span>
          <Tooltip text="Monedas con precio estable (cambio menor a ±2%) en las últimas 24h." position="bottom">
            <span className="flex items-center gap-1 cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
              <span className="text-slate-400 font-semibold">{data.neutral}</span>
              <span className="text-slate-600">neutras</span>
            </span>
          </Tooltip>
          <span className="text-slate-700">·</span>
          <Tooltip text="Monedas con precio en baja en las últimas 24h." position="bottom">
            <span className="flex items-center gap-1 cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              <span className="text-red-400 font-semibold">{data.bearish}</span>
              <span className="text-slate-600">bajistas</span>
            </span>
          </Tooltip>
        </div>

        {/* Divider */}
        <span className="text-slate-700 hidden sm:block">|</span>

        {/* Avg change */}
        <Tooltip text="Variación promedio de precio de todas las monedas monitoreadas en las últimas 24 horas." position="bottom">
          <span className="flex items-center gap-1.5 cursor-default">
            <span className="text-slate-500">Δ 24h</span>
            <span className={`font-bold ${data.avgChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.avgChange >= 0 ? '+' : ''}{data.avgChange}%
            </span>
          </span>
        </Tooltip>

        {/* Avg vol */}
        {data.avgVol != null && (
          <Tooltip text="Volatilidad anualizada promedio del mercado. Alta = precios con movimientos bruscos. Baja = mercado más tranquilo." position="bottom">
            <span className="flex items-center gap-1.5 cursor-default">
              <span className="text-slate-500">Vol ~</span>
              <span className="text-slate-300 font-semibold">{data.avgVol}%</span>
            </span>
          </Tooltip>
        )}

        {/* Best DCI */}
        {data.bestDual && (
          <Tooltip text={`Mejor producto de Dual Investment en este momento según APR. Dirección: ${data.bestDual.direction === 'BUY' ? 'compra (BUY)' : 'venta (SELL)'}.`} position="bottom">
            <span className="hidden md:flex items-center gap-1.5 cursor-default">
              <span className="text-slate-500">Mejor DCI</span>
              <span className="text-blue-300 font-semibold">
                {data.bestDual.coin} {data.bestDual.direction === 'BUY' ? '↓' : '↑'}
              </span>
              <span className="text-emerald-300 font-bold">{data.bestDual.apy.toFixed(1)}%</span>
            </span>
          </Tooltip>
        )}

        {/* Best Pool */}
        {data.bestPool && (
          <Tooltip text="Pool de liquidez con mejor evaluación en Meteora según rentabilidad, fiabilidad y volumen." position="bottom">
            <span className="hidden lg:flex items-center gap-1.5 cursor-default">
              <span className="text-slate-500">Mejor pool</span>
              <span className="text-violet-300 font-semibold">{data.bestPool.pair}</span>
              {data.bestPool.verdict && (
                <span className="text-emerald-300 font-semibold text-xs px-1.5 py-0.5 bg-emerald-900/30 rounded border border-emerald-800/40">
                  {data.bestPool.verdict}
                </span>
              )}
            </span>
          </Tooltip>
        )}

        {/* Capital allocator toggle */}
        <Tooltip text="Ingresá un monto y el sistema te recomienda cómo distribuirlo entre los mejores productos disponibles." position="bottom">
          <button
            onClick={() => setShowAllocator(v => !v)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
              ${showAllocator
                ? 'bg-amber-900/60 text-amber-300 border-amber-700 shadow-inner'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
          >
            💰 Asignar capital
          </button>
        </Tooltip>
      </div>

      {showAllocator && <CapitalAllocator onClose={() => setShowAllocator(false)} />}
    </>
  );
}
