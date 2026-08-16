import { useState, useEffect } from 'react';
import client from '../api/client';

function AnalyzingWallet({ username, activatesAt, onBack }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const target    = new Date(activatesAt).getTime();
  const remaining = Math.max(0, target - now);
  const ready     = remaining === 0;

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  const pad = (n) => String(n).padStart(2, '0');

  const shortUser = username.length > 20
    ? username.slice(0, 6) + '…' + username.slice(-4)
    : username;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
      <div className="flex items-center justify-center mb-4">
        {ready ? (
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        )}
      </div>

      <div className={`text-lg font-semibold mb-1 ${ready ? 'text-emerald-400' : 'text-amber-400'}`}>
        {ready ? 'Wallet Ready' : 'Analyzing Wallet'}
      </div>
      <p className="text-slate-400 text-xs mb-4 font-mono">{shortUser}</p>

      {ready ? (
        <>
          <p className="text-slate-300 text-sm mb-4">
            Your wallet has been analyzed and is ready to sign in.
          </p>
          <button
            onClick={onBack}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            Sign In
          </button>
        </>
      ) : (
        <>
          <p className="text-slate-300 text-sm mb-4">
            We&apos;re scanning on-chain activity for this wallet. Access is granted after a 48-hour verification window.
          </p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <TimeBlock value={pad(h)} unit="hrs" />
            <span className="text-amber-300/50 text-2xl font-light">:</span>
            <TimeBlock value={pad(m)} unit="min" />
            <span className="text-amber-300/50 text-2xl font-light">:</span>
            <TimeBlock value={pad(s)} unit="sec" />
          </div>
          <p className="text-slate-500 text-xs mt-3">remaining until activation</p>
          <button
            onClick={onBack}
            className="mt-5 text-slate-400 hover:text-slate-200 text-xs underline"
          >
            Back to login
          </button>
        </>
      )}
    </div>
  );
}

function TimeBlock({ value, unit }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-slate-900 border border-amber-500/20 rounded-lg px-3 py-2 min-w-[3rem]">
        <div className="text-amber-300 text-2xl font-bold tabular-nums leading-none">{value}</div>
      </div>
      <div className="text-slate-500 text-[10px] uppercase tracking-wider mt-1">{unit}</div>
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [pending, setPending]   = useState(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPending(null);
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', { username, password });
      if (data.status === 'pending') {
        setPending({ activatesAt: data.activatesAt, username: data.username });
      } else {
        localStorage.setItem('wt_token', data.token);
        localStorage.setItem('wt_user', JSON.stringify({ username: data.username, isAdmin: data.isAdmin }));
        onLogin({ username: data.username, isAdmin: data.isAdmin });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Wallet Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {pending ? (
          <AnalyzingWallet
            username={pending.username}
            activatesAt={pending.activatesAt}
            onBack={() => setPending(null)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                Username / Wallet Address
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or wallet address"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
