const axios = require('axios');
const cache = require('./cacheService');
const { TARGET_COINS, CACHE_TTL } = require('../config/constants');
const meteoraAnalyzer = require('../utils/meteoraAnalyzer');

const DATAPI_BASE = 'https://dlmm.datapi.meteora.ag';

// Priority coins shown first (most known)
const HIGH_PRIORITY_COINS = ['ETH', 'SOL', 'BTC'];

const COIN_VARIANTS = {
  BTC:  ['BTC', 'WBTC', 'CBBTC', 'TBTC'],
  ETH:  ['ETH', 'WETH', 'CBETH', 'STETH'],
  BNB:  ['BNB', 'WBNB'],
  SOL:  ['SOL', 'WSOL'],
  XRP:  ['XRP'],
  PAXG: ['PAXG'],
  DOGE: ['DOGE'],
  TON:  ['TON'],
  ADA:  ['ADA'],
  AVAX: ['AVAX', 'WAVAX'],
};

const ALL_VARIANTS = Object.values(COIN_VARIANTS).flat();

function containsTargetCoin(name) {
  if (!name) return false;
  const parts = name.toUpperCase().split(/[-/_ ]/);
  return parts.some(part => ALL_VARIANTS.includes(part));
}

function getMainCoin(pairName) {
  if (!pairName) return null;
  const parts = pairName.toUpperCase().split(/[-/_ ]/);
  for (const [coin, variants] of Object.entries(COIN_VARIANTS)) {
    if (parts.some(p => variants.includes(p))) return coin;
  }
  return null;
}

const MIN_TVL = 10_000;
const MAX_APY = 50_000;

// Known sets for token verification heuristic (used inside normalizePool)
const BLUE_CHIPS_SET = new Set([
  'BTC','WBTC','CBBTC','TBTC','ETH','WETH','CBETH','STETH',
  'SOL','WSOL','BNB','WBNB','XRP','AVAX','WAVAX',
]);
const STABLECOINS_SET = new Set([
  'USDC','USDT','DAI','BUSD','FRAX','TUSD','USDH','FDUSD','PYUSD',
  'USD1','EURC','ISC','UXD','USDY','SUSD','LUSD','CRVUSD','GUSD',
]);

function normalizePool(pool) {
  let rawApy = parseFloat(pool.apy || 0);
  const apr  = parseFloat(pool.apr || 0);
  if (!isFinite(rawApy) || rawApy > MAX_APY) rawApy = apr;
  const apy    = Math.min(rawApy, MAX_APY);
  const vol24h = parseFloat(pool.volume?.['24h'] || pool.volume_24h || 0);
  const fees24h= parseFloat(pool.fees?.['24h']   || pool.fees_24h   || 0);
  const tvl    = parseFloat(pool.tvl || 0);

  // Extended fields for analysis
  const vol30m  = parseFloat(pool.volume?.['30m']  || 0);
  const vol4h   = parseFloat(pool.volume?.['4h']   || 0);
  const vol12h  = parseFloat(pool.volume?.['12h']  || 0);
  const fees4h  = parseFloat(pool.fees?.['4h']     || 0);
  const fees12h = parseFloat(pool.fees?.['12h']    || 0);

  // Pool age from created_at timestamp
  const createdAt = pool.created_at || pool.createdAt;
  const poolAgeDays = createdAt
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
    : 0;

  // Cumulative volume/fees — check multiple field names
  const cumulativeVolume = parseFloat(
    pool.cumulative_trade_volume || pool.cumulativeVolume || pool.total_volume || 0
  );
  const cumulativeFees = parseFloat(
    pool.cumulative_fee_volume || pool.cumulativeFees || pool.total_fees || 0
  );

  // Token data — normalize to common shape with safe defaults
  const buildToken = (t, fallbackSymbol) => {
    if (!t) return { symbol: fallbackSymbol || '?', price: 0, holders: 0, isVerified: false, freezeAuthorityDisabled: false };
    return {
      symbol:                  t.symbol || t.mint?.slice(0, 4) || fallbackSymbol || '?',
      price:                   parseFloat(t.price || t.usdPrice || 0),
      marketCap:               parseFloat(t.market_cap || t.marketCap || 0),
      holders:                 parseInt(t.holders || t.holder_count || 0),
      isVerified:              !!(t.verified || t.is_verified || t.is_community_verified || BLUE_CHIPS_SET.has((t.symbol || '').toUpperCase()) || STABLECOINS_SET.has((t.symbol || '').toUpperCase())),
      freezeAuthorityDisabled: !!(t.freeze_authority_disabled || t.freeze_disabled || !t.freeze_authority),
    };
  };

  // Infer token symbols from pair name if API doesn't provide token objects
  const pairParts = (pool.name || '').split(/[-/ ]/);
  const symbolX = pairParts[0] || 'X';
  const symbolY = pairParts[1] || 'Y';

  const tokenX = buildToken(pool.token_x || pool.tokenX, symbolX);
  const tokenY = buildToken(pool.token_y || pool.tokenY, symbolY);

  // Infer current price from token prices or ratio
  const currentPrice = tokenX.price > 0 && tokenY.price > 0
    ? parseFloat((tokenY.price / tokenX.price).toFixed(8))
    : 0;

  const normalized = {
    id:               pool.address,
    pair:             pool.name || '?',
    mainCoin:         getMainCoin(pool.name),
    type:             'DLMM',
    apy:              parseFloat(apy.toFixed(2)),
    apr:              parseFloat(apr.toFixed(2)),
    tvl:              parseFloat(tvl.toFixed(2)),
    vol24h:           parseFloat(vol24h.toFixed(2)),
    fees24h:          parseFloat(fees24h.toFixed(2)),
    dailyYield:       parseFloat((apy / 365).toFixed(4)),
    binStep:          pool.pool_config?.bin_step || 0,
    baseFee:          parseFloat((pool.pool_config?.base_fee_pct || 0).toFixed(4)),
    dynamicFee:       parseFloat(pool.dynamic_fee || pool.dynamicFee || 0),
    // Extended
    currentPrice,
    poolAgeDays,
    isBlacklisted:    !!(pool.is_blacklisted || pool.blacklisted),
    hasFarm:          !!(pool.farm_apr || pool.has_farm || pool.hasFarm),
    farmApr:          parseFloat(pool.farm_apr || 0),
    cumulativeVolume,
    cumulativeFees,
    vol30m:           parseFloat(vol30m.toFixed(2)),
    vol4h:            parseFloat(vol4h.toFixed(2)),
    vol12h:           parseFloat(vol12h.toFixed(2)),
    fees4h:           parseFloat(fees4h.toFixed(2)),
    fees12h:          parseFloat(fees12h.toFixed(2)),
    tokenX,
    tokenY,
  };

  // Attach analysis
  try {
    normalized.analysis = meteoraAnalyzer.analyze(normalized);
  } catch (err) {
    console.warn(`[MeteoraService] Analysis failed for ${normalized.pair}:`, err.message);
    normalized.analysis = null;
  }

  return normalized;
}

