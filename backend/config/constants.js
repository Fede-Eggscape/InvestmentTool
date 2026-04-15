const TARGET_COINS = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'PAXG', 'DOGE', 'TON', 'ADA', 'AVAX'];

// Binance trading pairs (vs USDT)
const TARGET_SYMBOLS = TARGET_COINS.map(c => `${c}USDT`);

const BINANCE_BASE = 'https://api.binance.com';
const BINANCE_EARN_BASE = 'https://www.binance.com';
const METEORA_DLMM_BASE = 'https://dlmm-api.meteora.ag';
const METEORA_POOLS_BASE = 'https://app.meteora.ag';

const CACHE_TTL = {
  PRICES: 30_000,
  DUAL: 60_000,
  TRENDS: 60_000,
  METEORA: 120_000,
};

const KLINES_INTERVAL = '4h';
const KLINES_LIMIT = 42;

// Rate limiter: max concurrent requests to external APIs
const MAX_CONCURRENT_REQUESTS = 3;

module.exports = {
  TARGET_COINS,
  TARGET_SYMBOLS,
  BINANCE_BASE,
  BINANCE_EARN_BASE,
  METEORA_DLMM_BASE,
  METEORA_POOLS_BASE,
  CACHE_TTL,
  KLINES_INTERVAL,
  KLINES_LIMIT,
  MAX_CONCURRENT_REQUESTS,
};
