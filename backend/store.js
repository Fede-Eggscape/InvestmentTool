const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const SALT = 10;

function makeDays(year, month, totalReturnUsd, poolSize, pairs) {
  const numDays = new Date(year, month, 0).getDate();
  const days = [];
  const base = totalReturnUsd / numDays;
  for (let d = 1; d <= numDays; d++) {
    const factor = 0.5 + ((d * 17 + 3) % 15) / 10;
    const dayTotal = base * factor;
    const dayPairs = pairs.map((p, i) => {
      const share = i === 0 ? 0.62 : 0.38;
      const usd = Math.round(dayTotal * share);
      return { pair: p, pct: parseFloat((usd / poolSize * 100).toFixed(3)), usd };
    });
    days.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      pairs: dayPairs,
    });
  }
  return days;
}

function makeDaysUntil(year, month, lastDay, totalReturnUsd, poolSize, pairs) {
  const days = [];
  const base = totalReturnUsd / lastDay;
  for (let d = 1; d <= lastDay; d++) {
    const factor = 0.5 + ((d * 17 + 3) % 15) / 10;
    const dayTotal = base * factor;
    const dayPairs = pairs.map((p, i) => {
      const share = i === 0 ? 0.62 : 0.38;
      const usd = Math.round(dayTotal * share);
      return { pair: p, pct: parseFloat((usd / poolSize * 100).toFixed(3)), usd };
    });
    days.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      pairs: dayPairs,
    });
  }
  return days;
}

const p1 = ['SOL/USDC', 'WBTC/USDC'];
const p2 = ['ETH/USDC', 'SOL/USDC'];

const store = {
  users: [
    {
      id: 'admin',
      username: 'admin',
      passwordHash: bcrypt.hashSync('cartoon12?', SALT),
      isAdmin: true,
      isPreloaded: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'test1',
      username: 'test1',
      passwordHash: bcrypt.hashSync('asasdd', SALT),
      isAdmin: false,
      isPreloaded: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],

  wallets: {
    test1: {
      assets: [
        { name: 'SOL',  quantity: 200,  valueUSD: 37000 },
        { name: 'USDC', quantity: 12500, valueUSD: 12500 },
        { name: 'WBTC', quantity: 0.12, valueUSD: 8160  },
      ],
      pools: [
        {
          id: 'pool-1',
          name: 'Liquidity Pool 1',
          status: 'open',
          openedAt: '2026-01-01',
          closedAt: null,
          months: [
            { monthKey: '2026-01', label: 'January 2026',  initialValue: 30000, finalValue: 31800, currentValue: null, generatedUsd: 1800, generatedPct: 6.00, withdrawals: 0,    isCurrent: false, days: makeDays(2026, 1, 1800, 30000, p1) },
            { monthKey: '2026-02', label: 'February 2026', initialValue: 31800, finalValue: 33700, currentValue: null, generatedUsd: 1900, generatedPct: 5.97, withdrawals: 2000, isCurrent: false, days: makeDays(2026, 2, 1900, 31800, p1) },
            { monthKey: '2026-03', label: 'March 2026',    initialValue: 31700, finalValue: 33800, currentValue: null, generatedUsd: 2100, generatedPct: 6.62, withdrawals: 0,    isCurrent: false, days: makeDays(2026, 3, 2100, 31700, p1) },
            { monthKey: '2026-04', label: 'April 2026',    initialValue: 33800, finalValue: 36100, currentValue: null, generatedUsd: 2300, generatedPct: 6.80, withdrawals: 0,    isCurrent: false, days: makeDays(2026, 4, 2300, 33800, p1) },
            { monthKey: '2026-05', label: 'May 2026',      initialValue: 36100, finalValue: 38500, currentValue: null, generatedUsd: 2400, generatedPct: 6.65, withdrawals: 0,    isCurrent: false, days: makeDays(2026, 5, 2400, 36100, p1) },
            { monthKey: '2026-06', label: 'June 2026',     initialValue: 38500, finalValue: 40800, currentValue: null, generatedUsd: 2300, generatedPct: 5.97, withdrawals: 1500, isCurrent: false, days: makeDays(2026, 6, 2300, 38500, p1) },
            { monthKey: '2026-07', label: 'July 2026',     initialValue: 39300, finalValue: 40000, currentValue: null, generatedUsd: 700,  generatedPct: 1.78, withdrawals: 0,    isCurrent: false, days: makeDays(2026, 7, 700,  39300, p1) },
            { monthKey: '2026-08', label: 'August 2026',   initialValue: 40000, finalValue: null,  currentValue: 44000, generatedUsd: 4000, generatedPct: 10.00, withdrawals: 0,  isCurrent: true,  days: makeDaysUntil(2026, 8, 16, 4000, 40000, p1) },
          ],
        },
        {
          id: 'pool-2',
          name: 'Liquidity Pool 2',
          status: 'closed',
          openedAt: '2026-04-01',
          closedAt: '2026-07-31',
          months: [
            { monthKey: '2026-04', label: 'April 2026', initialValue: 15000, finalValue: 15900, currentValue: null, generatedUsd: 900, generatedPct: 6.00, withdrawals: 0,   isCurrent: false, days: makeDays(2026, 4, 900, 15000, p2) },
            { monthKey: '2026-05', label: 'May 2026',   initialValue: 15900, finalValue: 16700, currentValue: null, generatedUsd: 800, generatedPct: 5.03, withdrawals: 500, isCurrent: false, days: makeDays(2026, 5, 800, 15900, p2) },
            { monthKey: '2026-06', label: 'June 2026',  initialValue: 16200, finalValue: 17100, currentValue: null, generatedUsd: 900, generatedPct: 5.56, withdrawals: 0,   isCurrent: false, days: makeDays(2026, 6, 900, 16200, p2) },
            { monthKey: '2026-07', label: 'July 2026',  initialValue: 17100, finalValue: 18000, currentValue: null, generatedUsd: 900, generatedPct: 5.26, withdrawals: 0,   isCurrent: false, days: makeDays(2026, 7, 900, 17100, p2) },
          ],
        },
      ],
    },
  },
};

store.addUser = function (username, password) {
  const id = uuidv4();
  const user = {
    id,
    username,
    passwordHash: bcrypt.hashSync(password, SALT),
    isAdmin: false,
    isPreloaded: false,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  store.wallets[username] = { assets: [], pools: [] };
  return user;
};

store.findUser = function (username) {
  return store.users.find((u) => u.username === username) || null;
};

store.removeUser = function (id) {
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  const user = store.users[idx];
  store.users.splice(idx, 1);
  delete store.wallets[user.username];
  return true;
};

store.getWallet = function (username) {
  return store.wallets[username] || null;
};

store.updatePoolName = function (username, poolId, name) {
  const wallet = store.wallets[username];
  if (!wallet) return false;
  const pool = wallet.pools.find((p) => p.id === poolId);
  if (!pool) return false;
  pool.name = name;
  return true;
};

module.exports = store;
