import { useState } from 'react';
import { COIN_COLORS, SIGNAL_CONFIG } from '../../constants/coins';
import { fmtPercent, fmtPrice, fmtChange } from '../../utils/formatters';
import { InfoTip } from '../shared/Tooltip';

const SIGNAL_ORDER = { STRONG_BUY: 0, BUY: 1, NEUTRAL: 2, CAUTION: 3 };

const SIGNAL_UI = {
  STRONG_BUY: {
    label: 'Muy recomendado',
    headerBg: 'bg-emerald-900',
    headerText: 'text-emerald-200',
    border: 'border-emerald-600/60',
    dot: 'bg-emerald-400',
    cardBg: 'bg-slate-900',
    accentText: 'text-emerald-300',
  },
  BUY: {
    label: 'Recomendado',
    headerBg: 'bg-green-950',
    headerText: 'text-green-200',
    border: 'border-green-700/60',
    dot: 'bg-green-400',
    cardBg: 'bg-slate-900',
    accentText: 'text-green-300',
  },
  NEUTRAL: {
    label: 'Sin señal clara',
    headerBg: 'bg-slate-800',
    headerText: 'text-slate-300',
    border: 'border-slate-600/60',
    dot: 'bg-slate-400',
    cardBg: 'bg-slate-900',
    accentText: 'text-slate-300',
  },
  CAUTION: {
    label: 'No recomendado',
    headerBg: 'bg-red-950',
    headerText: 'text-red-200',
    border: 'border-red-800/60',
    dot: 'bg-red-400',
    cardBg: 'bg-slate-900',
    accentText: 'text-red-300',
  },
};

const MOMENTUM_LABEL = {
  STRONG_UP:   { text: 'Fuerte alza',   color: 'text-emerald-400' },
  UP:          { text: 'Alza moderada', color: 'text-emerald-600' },
  DOWN:        { text: 'Baja moderada', color: 'text-red-500'     },
  STRONG_DOWN: { text: 'Fuerte caída',  color: 'text-red-400'     },
  UNKNOWN:     { text: 'Desconocido',   color: 'text-slate-500'   },
};

function pickBest(buy, sell) {
  if (!buy && !sell) return null;
  if (!buy) return { product: sell, isBuy: false };
  if (!sell) return { product: buy, isBuy: true };
  const bScore = (SIGNAL_ORDER[buy.signal] ?? 4) * 10000 - buy.apy;
  const sScore = (SIGNAL_ORDER[sell.signal] ?? 4) * 10000 - sell.apy;
  return bScore <= sScore ? { product: buy, isBuy: true } : { product: sell, isBuy: false };
}

