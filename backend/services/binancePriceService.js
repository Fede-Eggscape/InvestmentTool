const axios = require('axios');
const cache = require('./cacheService');
const { BINANCE_BASE, TARGET_SYMBOLS, TARGET_COINS, KLINES_INTERVAL, KLINES_LIMIT, CACHE_TTL } = require('../config/constants');
const { runLimited } = require('../utils/rateLimiter');

const client = axios.create({
  baseURL: BINANCE_BASE,
  timeout: 10000,
});

async function getPrices() {
  const cacheKey = 'binance:prices';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const symbolsParam = JSON.stringify(TARGET_SYMBOLS);
  const { data } = await client.get(`/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`);

  const prices = {};
  for (const ticker of data) {
    const coin = ticker.symbol.replace('USDT', '');
    if (TARGET_COINS.includes(coin)) {
      prices[coin] = {
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.priceChangePercent),
        high24h: parseFloat(ticker.highPrice),
        low24h: parseFloat(ticker.lowPrice),
        volume24h: parseFloat(ticker.quoteVolume),
      };
    }
  }

  cache.set(cacheKey, prices, CACHE_TTL.PRICES);
  return prices;
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
