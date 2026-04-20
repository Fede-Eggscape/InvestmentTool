const TABS = [
  { id: 'dual', label: 'Inversión Fija', sub: 'Binance Dual Investment' },
  { id: 'meteora', label: 'Pools de Liquidez', sub: 'Meteora · Solana' },
];

export default function TabNav({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-900 border-b border-slate-800 px-6">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex flex-col items-center gap-0.5
            ${active === tab.id
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
        >
          <span>{tab.label}</span>
          <span className="text-xs opacity-60">{tab.sub}</span>
        </button>
      ))}
    </div>
  );
}
