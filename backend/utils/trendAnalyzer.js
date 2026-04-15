// Calculates trend indicators from Binance kline data
// Kline format: [openTime, open, high, low, close, volume, ...]

function calcEMA(values, period) {
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcSMA(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function analyze(klines, currentPrice) {
  if (!klines || klines.length < 10) {
    return { trend: 'UNKNOWN', momentum: 'UNKNOWN', priceVsSma: 'UNKNOWN' };
  }

  const closes = klines.map(k => parseFloat(k[4]));

  // EMA fast (7 periods ~28h) vs slow (14 periods ~56h)
  const emaFast = calcEMA(closes, 7);
  const emaSlow = calcEMA(closes, 14);
  const trend = emaFast > emaSlow ? 'UP' : 'DOWN';

  // Rate of Change over last 5 candles
  const rocPeriod = Math.min(5, closes.length - 1);
  const roc = ((closes[closes.length - 1] - closes[closes.length - 1 - rocPeriod]) /
    closes[closes.length - 1 - rocPeriod]) * 100;

  let momentum;
  if (roc > 2) momentum = 'STRONG_UP';
  else if (roc > 0.3) momentum = 'UP';
  else if (roc > -2) momentum = 'DOWN';
  else momentum = 'STRONG_DOWN';

  // Price vs SMA20
  const sma20 = calcSMA(closes);
  const price = currentPrice || closes[closes.length - 1];
  const priceVsSma = price > sma20 ? 'ABOVE' : 'BELOW';

  // 24h change (last vs 6 candles ago = ~24h for 4h candles)
  const change24h = closes.length >= 7
    ? ((closes[closes.length - 1] - closes[closes.length - 7]) / closes[closes.length - 7]) * 100
    : 0;

  return { trend, momentum, priceVsSma, roc, change24h, emaFast, emaSlow, sma20 };
}

module.exports = { analyze };