function RiskBar({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function OpDetail({ product, isBuy, currentPrice }) {
  if (!product) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-600 text-sm italic">
        Sin datos para esta operación
      </div>
    );
  }

  const { apy, strikePrice, daysToExpiry, dailyYield, signal, confidence, reason, strikeDistance, trend, momentum } = product;
  const mom = MOMENTUM_LABEL[momentum] || MOMENTUM_LABEL.UNKNOWN;
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.NEUTRAL;
  const totalReturn = parseFloat((apy / 365 * daysToExpiry).toFixed(2));
  const investAsset = isBuy ? 'USDT' : product.coin;

  const favorableDesc = isBuy
    ? `El precio baja hasta ${fmtPrice(strikePrice)} (${Math.abs(strikeDistance ?? 0).toFixed(1)}% más bajo que hoy). Recibís ${product.coin} a precio de descuento más el rendimiento acumulado.`
    : `El precio sube hasta ${fmtPrice(strikePrice)} (${(strikeDistance ?? 0).toFixed(1)}% más alto que hoy). Vendés a precio premium más el rendimiento acumulado.`;

  const unfavorableDesc = isBuy
    ? `El precio no baja al objetivo. Recuperás tus dólares (USDT) completos más el rendimiento del ${fmtPercent(apy)} anual.`
    : `El precio no sube al objetivo. Recuperás tu ${product.coin} completo más el rendimiento del ${fmtPercent(apy)} anual.`;

  const riskLevel = isBuy
    ? (trend === 'DOWN' ? 'Bajo' : trend === 'UP' ? 'Alto' : 'Medio')
    : (trend === 'UP' ? 'Bajo' : trend === 'DOWN' ? 'Alto' : 'Medio');
  const riskColor = riskLevel === 'Bajo' ? 'text-emerald-400' : riskLevel === 'Alto' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className={`rounded-xl border p-4 space-y-4 ${isBuy ? 'border-blue-800/40 bg-blue-950/10' : 'border-purple-800/40 bg-purple-950/10'}`}>
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-2">
        <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${isBuy ? 'bg-blue-900/60 text-blue-200 border border-blue-700' : 'bg-purple-900/60 text-purple-200 border border-purple-700'}`}>
          {isBuy ? 'Invertís dólares (USDT)' : `Invertís ${product.coin}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center">Precio objetivo<InfoTip text="Si el precio llega aquí al vencimiento, tu inversión se convierte al otro activo." position="right" /></span>
          <span className="text-white font-semibold">{fmtPrice(strikePrice)} <span className={isBuy ? 'text-blue-400' : 'text-purple-400'}>({strikeDistance > 0 ? '+' : ''}{strikeDistance}%)</span></span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Duración</span>
          <span className="text-slate-200 font-medium">{daysToExpiry}d</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center">Rendimiento anual<InfoTip text="Lo que ganarías si repetieras esta inversión durante un año completo." position="right" /></span>
          <span className="text-emerald-300 font-bold">{fmtPercent(apy)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Ganancia en este ciclo</span>
          <span className="text-emerald-400 font-semibold">~{fmtPercent(totalReturn)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Ganancia por día</span>
          <span className="text-emerald-200 font-semibold">{fmtPercent(dailyYield)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Riesgo</span>
          <span className={`font-bold ${riskColor}`}>{riskLevel}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2">
          <p className="text-emerald-300 font-semibold text-xs mb-1">✅ El precio llega al objetivo</p>
          <p className="text-slate-400 text-xs leading-relaxed">{favorableDesc}</p>
        </div>
        <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-lg px-3 py-2">
          <p className="text-yellow-300 font-semibold text-xs mb-1">⚠️ El precio no llega al objetivo</p>
          <p className="text-slate-400 text-xs leading-relaxed">{unfavorableDesc}</p>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-700/50 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs">Señal</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs">Confianza</span>
          <span className="text-slate-200 text-xs font-semibold">{confidence ?? '—'}%</span>
        </div>
        <RiskBar value={confidence ?? 0} />
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs">Momentum</span>
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

function ProbGauge({ prob, label }) {
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
        <span className="text-xs text-slate-500">reinvirtiendo cada {daysToExpiry}d</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[30, 60, 90, 180, 360].map(d => (
          <div key={d} className={`rounded-lg p-2 text-center ${isBuy ? 'bg-blue-950/30 border border-blue-900/50' : 'bg-purple-950/30 border border-purple-900/50'}`}>
            <div className="text-xs text-slate-500 mb-1">{d}d</div>
            <div className="text-sm font-bold text-slate-100">${compound(d).toLocaleString()}</div>
            <div className="text-xs text-emerald-400 font-semibold">+${profit(d).toLocaleString()}</div>
            <div className="text-xs text-slate-600">{cycles(d)} ciclos</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DualExtraAnalysis({ buy, sell }) {
  const ref = buy || sell;
  if (!ref) return null;
  const { weekRange, volatility } = ref;
  const fmtVol = v => v != null ? `${(v * 100).toFixed(0)}%` : '—';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/40 p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
          Probabilidad de activación <InfoTip text="Qué tan probable es que el precio llegue al precio objetivo al vencimiento." position="right" />
        </h4>
        <div className="space-y-3">
          {buy && <ProbGauge prob={buy.exerciseProb} label={`Inversión en dólares: precio baja a $${buy.strikePrice?.toLocaleString()}`} />}
          {sell && <ProbGauge prob={sell.exerciseProb} label={`Inversión en cripto: precio sube a $${sell.strikePrice?.toLocaleString()}`} />}
          {volatility != null && (
            <div className="text-xs text-slate-500 mt-1">
              Volatilidad anual: <span className="text-slate-300 font-semibold">{fmtVol(volatility)}</span>
            </div>
          )}
          <div className="text-xs text-slate-600 bg-slate-900/50 rounded-lg p-2 leading-relaxed">
            Verde = es poco probable que se active. Rojo = es muy probable que se active.
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/40 p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
          Rango de precio semanal <InfoTip text="Dónde está el precio hoy comparado con los últimos 7 días." position="right" />
        </h4>
        {weekRange && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>${weekRange.low.toLocaleString()}</span>
              <span>posición: <span className="text-slate-200 font-semibold">{weekRange.pricePosition}%</span></span>
              <span>${weekRange.high.toLocaleString()}</span>
            </div>
            <div className="relative h-5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700">
              {buy && (
                <div className="absolute top-0 h-full w-1.5 bg-blue-400 opacity-80"
                  style={{ left: `${Math.max(0, Math.min(100, ((buy.strikePrice - weekRange.low) / (weekRange.high - weekRange.low)) * 100))}%` }} />
              )}
              {sell && (
                <div className="absolute top-0 h-full w-1.5 bg-purple-400 opacity-80"
                  style={{ left: `${Math.max(0, Math.min(100, ((sell.strikePrice - weekRange.low) / (weekRange.high - weekRange.low)) * 100))}%` }} />
              )}
              <div className="absolute top-0 h-full w-2.5 bg-white opacity-95 rounded-full shadow"
                style={{ left: `${weekRange.pricePosition}%`, transform: 'translateX(-50%)' }} />
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-1.5">
              <span className="text-blue-400">▌ BUY strike</span>
              <span className="text-white font-medium">● precio actual</span>
              <span className="text-purple-400">▌ SELL strike</span>
            </div>
            <div className="text-xs mt-2 text-slate-500">
              {weekRange.pricePosition > 70 ? '📈 Cerca del máximo semanal — buen momento para vender'
                : weekRange.pricePosition < 30 ? '📉 Cerca del mínimo semanal — buen momento para comprar'
                : '↔️ Precio en zona media'}
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          {buy && (
            <div className="flex justify-between text-xs bg-blue-950/30 rounded-lg px-3 py-2 border border-blue-900/30">
              <span className="text-slate-500">Precio real de compra (con ganancia)</span>
              <span className="text-blue-300 font-bold">${buy.effectivePrice?.toLocaleString() ?? '—'}</span>
            </div>
          )}
          {sell && (
            <div className="flex justify-between text-xs bg-purple-950/30 rounded-lg px-3 py-2 border border-purple-900/30">
              <span className="text-slate-500">Precio real de venta (con ganancia)</span>
              <span className="text-purple-300 font-bold">${sell.effectivePrice?.toLocaleString() ?? '—'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/40 p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
          Calculadora de ganancias <InfoTip text="Cuánto crecería tu capital si reinvertís las ganancias al terminar cada ciclo." position="left" />
        </h4>
        {buy && (
          <div className="mb-5">
            <div className="text-xs text-blue-300 font-semibold mb-2">Invertís dólares — {buy.apy.toFixed(1)}% anual</div>
            <CompoundCalc product={buy} isBuy={true} />
          </div>
        )}
        {sell && (
          <div>
            <div className="text-xs text-purple-300 font-semibold mb-2">Invertís {sell.coin} — {sell.apy.toFixed(1)}% anual</div>
            <CompoundCalc product={sell} isBuy={false} />
          </div>
        )}
      </div>
    </div>
  );
}

// Main card component — shown in the card grid
export default function DualCard({ buy, sell, coin, isBestCoin, isSelected, onSelect }) {
  const ref = buy || sell;
  if (!ref) return null;

  const { currentPrice, change24h, trend, isMock } = ref;
  const coinColor = COIN_COLORS[coin] || '#94a3b8';
  const bestDailyYield = Math.max(buy?.dailyYield ?? 0, sell?.dailyYield ?? 0);

  const best = pickBest(buy, sell);
  const signal = best?.product.signal ?? 'NEUTRAL';
  const ui = SIGNAL_UI[signal] || SIGNAL_UI.NEUTRAL;

  const hasBoth = !!(buy && sell);
  const altProduct = best?.isBuy ? sell : buy;

  return (
    <div
      className={`rounded-2xl overflow-hidden border transition-all duration-200
        ${ui.border}
        ${isSelected ? 'ring-2 ring-offset-2 ring-offset-slate-950 ring-blue-500' : ''}
        ${isBestCoin ? 'ring-1 ring-emerald-500/50' : ''}
      `}
    >
      {/* Signal header — colored banner */}
      <div
        className={`${ui.headerBg} px-4 py-3 cursor-pointer flex items-center justify-between`}
        onClick={onSelect}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${ui.dot}`} />
          <span className={`font-black text-sm uppercase tracking-wide ${ui.headerText}`}>
            {ui.label}
          </span>
          {isBestCoin && (
            <span className="text-xs bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
              #1
            </span>
          )}
        </div>
        {isMock && (
          <span className="text-xs text-yellow-600 bg-yellow-900/30 px-1.5 py-0.5 rounded">demo</span>
        )}
      </div>

      {/* Card body */}
      <div className={`${ui.cardBg} px-4 pt-4 pb-3`}>

        {/* Coin row */}
        <div className="flex items-center gap-2 mb-4" onClick={onSelect} style={{ cursor: 'pointer' }}>
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: coinColor }} />
          <span className="text-white font-bold text-lg leading-none">{coin}</span>
          <span className="text-slate-400 text-sm ml-1">{fmtPrice(currentPrice)}</span>
          {change24h != null && (
            <span className={`ml-auto text-xs font-bold ${change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtChange(change24h)}
            </span>
          )}
        </div>

        {/* Rendimiento — main number */}
        <div className="mb-4 cursor-pointer" onClick={onSelect}>
          <div className={`text-4xl font-black leading-none ${ui.accentText}`}>
            {fmtPercent(best?.product.apy ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">rendimiento anual estimado</div>
        </div>

        {/* Cómo funciona */}
        <div
          className={`rounded-xl px-3 py-2.5 mb-3 cursor-pointer
            ${best?.isBuy
              ? 'bg-blue-950/50 border border-blue-800/50'
              : 'bg-purple-950/50 border border-purple-800/50'}`}
          onClick={onSelect}
        >
          <div className={`text-sm font-bold leading-none mb-1 ${best?.isBuy ? 'text-blue-300' : 'text-purple-300'}`}>
            {best?.isBuy ? 'Invertís en dólares (USDT)' : `Invertís en ${coin}`}
          </div>
          <div className="text-xs text-slate-400">
            Precio objetivo: {fmtPrice(best?.product.strikePrice)} · dura {best?.product.daysToExpiry} días
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3" onClick={onSelect} style={{ cursor: 'pointer' }}>
          <div className="flex-1 bg-slate-800/60 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-slate-500 mb-0.5">Ganancia diaria</div>
            <div className="text-emerald-300 font-black text-base">{fmtPercent(bestDailyYield)}</div>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-slate-500 mb-0.5">Precio hoy</div>
            <div className={`font-bold text-sm ${trend === 'UP' ? 'text-emerald-400' : trend === 'DOWN' ? 'text-red-400' : 'text-slate-400'}`}>
              {trend === 'UP' ? '▲ En alza' : trend === 'DOWN' ? '▼ En baja' : '— Estable'}
            </div>
          </div>
        </div>

        {/* Alternative option hint */}
        {hasBoth && altProduct && (
          <div className="text-center mb-2">
            <span className="text-xs text-slate-600">
              También disponible:{' '}
              <span className={altProduct === sell ? 'text-purple-400' : 'text-blue-400'}>
                {altProduct === sell ? `Invertís ${coin}` : 'Invertís dólares'} · {fmtPercent(altProduct.apy)}
              </span>
            </span>
          </div>
        )}

        {/* Expand/collapse */}
        <button
          onClick={onSelect}
          className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1 pt-1 border-t border-slate-800 mt-1"
        >
          {isSelected ? 'Ocultar análisis ▲' : 'Ver análisis completo ▼'}
        </button>
      </div>

      {/* Expanded detail */}
      {isSelected && (
        <div className="bg-slate-900/70 border-t border-slate-700 px-4 py-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: coinColor }} />
            <span className="text-slate-100 font-bold text-base">{coin}</span>
            <span className="text-slate-400 text-sm">{fmtPrice(currentPrice)}</span>
            {change24h != null && (
              <span className={`text-sm font-medium ${change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtChange(change24h)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <OpDetail product={buy} isBuy={true} currentPrice={currentPrice} />
            <OpDetail product={sell} isBuy={false} currentPrice={currentPrice} />
          </div>

          <DualExtraAnalysis buy={buy} sell={sell} currentPrice={currentPrice} coin={coin} />
        </div>
      )}
    </div>
  );
}