// Fetch pages keeping the API's native TVL-descending order
async function fetchPools(pages = 5) {
  const allPools = [];
  const client = axios.create({ baseURL: DATAPI_BASE, timeout: 15000 });

  for (let page = 1; page <= pages; page++) {
    try {
      const { data } = await client.get('/pools', {
        params: { page, page_size: 100 },
      });
      const list = data?.data || [];
      if (!list.length) break;

      const filtered = list.filter(
        p => containsTargetCoin(p.name) && parseFloat(p.tvl || 0) >= MIN_TVL
      );
      allPools.push(...filtered.map(normalizePool));
    } catch (err) {
      console.warn(`[MeteoraService] Page ${page} fetch failed:`, err.message);
      break;
    }
  }

  return allPools;
}

async function getCombinedPools() {
  const cacheKey = 'meteora:combined';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Fetch keeping native TVL order (highest TVL first = Meteora's page order)
  const pools = await fetchPools(5);

  // Deduplicate by pair name: keep highest TVL entry (matches Meteora's page prominence)
  const seen = new Map();
  for (const pool of pools) {
    const key = pool.pair;
    if (!seen.has(key) || pool.tvl > seen.get(key).tvl) {
      seen.set(key, pool);
    }
  }
  const deduped = Array.from(seen.values());

  // Sort:
  // 1st group — ETH, SOL, BTC pools (most known), sorted by TVL desc
  // 2nd group — rest of target coins, sorted by TVL desc (matches Meteora page order)
  const isHighPriority = p => HIGH_PRIORITY_COINS.includes(p.mainCoin);

  const priority = deduped.filter(isHighPriority).sort((a, b) => b.tvl - a.tvl);
  const rest     = deduped.filter(p => !isHighPriority(p)).sort((a, b) => b.tvl - a.tvl);

  // Top 20 from rest (matching Meteora's page order for the remaining coins)
  const sorted = [...priority, ...rest.slice(0, 20)];

  // TVL trend: compare with previous snapshot
  const TVL_SNAP_KEY = 'meteora:tvl_snapshot';
  const prevSnap = cache.get(TVL_SNAP_KEY) || {};
  const newSnap  = {};
  for (const pool of sorted) {
    const prev = prevSnap[pool.id];
    pool.tvlChange = prev > 0
      ? parseFloat(((pool.tvl - prev) / prev * 100).toFixed(2))
      : 0;
    newSnap[pool.id] = pool.tvl;
  }
  // Store snapshot for longer than the main cache so we can compare across refreshes
  cache.set(TVL_SNAP_KEY, newSnap, CACHE_TTL.METEORA * 20);

  const result = {
    pools:        sorted,
    dlmmCount:    sorted.length,
    dynamicCount: 0,
    updatedAt:    Date.now(),
  };

  cache.set(cacheKey, result, CACHE_TTL.METEORA);
  return result;
}

module.exports = { getCombinedPools };
