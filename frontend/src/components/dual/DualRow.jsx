import { useState } from 'react';
import SignalBadge from './SignalBadge';
import { COIN_COLORS, SIGNAL_CONFIG } from '../../constants/coins';
import { fmtPercent, fmtPrice, fmtChange } from '../../utils/formatters';
import { InfoTip } from '../shared/Tooltip';

const MOMENTUM_LABEL = {
  STRONG_UP:   { text: 'Fuerte alza',   color: 'text-emerald-400' },
  UP:          { text: 'Alza moderada', color: 'text-emerald-600' },
  DOWN:        { text: 'Baja moderada', color: 'text-red-500'     },
  STRONG_DOWN: { text: 'Fuerte caída',  color: 'text-red-400'     },
  UNKNOWN:     { text: 'Desconocido',   color: 'text-slate-500'   },
};

function RiskBar({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Compact card shown in the main table row
function OpCard({ product, isBuy }) {
  if (!product) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-slate-700 text-xs italic">—</span>
      </div>
    );
  }
  const { strikePrice, strikeDistance, daysToExpiry, apy, signal, confidence, reason } = product;

  return (
    <div className={`rounded-lg border px-3 py-2 space-y-1.5
      ${isBuy ? 'border-blue-800/50 bg-blue-950/20' : 'border-purple-800/50 bg-purple-950/20'}`}>
      {/* Line 1: direction + strike + duration */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold ${isBuy ? 'text-blue-300' : 'text-purple-300'}`}>
          {isBuy ? '↓ BUY' : '↑ SELL'}
        </span>
        <span className="text-white font-semibold text-xs">{fmtPrice(strikePrice)}</span>
        {strikeDistance != null && (
          <span className={`text-xs ${isBuy ? 'text-blue-400' : 'text-purple-400'}`}>
            ({strikeDistance > 0 ? '+' : ''}{strikeDistance}%)
          </span>
        )}
        <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded
          ${isBuy ? 'bg-blue-900/60 text-blue-200' : 'bg-purple-900/60 text-purple-200'}`}>
          {daysToExpiry}d
        </span>
      </div>
      {/* Line 2: APR + signal */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-emerald-300 font-bold text-sm">{fmtPercent(apy)}</span>
        <SignalBadge signal={signal} confidence={confidence} reason={reason} />
      </div>
    </div>
  );
}

// Full detail section for one operation (shown in expanded panel)
function OpDetail({ product, isBuy, currentPrice }) {
  if (!product) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-600 text-sm italic">
        Sin datos para esta operación
      </div>
    );
  }

  const {
    apy, strikePrice, daysToExpiry, dailyYield,
    signal, confidence, reason, strikeDistance,
    trend, momentum,
  } = product;

  const mom = MOMENTUM_LABEL[momentum] || MOMENTUM_LABEL.UNKNOWN;
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.NEUTRAL;
  const totalReturn = parseFloat((apy / 365 * daysToExpiry).toFixed(2));
  const investAsset = isBuy ? 'USDT' : product.coin;

  const favorableDesc = isBuy
    ? `Comprás ${product.coin} a ${fmtPrice(strikePrice)} (${Math.abs(strikeDistance ?? 0).toFixed(1)}% por debajo del mercado). Ganás la diferencia de precio + APR acumulado.`
    : `Vendés ${product.coin} a ${fmtPrice(strikePrice)} (${(strikeDistance ?? 0).toFixed(1)}% por encima del mercado). Vendés más caro + APR acumulado.`;

  const unfavorableDesc = isBuy
    ? `El precio no baja al strike. Recuperás tu USDT completo + APR del ${fmtPercent(apy)} anual.`
    : `El precio no sube al strike. Recuperás tu ${product.coin} completo + APR del ${fmtPercent(apy)} anual.`;

  const riskLevel = isBuy
    ? (trend === 'DOWN' ? 'Bajo' : trend === 'UP' ? 'Alto' : 'Medio')
    : (trend === 'UP' ? 'Bajo' : trend === 'DOWN' ? 'Alto' : 'Medio');
  const riskColor = riskLevel === 'Bajo' ? 'text-emerald-400' : riskLevel === 'Alto' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className={`rounded-xl border p-4 space-y-4
      ${isBuy ? 'border-blue-800/40 bg-blue-950/10' : 'border-purple-800/40 bg-purple-950/10'}`}>

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-2">
        <span className={`text-sm font-bold px-2.5 py-1 rounded-md
          ${isBuy ? 'bg-blue-900/60 text-blue-200 border border-blue-700' : 'bg-purple-900/60 text-purple-200 border border-purple-700'}`}>
          {isBuy ? '↓ COMPRA (BUY)' : '↑ VENTA (SELL)'}
        </span>
        <span className="text-slate-400 text-xs">Invertís {investAsset}</span>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center">Strike<InfoTip text="Precio al que se ejecuta la operación. Si el precio llega aquí al vencimiento, se ejerce el producto." position="right" /></span>
          <span className="text-white font-semibold">{fmtPrice(strikePrice)} <span className={isBuy ? 'text-blue-400' : 'text-purple-400'}>({strikeDistance > 0 ? '+' : ''}{strikeDistance}%)</span></span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center">Duración<InfoTip text="Días que dura el producto. Al vencimiento se cobra el rendimiento o se ejerce." position="right" /></span>
          <span className="text-slate-200 font-medium">{daysToExpiry}d</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center">APR anual<InfoTip text="Rendimiento anualizado. Representa cuánto ganarías si repitieras el ciclo durante un año completo." position="right" /></span>
          <span className="text-emerald-300 font-bold">{fmtPercent(apy)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center">Rend. total<InfoTip text="Rendimiento real para este ciclo (APR × días / 365). Lo que vas a cobrar en esta operación." position="right" /></span>
          <span className="text-emerald-400 font-semibold">~{fmtPercent(totalReturn)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center">Rend./día<InfoTip text="Cuánto ganás por cada día que el capital está invertido." position="right" /></span>
          <span className="text-emerald-200 font-semibold">{fmtPercent(dailyYield)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center">Riesgo<InfoTip text="Basado en la tendencia de mercado. Bajo = tendencia a favor. Alto = tendencia en contra del strike." position="right" /></span>
          <span className={`font-bold ${riskColor}`}>{riskLevel}</span>
        </div>
      </div>

      {/* Scenarios */}
      <div className="space-y-2">
        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2">
          <p className="text-emerald-300 font-semibold text-xs mb-1">
            {isBuy ? '✅ Precio baja al strike' : '✅ Precio sube al strike'}
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">{favorableDesc}</p>
        </div>
        <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-lg px-3 py-2">
          <p className="text-yellow-300 font-semibold text-xs mb-1">
            {isBuy ? '⚠️ Precio no baja al strike' : '⚠️ Precio no sube al strike'}
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">{unfavorableDesc}</p>
        </div>
      </div>

      {/* Technical */}
      <div className="space-y-2 border-t border-slate-700/50 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs flex items-center">Señal<InfoTip text="Evaluación técnica del momento de mercado: si es buen momento para esta operación según tendencia e indicadores." position="right" /></span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs flex items-center">Confianza<InfoTip text="Qué tan fuerte es la señal técnica. A más alto, más consistentes son los indicadores que apuntan en esa dirección." position="right" /></span>
          <span className="text-slate-200 text-xs font-semibold">{confidence ?? '—'}%</span>
        </div>
        <RiskBar value={confidence ?? 0} />
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs flex items-center">Momentum<InfoTip text="Velocidad y dirección del movimiento de precio reciente. 'Fuerte alza' significa subida acelerada." position="right" /></span>
          <span className={`text-xs font-semibold ${mom.color}`}>{mom.text}</span>
        </div>
        {reason && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded px-2.5 py-2 text-xs text-slate-400 leading-relaxed">
            {reason}
          </div>
        )}
      </div>
    </div>
  );
}

