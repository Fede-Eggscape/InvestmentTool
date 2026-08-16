import { useState, useEffect } from 'react';
import client from '../api/client';

/* ─── Formatters ─── */
const fmtUSD = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtPct = (n, showSign = true) => {
  const sign = showSign && n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
};
const fmtQty = (n) => {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1)    return n.toFixed(4);
  return n.toFixed(6);
};

/* ─── Pencil icon ─── */
function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
function XIcon({ size = 4 }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function ChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ─── Pool name inline editor ─── */
function PoolNameEditor({ poolId, name, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(name);

  async function save() {
    if (!value.trim()) return;
    try {
      await client.put(`/wallet/pools/${poolId}/name`, { name: value.trim() });
      onSave(value.trim());
      setEditing(false);
    } catch {
      alert('Failed to save name');
    }
  }

  function cancel() { setValue(name); setEditing(false); }

  function onKey(e) {
    if (e.key === 'Enter')  save();
    if (e.key === 'Escape') cancel();
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1.5">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          className="bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-slate-100 text-base font-semibold focus:outline-none focus:border-emerald-500 w-52"
        />
        <button onClick={save} className="text-emerald-400 hover:text-emerald-300"><CheckIcon /></button>
        <button onClick={cancel} className="text-slate-500 hover:text-slate-300"><XIcon /></button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 group">
      <span className="text-slate-100 font-semibold text-base">{name}</span>
      <button
        onClick={() => { setValue(name); setEditing(true); }}
        className="text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <PencilIcon />
      </button>
    </span>
  );
}

/* ─── Month row ─── */
function MonthRow({ month, onClick }) {
  const value = month.isCurrent ? month.currentValue : month.finalValue;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/60 transition-colors text-left group"
    >
      <div className="flex items-center gap-3">
        <div className="text-slate-300 text-sm font-medium">{month.label}</div>
        {month.isCurrent && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400 border border-emerald-800/50">Current</span>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm">
        {month.withdrawals > 0 && (
          <span className="text-amber-400 text-xs">Withdrawal: {fmtUSD(month.withdrawals)}</span>
        )}
        <span className="text-emerald-400 font-medium">{fmtPct(month.generatedPct)}</span>
        <span className="text-emerald-300 font-medium">{fmtUSD(month.generatedUsd)}</span>
        <span className="text-slate-400">{fmtUSD(value)}</span>
        <span className="text-slate-600 group-hover:text-slate-400 transition-colors"><ChevronRight /></span>
      </div>
    </button>
  );
}

/* ─── Day row ─── */
function DayRow({ day }) {
  const total = day.pairs.reduce((s, p) => s + p.usd, 0);
  return (
    <div className="px-5 py-3 border-b border-slate-800/50 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs font-mono">
          {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
        </span>
        <span className="text-emerald-300 text-xs font-medium">+{fmtUSD(total)}</span>
      </div>
      <div className="space-y-1">
        {day.pairs.map((p, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-slate-300 text-xs font-mono bg-slate-800 px-2 py-0.5 rounded">{p.pair}</span>
            <div className="flex items-center gap-3 text-xs">
              <span className={p.pct >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtPct(p.pct)}</span>
              <span className={p.usd >= 0 ? 'text-emerald-300' : 'text-red-300'}>{fmtUSD(p.usd)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Month summary card ─── */
function MonthSummaryCard({ month }) {
  const value = month.isCurrent ? month.currentValue : month.finalValue;
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div>
        <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Current Value</div>
        <div className="text-slate-100 font-bold text-lg">{fmtUSD(value)}</div>
      </div>
      <div>
        <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Initial Value</div>
        <div className="text-slate-300 font-semibold text-lg">{fmtUSD(month.initialValue)}</div>
      </div>
      <div>
        <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Generated</div>
        <div className="text-emerald-400 font-bold text-lg">
          {fmtPct(month.generatedPct)} <span className="text-emerald-300 font-semibold text-base">({fmtUSD(month.generatedUsd)})</span>
        </div>
      </div>
      {!month.isCurrent && month.withdrawals > 0 && (
        <div>
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Withdrawals</div>
          <div className="text-amber-400 font-semibold text-lg">{fmtUSD(month.withdrawals)}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Month detail view ─── */
function MonthDetailView({ pool, month, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm mb-5 transition-colors">
        <ChevronLeft /> Back to {pool.name}
      </button>
      <div className="mb-5">
        <div className="text-slate-500 text-xs mb-1">{pool.name}</div>
        <h2 className="text-slate-100 text-xl font-bold">{month.label}</h2>
      </div>
      <MonthSummaryCard month={month} />
      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800">
          <h3 className="text-slate-300 font-medium text-sm">Daily Breakdown ({month.days.length} days)</h3>
        </div>
        {month.days.length === 0 ? (
          <p className="text-slate-500 text-sm px-5 py-4">No daily data available.</p>
        ) : (
          <div>{month.days.slice().reverse().map((day, i) => <DayRow key={i} day={day} />)}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Pool detail view ─── */
function PoolDetailView({ pool, onBack, onPoolNameSave }) {
  const [selectedMonth, setSelectedMonth] = useState(null);

  if (selectedMonth) {
    return (
      <MonthDetailView
        pool={pool}
        month={selectedMonth}
        onBack={() => setSelectedMonth(null)}
      />
    );
  }

  const currentMonth = pool.months.find((m) => m.isCurrent) || pool.months[pool.months.length - 1];
  const sortedMonths = [...pool.months].reverse();

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm mb-5 transition-colors">
        <ChevronLeft /> Back to Pools
      </button>

      {/* Pool header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <PoolNameEditor poolId={pool.id} name={pool.name} onSave={onPoolNameSave} />
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge pool={pool} />
            <span className="text-slate-500 text-xs">{pool.status === 'open' ? `Since ${pool.openedAt}` : `Closed ${pool.closedAt}`}</span>
          </div>
        </div>
      </div>

      {/* Current month summary */}
      {currentMonth && (
        <div className="mb-2">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
            {currentMonth.isCurrent ? 'Current Month' : 'Last Month'} — {currentMonth.label}
          </div>
          <MonthSummaryCard month={currentMonth} />
        </div>
      )}

      {/* Monthly list */}
      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-slate-300 font-medium text-sm">Monthly History</h3>
          <div className="text-slate-500 text-xs hidden sm:flex items-center gap-6 pr-1">
            <span>Withdrawal</span><span>Return %</span><span>Return $</span><span>Value</span>
          </div>
        </div>
        <div className="divide-y divide-slate-800/60">
          {sortedMonths.map((m) => (
            <MonthRow key={m.monthKey} month={m} onClick={() => setSelectedMonth(m)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Pool card (overview) ─── */
function StatusBadge({ pool }) {
  if (pool.status === 'open') {
    return <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 text-xs font-medium border border-emerald-800/50">Open</span>;
  }
  return <span className="px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-400 text-xs font-medium border border-slate-700">Closed</span>;
}

function PoolCard({ pool, onClick }) {
  const currentMonth = pool.months.find((m) => m.isCurrent) || pool.months[pool.months.length - 1];
  const value = currentMonth
    ? (currentMonth.isCurrent ? currentMonth.currentValue : currentMonth.finalValue)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 text-left transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge pool={pool} />
            <span className="text-slate-500 text-xs">
              {pool.status === 'open' ? `Since ${pool.openedAt}` : `Closed ${pool.closedAt}`}
            </span>
          </div>
          <div className="text-slate-100 font-semibold text-base">{pool.name}</div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {value != null && <div className="text-slate-100 font-bold text-lg">{fmtUSD(value)}</div>}
          {currentMonth && (
            <div className="text-emerald-400 text-sm font-medium">
              {fmtPct(currentMonth.generatedPct)} ({fmtUSD(currentMonth.generatedUsd)})
            </div>
          )}
          <span className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1"><ChevronRight /></span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {pool.months.slice(-3).map((m) => (
          <div key={m.monthKey} className="bg-slate-800/60 rounded-lg px-2 py-1.5">
            <div className="text-slate-500 text-xs">{m.label.split(' ')[0]}</div>
            <div className="text-emerald-400 text-xs font-medium">{fmtPct(m.generatedPct)}</div>
          </div>
        ))}
      </div>
    </button>
  );
}

/* ─── Overview ─── */
function OverviewView({ wallet, onSelectPool }) {
  const totalUSD = wallet.assets.reduce((s, a) => s + a.valueUSD, 0);

  return (
    <div className="space-y-8">
      {/* Assets */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider">Assets</h2>
          <span className="text-slate-100 font-bold text-lg">{fmtUSD(totalUSD)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {wallet.assets.map((asset, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs mb-0.5 uppercase tracking-wider">{asset.name}</div>
                <div className="text-slate-100 font-bold text-lg">{fmtUSD(asset.valueUSD)}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500 text-xs mb-0.5">Quantity</div>
                <div className="text-slate-300 font-mono text-sm">{fmtQty(asset.quantity)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pools */}
      <section>
        <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-3">
          Liquidity Pools ({wallet.pools.length})
        </h2>
        {wallet.pools.length === 0 ? (
          <p className="text-slate-500 text-sm">No liquidity pools yet.</p>
        ) : (
          <div className="space-y-3">
            {wallet.pools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} onClick={() => onSelectPool(pool)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Main WalletDashboard ─── */
export default function WalletDashboard({ username, onLogout }) {
  const [wallet, setWallet]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [selectedPool, setSelectedPool] = useState(null);

  async function fetchWallet() {
    try {
      const { data } = await client.get('/wallet/me');
      setWallet(data);
    } catch {
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWallet(); }, []);

  function handlePoolNameSave(newName) {
    if (!wallet || !selectedPool) return;
    const updated = {
      ...wallet,
      pools: wallet.pools.map((p) => p.id === selectedPool.id ? { ...p, name: newName } : p),
    };
    setWallet(updated);
    setSelectedPool((prev) => ({ ...prev, name: newName }));
  }

  function handleSelectPool(pool) {
    const fresh = wallet.pools.find((p) => p.id === pool.id) || pool;
    setSelectedPool(fresh);
  }

  function handleLogout() {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    onLogout();
  }

  const shortUser = username.length > 16 ? username.slice(0, 6) + '…' + username.slice(-4) : username;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <div>
              <h1 className="text-slate-100 font-bold text-sm">Wallet Tracker</h1>
              <p className="text-slate-500 text-xs font-mono">{shortUser}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">Loading wallet data…</div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
        )}
        {wallet && !loading && (
          selectedPool ? (
            <PoolDetailView
              pool={selectedPool}
              onBack={() => setSelectedPool(null)}
              onPoolNameSave={handlePoolNameSave}
            />
          ) : (
            <OverviewView wallet={wallet} onSelectPool={handleSelectPool} />
          )
        )}
      </main>
    </div>
  );
}
