export default function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            IV
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-none">Investment Analyzer</h1>
            <p className="text-slate-400 text-xs mt-0.5">Binance Dual Investment · Meteora Pools</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-xs">En vivo</span>
        </div>
      </div>
    </header>
  );
}
