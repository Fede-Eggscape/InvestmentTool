const crypto  = require('crypto');
const axios   = require('axios');
const cache   = require('./cacheService');
const priceService  = require('./binancePriceService');
const trendAnalyzer = require('../utils/trendAnalyzer');
const signalEngine  = require('../utils/signalEngine');
const { BINANCE_BASE, TARGET_COINS, CACHE_TTL } = require('../config/constants');
const { calculateVolatility, exerciseProbability, priceRange } = require('../utils/volatilityCalculator');

const API_KEY    = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;

// Public headers that bypass WAF (discovered via browser tracing)
const WEB_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Origin': 'https://www.binance.com',
  'Referer': 'https://www.binance.com/dual-investment',
  'clienttype': 'web',
  'lang': 'en',
};

const webClient = axios.create({
  baseURL: 'https://www.binance.com',
  timeout: 12000,
  headers: WEB_HEADERS,
});

// ─── 1. Public web API (no auth needed) ──────────────────────────────────────
// Endpoint discovered via network tracing: /bapi/earn/v5/friendly/pos/dc/project/list
// Returns real DCI products with strikePrice, apr (decimal), duration, type
async function fetchPublicDCI(coin, projectType) {
  // DOWN: invest USDT → buy coin if price drops  → investmentAsset=USDT, targetAsset=coin
  // UP:   invest coin → sell coin if price rises → investmentAsset=coin, targetAsset=USDT
  const investmentAsset = projectType === 'DOWN' ? 'USDT' : coin;
  const targetAsset     = projectType === 'DOWN' ? coin   : 'USDT';
  try {
    const { data } = await webClient.get('/bapi/earn/v5/friendly/pos/dc/project/list', {
      params: {
        investmentAsset,
        targetAsset,
        projectType,
        sortType:  'APY_DESC',
        pageIndex: 1,
        pageSize:  10,
      },
    });

    const list = data?.data?.list || [];
    // Pick the best product: highest APR with duration ≤ 7 days
    // (short-duration products are more actionable and have better yields)
    const shortTerm = list.filter(p => parseInt(p.duration) <= 7);
    const best = shortTerm.length > 0 ? shortTerm[0] : list[0];
    if (!best) return null;

    const direction = projectType === 'DOWN' ? 'BUY' : 'SELL';
    // apr field is in decimal form: 0.6818 = 68.18%
    const apy = parseFloat(best.apr) * 100;

    return {
      coin,
      direction,
      apy,
      strikePrice:   parseFloat(best.strikePrice),
      daysToExpiry:  parseInt(best.duration),
      isMock: false,
    };
  } catch (err) {
    console.warn(`[DualService] Public API ${coin} ${projectType}:`, err.message);
    return null;
  }
}

async function fetchAllPublicDCI() {
  const tasks = [];
  for (const coin of TARGET_COINS) {
    tasks.push(fetchPublicDCI(coin, 'DOWN'));  // BUY
    tasks.push(fetchPublicDCI(coin, 'UP'));    // SELL
  }
  // Run in batches of 4 to avoid rate limiting
  const results = [];
  for (let i = 0; i < tasks.length; i += 4) {
    const batch = await Promise.all(tasks.slice(i, i + 4));
    results.push(...batch);
  }
  return results.filter(Boolean);
}

// ─── 2. Official signed API (if API key is configured) ───────────────────────
async function fetchFromBinanceOfficial() {
  if (!API_KEY || !API_SECRET) return null;

  const results = [];
  for (const optionType of ['DOWN', 'UP']) {
    const params = new URLSearchParams({
      optionType,
      pageIndex: '1',
      pageSize:  '100',
      timestamp: String(Date.now()),
    });
    params.append(
      'signature',
      crypto.createHmac('sha256', API_SECRET).update(params.toString()).digest('hex')
    );
    try {
      const { data } = await axios.get(
        `${BINANCE_BASE}/sapi/v1/dci/product/list?${params.toString()}`,
        { headers: { 'X-MBX-APIKEY': API_KEY }, timeout: 10000 }
      );
      const list = data?.data?.list || data?.data || [];
      results.push(...list.map(raw => normalizeOfficial(raw, optionType)));
    } catch (err) {
      console.warn(`[DualService] Official API ${optionType}:`, err.response?.data?.msg || err.message);
    }
  }
  return results.length > 0 ? results : null;
}

function normalizeOfficial(raw, optionType) {
  const direction   = optionType === 'DOWN' ? 'BUY' : 'SELL';
  const coin        = (raw.investCoin || raw.asset || raw.underlyingAsset || '')
    .replace(/USDT$/i, '').toUpperCase();
  const strikePrice = parseFloat(raw.strikePrice || raw.targetPrice || 0);
  let rawRate = parseFloat(raw.highYieldRate || raw.highInterestRate || raw.apr || 0);
  const apy   = rawRate < 2 ? rawRate * 100 : rawRate;
  const daysToExpiry = parseInt(raw.duration || raw.term || raw.settleDay || 3, 10);
  return { coin, direction, apy, strikePrice, daysToExpiry, isMock: false };
}

