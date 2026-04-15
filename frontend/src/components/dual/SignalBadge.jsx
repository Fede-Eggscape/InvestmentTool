import { useState } from 'react';
import { SIGNAL_CONFIG } from '../../constants/coins';

export default function SignalBadge({ signal, confidence, reason }) {
  const [showTip, setShowTip] = useState(false);
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.NEUTRAL;

  return (
    <div className="relative inline-flex">
      <button
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
        {confidence != null && (
          <span className="opacity-70 font-normal">{confidence}%</span>
        )}
      </button>

      {showTip && reason && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56
          bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl pointer-events-none">
          <p className="text-slate-200 text-xs leading-relaxed">{reason}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-600" />
        </div>
      )}
    </div>
  );
}
