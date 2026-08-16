const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./services/db');

const SALT = 10;
const TODAY = '2026-08-16';

/* ─── Persistence layer ────────────────────
 * Pool-name edits are saved in two places:
 *   1. Postgres (via services/db.js) — when DATABASE_URL is set. Truly
 *      persistent across redeploys and spin-downs.
 *   2. backend/data/overrides.json — always. Works for local dev and as
 *      a fallback when the DB is not configured or temporarily down.
 *
 * On startup we merge both sources (DB takes precedence). On update we
 * write to both.
 */
const OVERRIDES_PATH = process.env.OVERRIDES_PATH ||
                        path.join(__dirname, 'data', 'overrides.json');

function loadOverrides() {
  try {
    if (fs.existsSync(OVERRIDES_PATH)) {
      return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('[store] Failed to load overrides:', err.message);
  }
  return {};
}

function saveOverrides(data) {
  try {
    const dir = path.dirname(OVERRIDES_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[store] Failed to save overrides:', err.message);
  }
}

const overrides = loadOverrides();

/* ─── Date helpers ─────────────────────────── */
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}
function daysBetween(start, end) {
  const s = new Date(start + 'T12:00:00Z');
  const e = new Date(end + 'T12:00:00Z');
  return Math.round((e - s) / 86400000) + 1;
}
const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function periodLabel(start, end) {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const a = `${M[sm-1]} ${sd}`;
  const b = `${M[em-1]} ${ed}`;
  if (sy === ey) return `${a} – ${b}, ${sy}`;
  return `${a}, ${sy} – ${b}, ${ey}`;
}
function currentLabel(start) {
  const [y, m, d] = start.split('-').map(Number);
  return `${M[m-1]} ${d}, ${y} – Present`;
}

/* ─── Deterministic daily generator ───────────
 * Distributes a target USD return across N days with occasional
 * negative days for realism. negativeBias = fraction of negative days.
 */
function makeDays(startDate, endDate, targetUsd, poolValue, pairs, negativeBias = 0.15) {
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const days = [];
  const target = targetUsd || 0;

  const negCount = Math.floor(totalDays * negativeBias);
  const posCount = Math.max(1, totalDays - negCount);
  const negAvgLoss = Math.abs(target / totalDays) * 0.4;
  const posAvgGain = (target + negCount * negAvgLoss) / posCount;

  for (let i = 0; i < totalDays; i++) {
    const dateStr = addDays(startDate, i);
    const factor  = 0.55 + ((i * 13 + 7) % 9) / 10;
    const isNeg   = negativeBias > 0 && negCount > 0 &&
                    i > 0 && (i % Math.max(2, Math.round(1 / negativeBias))) === 0;
    const dayUsd  = isNeg ? -negAvgLoss * factor : posAvgGain * factor;

    const dayPairs = pairs.map((pair, j) => {
      let share;
      if (pairs.length === 1)      share = 1;
      else if (pairs.length === 2) share = j === 0 ? 0.6 : 0.4;
      else                          share = [0.5, 0.3, 0.2][j] || 0;
      let pairUsd = Math.round(dayUsd * share);
      if (!isNeg && pairs.length > 1 && j === pairs.length - 1 && (i * 11 + 3) % 5 === 0) {
        pairUsd = -Math.abs(pairUsd);
      }
      const pct = poolValue > 0 ? parseFloat((pairUsd / poolValue * 100).toFixed(3)) : 0;
      return { pair, pct, usd: pairUsd };
    });
    days.push({ date: dateStr, pairs: dayPairs });
  }
  return days;
}

/* ─── Month/cycle builder ──────────────────── */
function buildMonth({
  startDate, endDate, label,
  initialValue, finalValue, currentValue,
  generatedPct, withdrawals = 0, isCurrent = false,
  pairs, negativeBias,
}) {
  const gen = isCurrent
    ? (currentValue - initialValue)
    : (finalValue   - initialValue);
  const pct = generatedPct != null
    ? generatedPct
    : parseFloat((gen / initialValue * 100).toFixed(2));
  const untilDate = isCurrent ? TODAY : endDate;
  return {
    monthKey: startDate,
    label,
    initialValue: round2(initialValue),
    finalValue:   isCurrent ? null : round2(finalValue),
    currentValue: isCurrent ? round2(currentValue) : null,
    generatedUsd: round2(gen),
    generatedPct: pct,
    withdrawals:  round2(withdrawals),
    isCurrent,
    days: makeDays(startDate, untilDate, gen, initialValue, pairs, negativeBias ?? 0.15),
  };
}
function round2(n) { return Math.round(n * 100) / 100; }

/* ─── Pool builder ─────────────────────────── */
function makePools() {
  const pools = [];

  /* Pool 1 — Aug 4 to Sep 3, 2025 (CLOSED) — all withdrawn */
  {
    const init = 20000, pct = 13.2;
    const final = init * (1 + pct/100);
    pools.push({
      id: 'pool-1', name: 'Liquidity Pool 1', status: 'closed',
      openedAt: '2025-08-04', closedAt: '2025-09-03',
      months: [buildMonth({
        startDate: '2025-08-04', endDate: '2025-09-03',
        label: 'Aug 4 – Sep 3, 2025',
        initialValue: init, finalValue: final,
        generatedPct: pct, withdrawals: final,
        pairs: ['SOL/USDC', 'WIF/USDC', 'JTO/USDC'], negativeBias: 0.15,
      })],
    });
  }

  /* Pool 2 — Sep 6 to Nov 5, 2025 (CLOSED) — 2 cycles, all withdrawn on close */
  {
    const i1 = 20000, p1 = 15.3, f1 = i1 * 1.153;
    const i2 = f1,    p2 = 19.7, f2 = i2 * 1.197;
    pools.push({
      id: 'pool-2', name: 'Liquidity Pool 2', status: 'closed',
      openedAt: '2025-09-06', closedAt: '2025-11-05',
      months: [
        buildMonth({
          startDate: '2025-09-06', endDate: '2025-10-05',
          label: 'Sep 6 – Oct 5, 2025',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          pairs: ['SOL/USDC', 'JUP/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2025-10-06', endDate: '2025-11-05',
          label: 'Oct 6 – Nov 5, 2025',
          initialValue: i2, finalValue: f2, generatedPct: p2,
          withdrawals: f2,
          pairs: ['ETH/USDC', 'PYTH/USDC'], negativeBias: 0.15,
        }),
      ],
    });
  }

  /* Pool 3 — Nov 7, 2025 to Feb 5, 2026 (CLOSED) */
  {
    const i1 = 20000, p1 = 22,   f1 = i1 * 1.22;
    const i2 = f1,    p2 = 18.5, f2 = i2 * 1.185;
    const w2 = f2 - 20000;
    const i3 = 20000, p3 = 25.8, f3 = i3 * 1.258;
    pools.push({
      id: 'pool-3', name: 'Liquidity Pool 3', status: 'closed',
      openedAt: '2025-11-07', closedAt: '2026-02-05',
      months: [
        buildMonth({
          startDate: '2025-11-07', endDate: '2025-12-06',
          label: 'Nov 7 – Dec 6, 2025',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          pairs: ['BTC/USDT', 'WBTC/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2025-12-07', endDate: '2026-01-06',
          label: 'Dec 7, 2025 – Jan 6, 2026',
          initialValue: i2, finalValue: f2, generatedPct: p2,
          withdrawals: w2,
          pairs: ['SOL/USDC', 'JitoSOL/SOL'], negativeBias: 0.20,
        }),
        buildMonth({
          startDate: '2026-01-07', endDate: '2026-02-05',
          label: 'Jan 7 – Feb 5, 2026',
          initialValue: i3, finalValue: f3, generatedPct: p3,
          withdrawals: f3,
          pairs: ['ETH/USDC', 'JTO/USDC'], negativeBias: 0.15,
        }),
      ],
    });
  }

  /* Pool 4 — Nov 7, 2025 to Feb 5, 2026 (CLOSED) — meme/DeFi rotation */
  {
    const i1 = 20000, p1 = 19.3, f1 = i1 * 1.193;
    const i2 = f1,    p2 = 16.2, f2 = i2 * 1.162;
    const w2 = f2 - 20000;
    const i3 = 20000, p3 = 23.1, f3 = i3 * 1.231;
    pools.push({
      id: 'pool-4', name: 'Liquidity Pool 4', status: 'closed',
      openedAt: '2025-11-07', closedAt: '2026-02-05',
      months: [
        buildMonth({
          startDate: '2025-11-07', endDate: '2025-12-06',
          label: 'Nov 7 – Dec 6, 2025',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          pairs: ['SOL/USDC', 'WIF/USDC', 'JUP/USDC'], negativeBias: 0.20,
        }),
        buildMonth({
          startDate: '2025-12-07', endDate: '2026-01-06',
          label: 'Dec 7, 2025 – Jan 6, 2026',
          initialValue: i2, finalValue: f2, generatedPct: p2,
          withdrawals: w2,
          pairs: ['RAY/USDC', 'PENGU/USDC', 'ORCA/USDC'], negativeBias: 0.25,
        }),
        buildMonth({
          startDate: '2026-01-07', endDate: '2026-02-05',
          label: 'Jan 7 – Feb 5, 2026',
          initialValue: i3, finalValue: f3, generatedPct: p3,
          withdrawals: f3,
          pairs: ['POPCAT/USDC', 'BONK/SOL', 'MEW/USDC'], negativeBias: 0.20,
        }),
      ],
    });
  }

  /* Pool 5 — Feb 19, 2026 to present (OPEN) — resets to 20K each cycle */
  {
    const cycles = [
      { start: '2026-02-19', end: '2026-03-20', pct: 29.1, negBias: 0.15, pairs: ['SOL/USDC', 'ETH/USDC'] },
      { start: '2026-03-21', end: '2026-04-19', pct: 31.2, negBias: 0.15, pairs: ['JUP/USDC', 'JTO/USDC'] },
      { start: '2026-04-20', end: '2026-05-19', pct: 28.7, negBias: 0.15, pairs: ['SOL/USDC', 'PYTH/USDC'] },
      { start: '2026-05-20', end: '2026-06-18', pct: 32.5, negBias: 0.15, pairs: ['ETH/USDC', 'WBTC/USDC'] },
      { start: '2026-06-19', end: '2026-07-18', pct: 23.8, negBias: 0.30, pairs: ['JitoSOL/SOL', 'mSOL/USDC'] },
      { start: '2026-07-19', end: null,          pct: 26.7, negBias: 0.20, pairs: ['SOL/USDC', 'JUP/USDC'], current: true },
    ];
    pools.push({
      id: 'pool-5', name: 'Liquidity Pool 5', status: 'open',
      openedAt: '2026-02-19', closedAt: null,
      months: cycles.map(c => {
        const init = 20000, gain = init * c.pct / 100, final = init + gain;
        return buildMonth({
          startDate: c.start, endDate: c.end,
          label: c.current ? currentLabel(c.start) : periodLabel(c.start, c.end),
          initialValue: init,
          finalValue: c.current ? null : final,
          currentValue: c.current ? final : null,
          generatedPct: c.pct,
          withdrawals: c.current ? 0 : gain,
          isCurrent: !!c.current,
          pairs: c.pairs, negativeBias: c.negBias,
        });
      }),
    });
  }

  /* Pools 6, 7, 8 — Feb 23, 2026 to present (OPEN) — 3 similar pools, ±1.5% variation */
  {
    const basePcts = [25, 28.4, 32.1, 30.4, 18, 20];
    const cycleDates = [
      { start: '2026-02-23', end: '2026-03-24' },
      { start: '2026-03-25', end: '2026-04-23' },
      { start: '2026-04-24', end: '2026-05-23' },
      { start: '2026-05-24', end: '2026-06-22' },
      { start: '2026-06-23', end: '2026-07-22' },
      { start: '2026-07-23', end: null },
    ];
    const variants = [
      // Pool 6 — BTC-heavy rotation
      { id: 'pool-6', name: 'Liquidity Pool 6', offset: -1.5, pairsByCycle: [
        ['BTC/USDT', 'WBTC/USDC'],
        ['BTC/USDT', 'ETH/USDC'],
        ['WBTC/USDC', 'JitoSOL/SOL'],
        ['BTC/USDT', 'ORCA/USDC'],
        ['WBTC/USDC', 'JUP/USDC'],
        ['BTC/USDT', 'PYTH/USDC'],
      ]},
      // Pool 7 — SOL-focused rotation
      { id: 'pool-7', name: 'Liquidity Pool 7', offset:  0,   pairsByCycle: [
        ['SOL/USDC', 'BTC/USDT'],
        ['SOL/USDC', 'JUP/USDC'],
        ['JitoSOL/SOL', 'WIF/USDC'],
        ['SOL/USDC', 'JTO/USDC'],
        ['mSOL/USDC', 'INF/USDC'],
        ['SOL/USDC', 'RAY/USDC'],
      ]},
      // Pool 8 — 3-pair mixed rotation (majors, DeFi, memes, LST)
      { id: 'pool-8', name: 'Liquidity Pool 8', offset: +0.6, pairsByCycle: [
        ['ETH/USDC', 'SOL/USDC', 'BTC/USDT'],
        ['JUP/USDC', 'JTO/USDC', 'PYTH/USDC'],
        ['WIF/USDC', 'POPCAT/USDC', 'BONK/SOL'],
        ['PENGU/USDC', 'MEW/USDC', 'RAY/USDC'],
        ['SOL/USDC', 'ETH/USDC', 'JitoSOL/SOL'],
        ['BTC/USDT', 'WBTC/USDC', 'ORCA/USDC'],
      ]},
    ];
    variants.forEach(v => {
      pools.push({
        id: v.id, name: v.name, status: 'open',
        openedAt: '2026-02-23', closedAt: null,
        months: cycleDates.map((cd, i) => {
          const pct = parseFloat((basePcts[i] + v.offset).toFixed(1));
          const init = 20000, gain = init * pct / 100, final = init + gain;
          const isCurrent = cd.end === null;
          return buildMonth({
            startDate: cd.start, endDate: cd.end,
            label: isCurrent ? currentLabel(cd.start) : periodLabel(cd.start, cd.end),
            initialValue: init,
            finalValue: isCurrent ? null : final,
            currentValue: isCurrent ? final : null,
            generatedPct: pct,
            withdrawals: isCurrent ? 0 : gain,
            isCurrent,
            pairs: v.pairsByCycle[i],
            negativeBias: pct < 25 ? 0.30 : 0.15,
          });
        }),
      });
    });
  }

  /* Pool 9 — Mar 5, 2026 to present (OPEN) */
  {
    const cycles = [
      { start: '2026-03-05', end: '2026-04-03', pct: 27.3, negBias: 0.15, pairs: ['BTC/USDT', 'ETH/USDC'] },
      { start: '2026-04-04', end: '2026-05-03', pct: 31,   negBias: 0.15, pairs: ['JUP/USDC', 'JTO/USDC'] },
      { start: '2026-05-04', end: '2026-06-02', pct: 27.8, negBias: 0.15, pairs: ['PYTH/USDC', 'RAY/USDC'] },
      { start: '2026-06-03', end: '2026-07-02', pct: 24.1, negBias: 0.30, pairs: ['WBTC/USDC', 'ORCA/USDC'] },
      { start: '2026-07-03', end: null,          pct: 14.3, negBias: 0.40, pairs: ['SOL/USDC', 'ETH/USDC'], current: true },
    ];
    pools.push({
      id: 'pool-9', name: 'Liquidity Pool 9', status: 'open',
      openedAt: '2026-03-05', closedAt: null,
      months: cycles.map(c => {
        const init = 20000, gain = init * c.pct / 100, final = init + gain;
        return buildMonth({
          startDate: c.start, endDate: c.end,
          label: c.current ? currentLabel(c.start) : periodLabel(c.start, c.end),
          initialValue: init,
          finalValue: c.current ? null : final,
          currentValue: c.current ? final : null,
          generatedPct: c.pct,
          withdrawals: c.current ? 0 : gain,
          isCurrent: !!c.current,
          pairs: c.pairs, negativeBias: c.negBias,
        });
      }),
    });
  }

  /* Pool 10 — Apr 6 to Jun 6, 2026 (CLOSED, funds moved to pools 12/13/14) */
  const p10_p2_final = round2(20000 * 1.289 - 1500) * 1.26; // 30,592.80
  {
    const i1 = 20000, p1 = 28.9, f1 = i1 * 1.289;    // 25,780
    const w1 = 1500;
    const i2 = f1 - w1, p2 = 26, f2 = i2 * 1.26;     // 30,592.80
    pools.push({
      id: 'pool-10', name: 'Liquidity Pool 10', status: 'closed',
      openedAt: '2026-04-06', closedAt: '2026-06-06',
      months: [
        buildMonth({
          startDate: '2026-04-06', endDate: '2026-05-05',
          label: 'Apr 6 – May 5, 2026',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          withdrawals: w1,
          pairs: ['SOL/USDC', 'JUP/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-05-06', endDate: '2026-06-05',
          label: 'May 6 – Jun 5, 2026',
          initialValue: i2, finalValue: f2, generatedPct: p2,
          withdrawals: f2,
          pairs: ['JTO/USDC', 'PYTH/USDC'], negativeBias: 0.15,
        }),
      ],
    });
  }

  /* Pool 11 — Apr 6 to Jun 6, 2026 (CLOSED, funds moved to pools 12/13/14) */
  const p11_p2_final = round2(20000 * 1.278 - 1500) * 1.263; // 30,387.78
  {
    const i1 = 20000, p1 = 27.8, f1 = i1 * 1.278;     // 25,560
    const w1 = 1500;
    const i2 = f1 - w1, p2 = 26.3, f2 = i2 * 1.263;   // 30,387.78
    pools.push({
      id: 'pool-11', name: 'Liquidity Pool 11', status: 'closed',
      openedAt: '2026-04-06', closedAt: '2026-06-06',
      months: [
        buildMonth({
          startDate: '2026-04-06', endDate: '2026-05-05',
          label: 'Apr 6 – May 5, 2026',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          withdrawals: w1,
          pairs: ['BTC/USDT', 'WBTC/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-05-06', endDate: '2026-06-05',
          label: 'May 6 – Jun 5, 2026',
          initialValue: i2, finalValue: f2, generatedPct: p2,
          withdrawals: f2,
          pairs: ['SOL/USDC', 'JitoSOL/SOL'], negativeBias: 0.15,
        }),
      ],
    });
  }

  /* Pools 12, 13, 14 — Jun 6, 2026, opened from split of Pool 10 + Pool 11 remainders */
  /* Pool 10 remainder after $1.5K = 29,092.80, Pool 11 remainder = 28,887.78, total 57,980.58 */
  /* Split 3 ways: 19,326.86 each */
  const splitAmount = round2((round2(20000 * 1.289 - 1500) * 1.26 - 1500 +
                              round2(20000 * 1.278 - 1500) * 1.263 - 1500) / 3);

  /* Pool 12 — continues after split, reset to $20K, still open */
  {
    const i1 = splitAmount, p1 = 14, f1 = i1 * 1.14;
    const w1 = f1 - 20000;
    const i2 = 20000, p2 = 16.5, cv2 = i2 * 1.165;
    pools.push({
      id: 'pool-12', name: 'Liquidity Pool 12', status: 'open',
      openedAt: '2026-06-06', closedAt: null,
      months: [
        buildMonth({
          startDate: '2026-06-06', endDate: '2026-07-05',
          label: 'Jun 6 – Jul 5, 2026',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          withdrawals: w1,
          pairs: ['SOL/USDC', 'ETH/USDC'], negativeBias: 0.35,
        }),
        buildMonth({
          startDate: '2026-07-06', endDate: null,
          label: currentLabel('2026-07-06'),
          initialValue: i2, currentValue: cv2, generatedPct: p2,
          isCurrent: true,
          pairs: ['JUP/USDC', 'PYTH/USDC'], negativeBias: 0.25,
        }),
      ],
    });
  }

  /* Pool 13 — from split, closed after Jun-Jul cycle */
  {
    const init = splitAmount, pct = 18.3, final = init * 1.183;
    pools.push({
      id: 'pool-13', name: 'Liquidity Pool 13', status: 'closed',
      openedAt: '2026-06-06', closedAt: '2026-07-06',
      months: [buildMonth({
        startDate: '2026-06-06', endDate: '2026-07-05',
        label: 'Jun 6 – Jul 5, 2026',
        initialValue: init, finalValue: final, generatedPct: pct,
        withdrawals: final,
        pairs: ['ETH/USDC', 'BTC/USDT'], negativeBias: 0.30,
      })],
    });
  }

  /* Pool 14 — continues after split, reset to $20K, still open */
  {
    const i1 = splitAmount, p1 = 23.2, f1 = i1 * 1.232;
    const w1 = f1 - 20000;
    const i2 = 20000, p2 = 19.4, cv2 = i2 * 1.194;
    pools.push({
      id: 'pool-14', name: 'Liquidity Pool 14', status: 'open',
      openedAt: '2026-06-06', closedAt: null,
      months: [
        buildMonth({
          startDate: '2026-06-06', endDate: '2026-07-05',
          label: 'Jun 6 – Jul 5, 2026',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          withdrawals: w1,
          pairs: ['SOL/USDC', 'JTO/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-07-06', endDate: null,
          label: currentLabel('2026-07-06'),
          initialValue: i2, currentValue: cv2, generatedPct: p2,
          isCurrent: true,
          pairs: ['BTC/USDT', 'WIF/USDC'], negativeBias: 0.25,
        }),
      ],
    });
  }

  /* Pool 15 — May 4, 2026 to present (OPEN) — pairs with Pool 16 and spawned Pool 17 */
  {
    // May-Jun: +28%, withdraw $1.5K
    const i1 = 20000, p1 = 28, f1 = round2(i1 * 1.28);              // 25,600
    const w1 = 1500;
    const i2 = round2(f1 - w1);                                     // 24,100
    // Jun-Jul: +23.5%, withdraw $1.5K + excess above $20K → Pool 17
    const p2 = 23.5, f2 = round2(i2 * 1.235);                       // 29,763.5
    const excessTo17_p15 = round2(f2 - 1500 - 20000);               //  8,263.5
    const w2 = round2(1500 + excessTo17_p15);                       //  9,763.5
    // Jul-Aug: +25%, withdraw all profits
    const i3 = 20000, p3 = 25, f3 = round2(i3 * 1.25);              // 25,000
    const w3 = round2(f3 - 20000);                                  //  5,000
    // Aug-current: partial cycle so far
    const i4 = 20000, p4 = 10.5, cv4 = round2(i4 * 1.105);          // 22,100

    pools.push({
      id: 'pool-15', name: 'Liquidity Pool 15', status: 'open',
      openedAt: '2026-05-04', closedAt: null,
      months: [
        buildMonth({
          startDate: '2026-05-04', endDate: '2026-06-03',
          label: 'May 4 – Jun 3, 2026',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          withdrawals: w1,
          pairs: ['SOL/USDC', 'JitoSOL/SOL'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-06-04', endDate: '2026-07-03',
          label: 'Jun 4 – Jul 3, 2026',
          initialValue: i2, finalValue: f2, generatedPct: p2,
          withdrawals: w2,
          pairs: ['JUP/USDC', 'SOL/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-07-04', endDate: '2026-08-03',
          label: 'Jul 4 – Aug 3, 2026',
          initialValue: i3, finalValue: f3, generatedPct: p3,
          withdrawals: w3,
          pairs: ['PYTH/USDC', 'JTO/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-08-04', endDate: null,
          label: currentLabel('2026-08-04'),
          initialValue: i4, currentValue: cv4, generatedPct: p4,
          isCurrent: true,
          pairs: ['SOL/USDC', 'ETH/USDC'], negativeBias: 0.30,
        }),
      ],
    });
  }

  /* Pool 16 — May 4, 2026 to present (OPEN) — pairs with Pool 15 and spawned Pool 17 */
  {
    const i1 = 20000, p1 = 28.2, f1 = round2(i1 * 1.282);           // 25,640
    const w1 = 1500;
    const i2 = round2(f1 - w1);                                     // 24,140
    const p2 = 23.7, f2 = round2(i2 * 1.237);                       // 29,861.18
    const excessTo17_p16 = round2(f2 - 1500 - 20000);               //  8,361.18
    const w2 = round2(1500 + excessTo17_p16);                       //  9,861.18
    const i3 = 20000, p3 = 24.3, f3 = round2(i3 * 1.243);           // 24,860
    const w3 = round2(f3 - 20000);                                  //  4,860
    const i4 = 20000, p4 = 9.8, cv4 = round2(i4 * 1.098);           // 21,960

    pools.push({
      id: 'pool-16', name: 'Liquidity Pool 16', status: 'open',
      openedAt: '2026-05-04', closedAt: null,
      months: [
        buildMonth({
          startDate: '2026-05-04', endDate: '2026-06-03',
          label: 'May 4 – Jun 3, 2026',
          initialValue: i1, finalValue: f1, generatedPct: p1,
          withdrawals: w1,
          pairs: ['BTC/USDT', 'WBTC/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-06-04', endDate: '2026-07-03',
          label: 'Jun 4 – Jul 3, 2026',
          initialValue: i2, finalValue: f2, generatedPct: p2,
          withdrawals: w2,
          pairs: ['ETH/USDC', 'BTC/USDT'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-07-04', endDate: '2026-08-03',
          label: 'Jul 4 – Aug 3, 2026',
          initialValue: i3, finalValue: f3, generatedPct: p3,
          withdrawals: w3,
          pairs: ['WBTC/USDC', 'PYTH/USDC'], negativeBias: 0.15,
        }),
        buildMonth({
          startDate: '2026-08-04', endDate: null,
          label: currentLabel('2026-08-04'),
          initialValue: i4, currentValue: cv4, generatedPct: p4,
          isCurrent: true,
          pairs: ['BTC/USDT', 'JUP/USDC'], negativeBias: 0.30,
        }),
      ],
    });
  }

  /* Pool 17 — Jul 4 to Aug 3, 2026 (CLOSED) — spawned from Pool 15/16 excess */
  {
    // Excess from each pool's Jun-Jul cycle above $20K after $1.5K withdrawal:
    const excessP15 = round2(round2(20000 * 1.28 - 1500) * 1.235 - 1500 - 20000);  // 8,263.5
    const excessP16 = round2(round2(20000 * 1.282 - 1500) * 1.237 - 1500 - 20000); // 8,361.18
    const init = round2(excessP15 + excessP16);                                     // 16,624.68
    const pct = 22;
    const final = round2(init * (1 + pct / 100));                                   // 20,282.11

    pools.push({
      id: 'pool-17', name: 'Liquidity Pool 17', status: 'closed',
      openedAt: '2026-07-04', closedAt: '2026-08-03',
      months: [buildMonth({
        startDate: '2026-07-04', endDate: '2026-08-03',
        label: 'Jul 4 – Aug 3, 2026',
        initialValue: init, finalValue: final, generatedPct: pct,
        withdrawals: final,
        pairs: ['WIF/USDC', 'POPCAT/USDC', 'BONK/SOL'], negativeBias: 0.15,
      })],
    });
  }

  return pools;
}

/* ─── Store ─────────────────────────── */
const WALLET_ADDR = '5VXPSSnSxa2bP9HPdHXt9pCXVyfwXwRN8HRE2pyoN88M';

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
      id: 'wallet-solana-1',
      username: WALLET_ADDR,
      passwordHash: bcrypt.hashSync('Cartoon12?', SALT),
      isAdmin: false,
      isPreloaded: true,
      createdAt: '2025-08-01T00:00:00.000Z',
    },
  ],
  wallets: {
    // Assets are fetched live from Solana RPC when the username is a
    // valid Solana address; the array here is just a placeholder.
    [WALLET_ADDR]: {
      assets: [],
      pools:  makePools(),
    },
  },
};

function applyOverridesToPools(source) {
  for (const [username, walletOv] of Object.entries(source)) {
    const wallet = store.wallets[username];
    if (!wallet) continue;
    for (const [poolId, data] of Object.entries(walletOv)) {
      const pool = wallet.pools.find(p => p.id === poolId);
      if (pool && data.name) pool.name = data.name;
    }
  }
}

/* Apply file-based overrides synchronously at startup */
applyOverridesToPools(overrides);

/* If a Postgres DB is configured, load overrides from there too and
 * merge them on top (DB wins over file). This is async so any request
 * received in the first ~1s uses only the file-based overrides. */
if (db.enabled) {
  (async () => {
    await db.init();
    const dbOv = await db.loadAllOverrides();
    for (const [username, walletOv] of Object.entries(dbOv)) {
      if (!overrides[username]) overrides[username] = {};
      Object.assign(overrides[username], walletOv);
    }
    applyOverridesToPools(dbOv);
  })().catch(err => console.error('[store] DB startup sync failed:', err.message));
}

store.addUser = function (username, password) {
  const user = {
    id: uuidv4(),
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
  return store.users.find(u => u.username === username) || null;
};

store.removeUser = function (id) {
  const idx = store.users.findIndex(u => u.id === id);
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
  const w = store.wallets[username];
  if (!w) return false;
  const pool = w.pools.find(p => p.id === poolId);
  if (!pool) return false;
  pool.name = name;

  if (!overrides[username]) overrides[username] = {};
  if (!overrides[username][poolId]) overrides[username][poolId] = {};
  overrides[username][poolId].name = name;
  saveOverrides(overrides);

  // Fire-and-forget DB persistence — don't block the response on it
  if (db.enabled) {
    db.saveOverride(username, poolId, name).catch(err =>
      console.error('[store] DB save failed:', err.message)
    );
  }

  return true;
};

module.exports = store;
