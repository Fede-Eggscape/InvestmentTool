/**
 * Fetches real on-chain token balances for a Solana wallet.
 * Uses public Solana RPC + Jupiter price API. No API keys required.
 * Set SOLANA_RPC_URL env var to override the RPC endpoint.
 */

const RPC_URL       = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const JUP_PRICE_API = 'https://lite-api.jup.ag/price/v3';
const SPL_PROGRAM   = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const T22_PROGRAM   = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const SOL_MINT      = 'So11111111111111111111111111111111111111112';

const CACHE_TTL_MS  = 60_000;
const FETCH_TIMEOUT = 8000;

/* Known Solana token metadata (mint → symbol) */
const TOKEN_META = {
  [SOL_MINT]:                                    { symbol: 'SOL' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN':  { symbol: 'JUP' },
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL':  { symbol: 'JTO' },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH' },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY' },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE':  { symbol: 'ORCA' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF' },
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': { symbol: 'POPCAT' },
  'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5':  { symbol: 'MEW' },
  '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv': { symbol: 'PENGU' },
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': { symbol: 'JitoSOL' },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So':  { symbol: 'mSOL' },
  '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm': { symbol: 'INF' },
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': { symbol: 'WBTC' },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'ETH' },
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': { symbol: 'POPCAT' },
};

const cache = new Map(); // address → { assets, at }

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function rpc(method, params) {
  const data = await fetchJson(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (data.error) throw new Error(`RPC ${method}: ${data.error.message}`);
  return data.result;
}

async function getPrices(mints) {
  if (!mints.length) return {};
  // Jupiter Lite API v3 accepts up to ~100 ids per request; batch if needed
  const url = `${JUP_PRICE_API}?ids=${encodeURIComponent(mints.join(','))}`;
  try {
    const j = await fetchJson(url);
    // Response: { "<mint>": { "usdPrice": 123.45, ... }, ... }
    return j || {};
  } catch (err) {
    console.error('[solanaAssets] price fetch failed:', err.message);
    return {};
  }
}

async function fetchAssets(address) {
  const cached = cache.get(address);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.assets;
  }

  const [solRes, splRes, t22Res] = await Promise.all([
    rpc('getBalance', [address]),
    rpc('getTokenAccountsByOwner', [address, { programId: SPL_PROGRAM }, { encoding: 'jsonParsed' }])
      .catch(() => ({ value: [] })),
    rpc('getTokenAccountsByOwner', [address, { programId: T22_PROGRAM }, { encoding: 'jsonParsed' }])
      .catch(() => ({ value: [] })),
  ]);

  const solAmount = (solRes?.value || 0) / 1e9;

  const tokens = [...(splRes?.value || []), ...(t22Res?.value || [])]
    .map(t => {
      const info = t.account?.data?.parsed?.info;
      return info ? {
        mint:   info.mint,
        amount: parseFloat(info.tokenAmount?.uiAmountString || '0'),
      } : null;
    })
    .filter(t => t && t.amount > 0);

  const allMints = [SOL_MINT, ...tokens.map(t => t.mint)];
  const prices   = await getPrices(allMints);

  const assets = [];

  if (solAmount > 0) {
    const p = parseFloat(prices[SOL_MINT]?.usdPrice || '0');
    assets.push({ name: 'SOL', quantity: solAmount, valueUSD: solAmount * p });
  }

  for (const t of tokens) {
    const p = parseFloat(prices[t.mint]?.usdPrice || '0');
    const valueUSD = t.amount * p;
    if (valueUSD < 0.5) continue; // filter dust
    const meta = TOKEN_META[t.mint];
    const name = meta?.symbol || (t.mint.slice(0, 4) + '…' + t.mint.slice(-3));
    assets.push({ name, quantity: t.amount, valueUSD });
  }

  assets.sort((a, b) => b.valueUSD - a.valueUSD);
  cache.set(address, { assets, at: Date.now() });
  return assets;
}

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
function isSolanaAddress(s) {
  return typeof s === 'string' && SOLANA_ADDR_RE.test(s);
}

module.exports = { fetchAssets, isSolanaAddress };
