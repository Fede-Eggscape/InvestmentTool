const axios = require('axios');
const cache = require('./cacheService');
const { BINANCE_BASE, TARGET_SYMBOLS, TARGET_COINS, KLINES_INTERVAL, KLINES_LIMIT, CACHE_TTL } = require('../config/constants');
const { runLimited } = require('../utils/rateLimiter');

const client = axios.create({
  baseURL: BINANCE_BASE,
  timeout: 10000,
});

// CoinGecko IDs mapped to our coin symbols (free API, no geo-restrictions)
const COINGECKO_IDS = {
  BTC:  'bitcoin',
  ETH:  'ethereum',
  BNB:  'binancecoin',
  XRP:  'ripple',
  SOL:  'solana',
  PAXG: 'pax-gold',
  DOGE: 'dogecoin',
  TON:  'the-open-network',
  ADA:  'cardano',
  AVAX: 'avalanche-2',
};

async function getPricesFromCoinGecko() {
  const ids = Object.values(COINGECKO_IDS).join(',');
  const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: { ids, vs_currencies: 'usd', include_24hr_change: 'true' },
    timeout: 10000,
  });
  const prices = {};
  for (const [coin, cgId] of Object.entries(COINGECKO_IDS)) {
    if (data[cgId]) {
      prices[coin] = {
        price:    data[cgId].usd,
        change24h: parseFloat((data[cgId].usd_24h_change || 0).toFixed(2)),
        high24h:  0,
        low24h:   0,
        volume24h: 0,
      };
    }
  }
  return prices;
}

async function getPrices() {
  const cacheKey = 'binance:prices';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Try Binance first (best data), fall back to CoinGecko if geo-blocked
  try {
    const symbolsParam = JSON.stringify(TARGET_SYMBOLS);
    const { data } = await client.get(`/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`);

    const prices = {};
    for (const ticker of data) {
      const coin = ticker.symbol.replace('USDT', '');
      if (TARGET_COINS.includes(coin)) {
        prices[coin] = {
          price:    parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          high24h:  parseFloat(ticker.highPrice),
          low24h:   parseFloat(ticker.lowPrice),
          volume24h: parseFloat(ticker.quoteVolume),
        };
      }
    }
    cache.set(cacheKey, prices, CACHE_TTL.PRICES);
    return prices;
  } catch (err) {
    console.warn('[PriceService] Binance blocked (', err.response?.status || err.message, '), using CoinGecko...');
    try {
      const prices = await getPricesFromCoinGecko();
      console.log(`[PriceService] CoinGecko OK (${Object.keys(prices).length} coins)`);
      cache.set(cacheKey, prices, CACHE_TTL.PRICES);
      return prices;
    } catch (cgErr) {
      console.error('[PriceService] CoinGecko also failed:', cgErr.message);
      return {};
    }
  }
}

async function getKlines(symbol) {
  const cacheKey = `binance:klines:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await client.get('/api/v3/klines', {
    params: {
      symbol: `${symbol}USDT`,
      interval: KLINES_INTERVAL,
      limit: KLINES_LIMIT,
    },
  });

  cache.set(cacheKey, data, CACHE_TTL.TRENDS);
  return data;
}

async function getAllTrends() {
  const cacheKey = 'binance:trends';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const factories = TARGET_COINS.map(coin => async () => {
    try {
      const klines = await getKlines(coin);
      return { coin, klines };
    } catch {
      return { coin, klines: null };
    }
  });

  const results = await runLimited(factories);

  const trends = {};
  for (const { coin, klines } of results) {
    trends[coin] = klines;
  }

  cache.set(cacheKey, trends, CACHE_TTL.TRENDS);
  return trends;
}

module.exports = { getPrices, getKlines, getAllTrends };
