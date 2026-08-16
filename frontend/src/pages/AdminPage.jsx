import { useState, useEffect } from 'react';
import client from '../api/client';

function StatusBadge({ user }) {
  if (user.isAdmin)      return <span className="px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 text-xs font-medium">Admin</span>;
  if (user.isPreloaded)  return <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 text-xs font-medium">Active (Pre-loaded)</span>;
  if (user.pending)      return <span className="px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 text-xs font-medium">Pending {user.hoursLeft}h {user.minutesLeft}m</span>;
  return <span className="px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-300 text-xs font-medium">Active</span>;
}

export default function AdminPage({ onLogout }) {
  const [users, setUsers]         = useState([]);
  const [newUser, setNewUser]     = useState('');
  const [newPass, setNewPass]     = useState('');
  const [addError, setAddError]   = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const [fetchErr, setFetchErr]   = useState('');

  async function fetchUsers() {
    try {
      const { data } = await client.get('/admin/users');
      setUsers(data);
      setFetchErr('');
    } catch {
      setFetchErr('Failed to load users');
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      await client.post('/admin/users', { username: newUser.trim(), password: newPass });
      setNewUser('');
      setNewPass('');
      fetchUsers();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await client.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    onLogout();
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-slate-100 font-bold">Admin Panel</h1>
              <p className="text-slate-500 text-xs">Wallet Tracker</p>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Add user */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-100 font-semibold mb-4">Add New Wallet</h2>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-amber-300/80 text-sm mb-5">
            New wallets registered here will require a <span className="font-semibold text-amber-300">48-hour activation period</span> before they can access their data.
          </div>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Username / Wallet address"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              required
            />
            <input
              type="text"
              placeholder="Password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              required
            />
            <button
              type="submit"
              disabled={addLoading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2 text-sm transition-colors whitespace-nowrap"
            >
              {addLoading ? 'Adding…' : 'Add Wallet'}
            </button>
          </form>
          {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
        </section>

        {/* User list */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-slate-100 font-semibold">Registered Wallets ({users.length})</h2>
          </div>
          {fetchErr && <p className="text-red-400 text-sm px-6 py-4">{fetchErr}</p>}
          <div className="divide-y divide-slate-800">
            {users.map((u) => (
              <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-slate-100 font-mono text-sm truncate">{u.username}</div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    Added {new Date(u.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge user={u} />
                  {!u.isAdmin && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={deleting === u.id}
                      className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Delete wallet"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
