import { useState } from 'react';
import { COIN_COLORS } from '../../constants/coins';
import { fmtPercent, fmtCompact } from '../../utils/formatters';
import MeteoraDetailPanel from './MeteoraDetailPanel';

const COIN_VARIANTS = {
  BTC:  ['BTC', 'WBTC', 'CBBTC'],
  ETH:  ['ETH', 'WETH', 'CBETH'],
  SOL:  ['SOL', 'WSOL'],
  BNB:  ['BNB', 'WBNB'],
  XRP:  ['XRP'],
  AVAX: ['AVAX'],
  ADA:  ['ADA'],
  DOGE: ['DOGE'],
  PAXG: ['PAXG'],
  TON:  ['TON'],
};

function getCoinColor(pairName) {
  if (!pairName) return '#94a3b8';
  const parts = pairName.toUpperCase().split(/[-/_ ]/);
  for (const [coin, variants] of Object.entries(COIN_VARIANTS)) {
    if (parts.some(p => variants.includes(p))) return COIN_COLORS[coin] || '#94a3b8';
  }
  return '#94a3b8';
}

const VERDICT_UI = {
  EXCELENTE: {
    label: 'Excelente',
    stars: '★★★',
    headerBg: 'bg-emerald-900',
    headerText: 'text-emerald-200',
    border: 'border-emerald-600/60',
    dot: 'bg-emerald-400',
    apyColor: 'text-emerald-300',
  },
  BUENA: {
    label: 'Buena',
    stars: '★★☆',
    headerBg: 'bg-green-950',
    headerText: 'text-green-200',
    border: 'border-green-700/60',
    dot: 'bg-green-400',
    apyColor: 'text-green-300',
  },
  ACEPTABLE: {
    label: 'Aceptable',
    stars: '★☆☆',
    headerBg: 'bg-yellow-950',
    headerText: 'text-yellow-200',
    border: 'border-yellow-700/60',
    dot: 'bg-yellow-400',
    apyColor: 'text-yellow-300',
  },
  'PRECAUCIÓN': {
    label: 'Precaución',
    stars: '⚠',
    headerBg: 'bg-orange-950',
    headerText: 'text-orange-200',
    border: 'border-orange-700/60',
    dot: 'bg-orange-400',
    apyColor: 'text-orange-300',
  },
  EVITAR: {
    label: 'Evitar',
    stars: '✕',
    headerBg: 'bg-red-950',
    headerText: 'text-red-200',
    border: 'border-red-800/60',
    dot: 'bg-red-500',
    apyColor: 'text-red-300',
  },
};

const DEFAULT_UI = {
  label: 'Sin datos',
  stars: '?',
  headerBg: 'bg-slate-800',
  headerText: 'text-slate-300',
  border: 'border-slate-600/60',
  dot: 'bg-slate-400',
  apyColor: 'text-slate-300',
};

export default function MeteoraCard({ pool, isFirst }) {
  const [expanded, setExpanded] = useState(false);
  const { pair, type, apy, tvl, vol24h, fees24h, dailyYield, baseFee, binStep, analysis } = pool;

  const color = getCoinColor(pair);
  const verdict = analysis?.verdict;
  const ui = VERDICT_UI[verdict] || DEFAULT_UI;

  const reliabilityScore = analysis?.reliabilityScore ?? null;
  const reliabilityColor =
    reliabilityScore >= 70 ? 'bg-emerald-500' :
    reliabilityScore >= 45 ? 'bg-yellow-500' :
    'bg-red-500';

  return (
    <div
      className={`rounded-2xl overflow-hidden border transition-all duration-200
        ${ui.border}
        ${isFirst ? 'ring-1 ring-emerald-500/50' : ''}
      `}
    >
      {/* Verdict header — colored banner */}
      <div
        className={`${ui.headerBg} px-4 py-3 cursor-pointer flex items-center justify-between`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${ui.dot}`} />
          <span className={`font-black text-sm uppercase tracking-wide ${ui.headerText}`}>
            {ui.stars} {ui.label}
          </span>
          {isFirst && (
            <span className="text-xs bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
              #1
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-medium
          ${type === 'DLMM' ? 'bg-violet-900/60 text-violet-300' : 'bg-blue-900/60 text-blue-300'}`}>
          {type}
        </span>
      </div>

      {/* Card body */}
      <div className="bg-slate-900 px-4 pt-4 pb-3">

        {/* Pool name */}
        <div
          className="flex items-center gap-2 mb-4 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-white font-bold text-lg leading-none">{pair}</span>
          {binStep > 0 && (
            <span className="text-xs text-slate-600 ml-auto">fee {baseFee}%</span>
          )}
        </div>

        {/* APY — main number */}
        <div className="mb-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
          <div className={`text-4xl font-black leading-none ${ui.apyColor}`}>
            {fmtPercent(apy)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">rendimiento anual estimado</div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div
            className="bg-slate-800/60 rounded-xl px-3 py-2.5 cursor-pointer"
            onClick={() => setExpanded(e => !e)}
          >
            <div className="text-xs text-slate-500 mb-0.5">Fondos en el pool</div>
            <div className="text-white font-bold">{fmtCompact(tvl)}</div>
          </div>
          <div
            className="bg-slate-800/60 rounded-xl px-3 py-2.5 cursor-pointer"
            onClick={() => setExpanded(e => !e)}
          >
            <div className="text-xs text-slate-500 mb-0.5">Ganancia diaria</div>
            <div className="text-emerald-300 font-black text-base">{fmtPercent(dailyYield)}</div>
          </div>
          {fees24h > 0 && (
            <div
              className="bg-slate-800/60 rounded-xl px-3 py-2.5 cursor-pointer"
              onClick={() => setExpanded(e => !e)}
            >
              <div className="text-xs text-slate-500 mb-0.5">Comisiones generadas (24h)</div>
              <div className="text-slate-200 font-semibold">{fmtCompact(fees24h)}</div>
            </div>
          )}
          {vol24h > 0 && (
            <div
              className="bg-slate-800/60 rounded-xl px-3 py-2.5 cursor-pointer"
              onClick={() => setExpanded(e => !e)}
            >
              <div className="text-xs text-slate-500 mb-0.5">Volumen 24h</div>
              <div className="text-slate-300 font-semibold">{fmtCompact(vol24h)}</div>
            </div>
          )}
        </div>

        {/* Reliability bar */}
        {reliabilityScore != null && (
          <div className="mb-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Fiabilidad</span>
              <span className={`font-semibold ${reliabilityScore >= 70 ? 'text-emerald-400' : reliabilityScore >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                {reliabilityScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${reliabilityColor}`}
                style={{ width: `${reliabilityScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1 pt-2 border-t border-slate-800"
        >
          {expanded ? 'Ocultar análisis ▲' : 'Ver análisis completo ▼'}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-700/60">
          <MeteoraDetailPanel pool={pool} />
        </div>
      )}
    </div>
  );
}
