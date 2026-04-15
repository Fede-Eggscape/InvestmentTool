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

function VerdictChip({ analysis }) {
  if (!analysis) return null;
  const cls = {
    emerald: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/60',
    green:   'bg-green-900/50  text-green-300  border-green-700/60',
    yellow:  'bg-yellow-900/50 text-yellow-300 border-yellow-700/60',
    orange:  'bg-orange-900/50 text-orange-300 border-orange-700/60',
    red:     'bg-red-900/50    text-red-300    border-red-700/60',
  }[analysis.verdictColor] || 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold ${cls}`}>
      {analysis.verdict}
    </span>
  );
}

export default function MeteoraRow({ pool }) {
  const [expanded, setExpanded] = useState(false);
  const { pair, type, apy, tvl, vol24h, fees24h, dailyYield, baseFee, binStep, analysis } = pool;
  const color = getCoinColor(pair);

  const apyColor =
    apy > 200 ? 'text-emerald-200 font-bold' :
    apy > 50  ? 'text-emerald-300 font-bold' :
    apy > 10  ? 'text-emerald-400 font-semibold' :
                'text-slate-400';

  return (
    <>
      {/* Main row */}
      <tr
        className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Par */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-slate-100 font-semibold text-sm">{pair}</span>
            {/* Chevron */}
            <svg
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 ml-4">
            {binStep > 0 && (
              <span className="text-xs text-slate-600">bin step: {binStep} · fee: {baseFee}%</span>
            )}
            <VerdictChip analysis={analysis} />
          </div>
        </td>

        {/* Tipo */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-xs px-2 py-0.5 rounded font-medium bg-violet-900/50 text-violet-300 border border-violet-800">
            {type}
          </span>
        </td>

        {/* APY */}
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <span className={`text-sm ${apyColor}`}>{fmtPercent(apy)}</span>
          <div className="text-xs text-slate-600 mt-0.5">APY</div>
        </td>

        {/* Fees 24h */}
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <span className="text-slate-200 text-sm font-semibold">
            {fees24h > 0 ? fmtCompact(fees24h) : '—'}
          </span>
          <div className="text-xs text-slate-600 mt-0.5">en 24h</div>
        </td>

        {/* TVL */}
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <span className="text-slate-100 text-sm font-semibold">{fmtCompact(tvl)}</span>
          <div className="text-xs text-slate-600 mt-0.5">liquidez</div>
        </td>

        {/* Volumen 24h */}
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <span className="text-slate-300 text-sm">{vol24h > 0 ? fmtCompact(vol24h) : '—'}</span>
          <div className="text-xs text-slate-600 mt-0.5">volumen</div>
        </td>

        {/* Yield por Día */}
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <span className="text-emerald-300 font-bold text-sm">{fmtPercent(dailyYield)}</span>
          <div className="text-xs text-slate-600 mt-0.5">por día</div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="border-b border-slate-700/60">
          <td colSpan={7} className="p-0">
            <MeteoraDetailPanel pool={pool} />
          </td>
        </tr>
      )}
    </>
  );
}