// ─── 3. Mock fallback ─────────────────────────────────────────────────────────
// Approximate prices used when all external APIs are unreachable
const STATIC_PRICES = {
  BTC: 85000, ETH: 1600, BNB: 600, XRP: 2.0,
  SOL: 130, PAXG: 3200, DOGE: 0.18, TON: 3.5,
  ADA: 0.7, AVAX: 20,
};

function buildMockProducts(prices) {
  const mocks = [];
  for (const coin of TARGET_COINS) {
    // Use real price if available, fall back to static approximation
    const entry = prices[coin] || (STATIC_PRICES[coin] ? { price: STATIC_PRICES[coin] } : null);
    if (!entry) continue;
    const price = entry.price;
    mocks.push({ coin, direction: 'BUY',  apy: 35 + Math.random() * 30,
      strikePrice: parseFloat((price * 0.97).toFixed(4)),
      daysToExpiry: [1, 3, 7][Math.floor(Math.random() * 3)], isMock: true });
    mocks.push({ coin, direction: 'SELL', apy: 30 + Math.random() * 25,
      strikePrice: parseFloat((price * 1.03).toFixed(4)),
      daysToExpiry: [1, 3, 7][Math.floor(Math.random() * 3)], isMock: true });
  }
  return mocks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function getDualProducts() {
  const cacheKey = 'binance:dual';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [prices, trends] = await Promise.all([
    priceService.getPrices(),
    priceService.getAllTrends(),
  ]);

  // Pre-compute volatility + price range per coin from klines
  const volMap = {};
  const rangeMap = {};
  for (const [coin, klines] of Object.entries(trends)) {
    if (klines) {
      volMap[coin]   = calculateVolatility(klines);
      rangeMap[coin] = priceRange(klines, prices[coin]?.price);
    }
  }

  let products;
  let source;

  // Priority: official API → public web API → mock
  const official = await fetchFromBinanceOfficial();
  if (official && official.length > 0) {
    products = official.filter(p => TARGET_COINS.includes(p.coin) && p.apy > 0);
    source = 'official';
    console.log(`[DualService] Using official API (${products.length} products)`);
  } else {
    const publicData = await fetchAllPublicDCI();
    if (publicData && publicData.length > 0) {
      products = publicData.filter(p => p.apy > 0);
      source = 'public';
      console.log(`[DualService] Using public web API (${products.length} real products)`);
    } else {
      products = buildMockProducts(prices);
      source = 'mock';
      console.warn('[DualService] Using mock data');
    }
  }

  const SIGNAL_ORDER = { STRONG_BUY: 0, BUY: 1, NEUTRAL: 2, CAUTION: 3 };

  const enriched = products.map(product => {
    const price        = prices[product.coin];
    const klines       = trends[product.coin];
    const currentPrice = price ? price.price : 0;
    const trendData    = klines
      ? trendAnalyzer.analyze(klines, currentPrice)
      : { trend: 'UNKNOWN', momentum: 'UNKNOWN' };
    const analysis    = signalEngine.generateSignal(product, trendData, currentPrice);
    const dailyYield  = product.apy / 365 / 100;

    const vol      = volMap[product.coin] || null;
    const range    = rangeMap[product.coin] || null;
    const exProb   = vol
      ? exerciseProbability(currentPrice, product.strikePrice, product.daysToExpiry, vol, product.direction)
      : null;
    const yieldFactor = 1 + (product.apy / 100) * (product.daysToExpiry / 365);
    const effectivePrice = product.direction === 'BUY'
      ? parseFloat((product.strikePrice / yieldFactor).toFixed(4))
      : parseFloat((product.strikePrice * yieldFactor).toFixed(4));

    return {
      ...product,
      apy:           parseFloat(product.apy.toFixed(2)),
      currentPrice,
      change24h:     price ? price.change24h : 0,
      dailyYield:    parseFloat((dailyYield * 100).toFixed(4)),
      trend:         trendData.trend,
      momentum:      trendData.momentum,
      ...analysis,
      volatility:    vol,
      exerciseProb:  exProb,
      effectivePrice,
      weekRange:     range,
    };
  });

  enriched.sort((a, b) => {
    const sDiff = (SIGNAL_ORDER[a.signal] ?? 4) - (SIGNAL_ORDER[b.signal] ?? 4);
    return sDiff !== 0 ? sDiff : b.apy - a.apy;
  });

  const result = {
    products:  enriched,
    updatedAt: Date.now(),
    source,
    usedMock:  source === 'mock',
  };
  cache.set(cacheKey, result, CACHE_TTL.DUAL);
  return result;
}

module.exports = { getDualProducts };