function ProbGauge({ prob, label, color }) {
  if (prob == null) return null;
  const barColor = prob > 60 ? 'bg-red-500' : prob > 35 ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-bold ${prob > 60 ? 'text-red-400' : prob > 35 ? 'text-yellow-400' : 'text-emerald-400'}`}>{prob}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${prob}%` }} />
      </div>
    </div>
  );
}

function CompoundCalc({ product, isBuy }) {
  const [amount, setAmount] = useState(1000);
  if (!product) return null;
  const { apy, daysToExpiry } = product;
  const ratePerCycle = (apy / 100) * (daysToExpiry / 365);
  const cycles = (n) => Math.floor(n / daysToExpiry);
  const compound = (n) => parseFloat((amount * Math.pow(1 + ratePerCycle, cycles(n))).toFixed(2));
  const profit = (n) => parseFloat((compound(n) - amount).toFixed(2));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-slate-400">Capital:</span>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
          <input
            type="number" min="1"
            value={amount}
            onChange={e => setAmount(parseFloat(e.target.value) || 0)}
            className="bg-slate-800 border border-slate-700 rounded pl-5 pr-2 py-1 text-xs text-slate-100 w-28 focus:outline-none focus:border-slate-500"
          />
        </div>
        <span className="text-xs text-slate-500 flex items-center">reinvirtiendo cada {daysToExpiry}d<InfoTip text="Se asume que al terminar cada ciclo reinvertís todo (capital + ganancia). Sin reinversión, el rendimiento sería menor." position="top" /></span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[30, 60, 90, 180, 360].map(d => (
          <div key={d} className={`rounded-lg p-2 text-center
            ${isBuy ? 'bg-blue-950/30 border border-blue-900/50' : 'bg-purple-950/30 border border-purple-900/50'}`}>
            <div className="text-xs text-slate-500 mb-1">{d} días</div>
            <div className="text-sm font-bold text-slate-100">${compound(d).toLocaleString()}</div>
            <div className="text-xs text-emerald-400 font-semibold">+${profit(d).toLocaleString()}</div>
            <div className="text-xs text-slate-600">{cycles(d)} ciclos</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DualExtraAnalysis({ buy, sell, currentPrice, coin }) {
  const ref = buy || sell;
  if (!ref) return null;

  const { weekRange, volatility } = ref;
  const fmtVol = v => v != null ? `${(v * 100).toFixed(0)}%` : '—';

  return (
    <div className="border-t border-slate-700/50 pt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* 1 — Exercise probability */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/40 p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3 flex items-center">
          🎯 Prob. de ejercicio
          <InfoTip text="Qué tan probable es que el precio llegue al strike al vencimiento. Bajo = es menos probable que se ejecute la operación." position="right" />
        </h4>
        <div className="space-y-3">
          {buy && (
            <ProbGauge
              prob={buy.exerciseProb}
              label={`BUY: precio baja a $${buy.strikePrice?.toLocaleString()}`}
              color="blue"
            />
          )}
          {sell && (
            <ProbGauge
              prob={sell.exerciseProb}
              label={`SELL: precio sube a $${sell.strikePrice?.toLocaleString()}`}
              color="purple"
            />
          )}
          {volatility != null && (
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              Volatilidad anual:
              <span className="text-slate-300 font-semibold ml-1">{fmtVol(volatility)}</span>
              <InfoTip text="Qué tanto fluctúa el precio en un año. Alta volatilidad = movimientos más bruscos = mayor probabilidad de ejercicio." position="right" />
            </div>
          )}
          <div className="text-xs text-slate-600 bg-slate-900/50 rounded-lg p-2 leading-relaxed mt-1">
            Verde = baja prob. de ejercicio (más seguro). Rojo = alta prob. (más probable que se ejecute).
          </div>
        </div>
      </div>

      {/* 2 — Strike context + effective price */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/40 p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3 flex items-center">
          📊 Contexto de precio
          <InfoTip text="Dónde está el precio actual dentro de su rango de la semana, y dónde quedan los strikes BUY y SELL." position="right" />
        </h4>
        {weekRange && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>${weekRange.low.toLocaleString()}</span>
              <span className="flex items-center gap-1">
                posición actual: <span className="text-slate-200 font-semibold">{weekRange.pricePosition}%</span>
                <InfoTip text="Dónde está el precio actual dentro del rango de 7 días. 0% = mínimo, 100% = máximo." position="top" />
              </span>
              <span>${weekRange.high.toLocaleString()}</span>
            </div>
            {/* Visual range bar */}
            <div className="relative h-5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700">
              {buy && (
                <div
                  className="absolute top-0 h-full w-1.5 bg-blue-400 opacity-80"
                  style={{ left: `${Math.max(0, Math.min(100, ((buy.strikePrice - weekRange.low) / (weekRange.high - weekRange.low)) * 100))}%` }}
                />
              )}
              {sell && (
                <div
                  className="absolute top-0 h-full w-1.5 bg-purple-400 opacity-80"
                  style={{ left: `${Math.max(0, Math.min(100, ((sell.strikePrice - weekRange.low) / (weekRange.high - weekRange.low)) * 100))}%` }}
                />
              )}
              <div
                className="absolute top-0 h-full w-2.5 bg-white opacity-95 rounded-full shadow"
                style={{ left: `${weekRange.pricePosition}%`, transform: 'translateX(-50%)' }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-1.5">
              <span className="text-blue-400">▌ BUY strike</span>
              <span className="text-white font-medium">● precio actual</span>
              <span className="text-purple-400">▌ SELL strike</span>
            </div>
            <div className="text-xs mt-2 text-slate-500">
              {weekRange.pricePosition > 70
                ? '📈 Precio cerca del máximo — condiciones favorables para SELL'
                : weekRange.pricePosition < 30
                ? '📉 Precio cerca del mínimo — condiciones favorables para BUY'
                : '↔️ Precio en zona media'}
            </div>
          </div>
        )}
        {/* Effective price */}
        <div className="space-y-1.5">
          {buy && (
            <div className="flex justify-between text-xs bg-blue-950/30 rounded-lg px-3 py-2 border border-blue-900/30">
              <span className="text-slate-500 flex items-center">
                Precio efectivo BUY
                <InfoTip text="Strike ajustado por el yield ganado. Es el precio real al que comprás la moneda contando el rendimiento." position="top" />
              </span>
              <span className="text-blue-300 font-bold">${buy.effectivePrice?.toLocaleString() ?? '—'}</span>
            </div>
          )}
          {sell && (
            <div className="flex justify-between text-xs bg-purple-950/30 rounded-lg px-3 py-2 border border-purple-900/30">
              <span className="text-slate-500 flex items-center">
                Precio efectivo SELL
                <InfoTip text="Strike ajustado por el yield ganado. Es el precio real al que vendés la moneda contando el rendimiento." position="top" />
              </span>
              <span className="text-purple-300 font-bold">${sell.effectivePrice?.toLocaleString() ?? '—'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 — Compound calculator */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/40 p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3 flex items-center">
          🔄 Reinversión compuesta
          <InfoTip text="Simulá cuánto crecería tu capital si reinvertís las ganancias en cada ciclo. Cuantos más ciclos, mayor el efecto del interés compuesto." position="left" />
        </h4>
        {buy && (
          <div className="mb-5">
            <div className="text-xs text-blue-300 font-semibold mb-2 flex items-center gap-1">
              ↓ BUY — {buy.apy.toFixed(1)}% APR
            </div>
            <CompoundCalc product={buy} isBuy={true} />
          </div>
        )}
        {sell && (
          <div>
            <div className="text-xs text-purple-300 font-semibold mb-2 flex items-center gap-1">
              ↑ SELL — {sell.apy.toFixed(1)}% APR
            </div>
            <CompoundCalc product={sell} isBuy={false} />
          </div>
        )}
      </div>

    </div>
  );
}

// One row per coin — shows best BUY and best SELL side by side
export default function DualRow({ buy, sell, coin, isBestCoin }) {
  const [expanded, setExpanded] = useState(false);

  // Use whichever product is available for shared coin data
  const ref = buy || sell;
  if (!ref) return null;

  const { currentPrice, change24h, trend, isMock } = ref;
  const coinColor = COIN_COLORS[coin] || '#94a3b8';
  const bestDailyYield = Math.max(buy?.dailyYield ?? 0, sell?.dailyYield ?? 0);

  const rowSignals = [buy?.signal, sell?.signal].filter(Boolean);
  const hasCaution = rowSignals.every(s => s === 'CAUTION');

  const rowBg = isBestCoin
    ? 'bg-emerald-950/30 border-l-2 border-l-emerald-500'
    : hasCaution
    ? 'bg-red-950/20'
    : '';

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        className={`border-b border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer select-none
          ${rowBg} ${expanded ? 'bg-slate-800/30' : ''}`}
      >
        {/* Moneda */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: coinColor }} />
            <span className="text-slate-100 font-bold text-sm">{coin}</span>
            {isBestCoin && (
              <span className="text-xs text-emerald-400 bg-emerald-900/50 border border-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                TOP
              </span>
            )}
            {isMock && (
              <span className="text-xs text-yellow-600 bg-yellow-900/30 px-1.5 py-0.5 rounded">demo</span>
            )}
          </div>
        </td>

        {/* Precio Actual + cambio 24h */}
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <span className="text-slate-100 font-semibold text-sm">{fmtPrice(currentPrice)}</span>
          {change24h != null && (
            <div className={`text-xs mt-0.5 font-medium ${change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtChange(change24h)}
            </div>
          )}
        </td>

        {/* Tendencia */}
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <span className={`text-xs font-semibold px-2 py-1 rounded
            ${trend === 'UP' ? 'bg-emerald-900/40 text-emerald-400'
            : trend === 'DOWN' ? 'bg-red-900/40 text-red-400'
            : 'bg-slate-800 text-slate-500'}`}>
            {trend === 'UP' ? '▲ Alcista' : trend === 'DOWN' ? '▼ Bajista' : '— N/D'}
          </span>
        </td>

        {/* Card COMPRA */}
        <td className="px-3 py-2 w-64">
          <OpCard product={buy} isBuy={true} />
        </td>

        {/* Card VENTA */}
        <td className="px-3 py-2 w-64">
          <OpCard product={sell} isBuy={false} />
        </td>

        {/* Mejor Rend./Día + chevron */}
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-3">
            <div>
              <span className="text-emerald-300 font-bold text-sm">{fmtPercent(bestDailyYield)}</span>
              <div className="text-xs text-slate-500 mt-0.5">por día</div>
            </div>
            <span className={`text-slate-500 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-slate-700">
          <td colSpan={6} className="px-6 py-5 bg-slate-900/70">
            <div className="space-y-4">
              {/* Existing coin header — keep as-is */}
              <div className="flex items-center gap-3 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: coinColor }} />
                <span className="text-slate-100 font-bold text-base">{coin}</span>
                <span className="text-slate-400 text-sm">{fmtPrice(currentPrice)}</span>
                {change24h != null && (
                  <span className={`text-sm font-medium ${change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtChange(change24h)}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ml-1
                  ${trend === 'UP' ? 'bg-emerald-900/40 text-emerald-400' : trend === 'DOWN' ? 'bg-red-900/40 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                  {trend === 'UP' ? '▲ Alcista' : trend === 'DOWN' ? '▼ Bajista' : '— N/D'}
                </span>
              </div>

              {/* Existing two OpDetail cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OpDetail product={buy} isBuy={true} currentPrice={currentPrice} />
                <OpDetail product={sell} isBuy={false} currentPrice={currentPrice} />
              </div>

              {/* NEW: extra analysis sections */}
              <DualExtraAnalysis buy={buy} sell={sell} currentPrice={currentPrice} coin={coin} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
