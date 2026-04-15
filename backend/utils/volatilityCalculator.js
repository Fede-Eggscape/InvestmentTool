/**
 * Volatility calculator — uses Binance klines (4h candles) to estimate
 * annualized historical volatility and log-normal exercise probability.
 */

// Normal CDF (Abramowitz & Stegun approximation, error < 7.5e-8)
function normalCDF(z) {
  if (z >  8) return 1;
  if (z < -8) return 0;
  const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  let poly = 0;
  for (let i = b.length - 1; i >= 0; i--) poly = poly * t + b[i];
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly * t;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * Annualized historical volatility from 4h klines.
 * klines: Binance format [[openTime, open, high, low, close, ...], ...]
 * Returns decimal (e.g. 0.82 = 82% annual vol), or null if insufficient data.
 */
function calculateVolatility(klines) {
  if (!klines || klines.length < 5) return null;
  const closes = klines.map(k => parseFloat(k[4])).filter(c => c > 0);
  if (closes.length < 5) return null;

  const logReturns = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  if (logReturns.length < 4) return null;

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (logReturns.length - 1);
  const candleVol = Math.sqrt(variance);

  // 4h candles → 6 per day → annualize: candleVol × √(6 × 365)
  return parseFloat((candleVol * Math.sqrt(6 * 365)).toFixed(4));
}

/**
 * Probability that price reaches strike at expiry (log-normal, zero-drift model).
 * direction 'BUY'  → P(S_T ≤ strike)  (price drops to strike)
 * direction 'SELL' → P(S_T ≥ strike)  (price rises to strike)
 * Returns percentage 0-100, or null.
 */
function exerciseProbability(currentPrice, strikePrice, daysToExpiry, annualVol, direction) {
  if (!currentPrice || !strikePrice || !daysToExpiry || !annualVol || annualVol <= 0) return null;
  const T  = daysToExpiry / 365;
  const σ  = annualVol;
  const d2 = (Math.log(currentPrice / strikePrice) - 0.5 * σ * σ * T) / (σ * Math.sqrt(T));

  const prob = direction === 'BUY'
    ? normalCDF(-d2)   // P(S_T ≤ K)
    : normalCDF(d2);   // P(S_T ≥ K)

  return parseFloat((prob * 100).toFixed(1));
}

/**
 * Compute 7-day (approx) price range from klines.
 * With 4h candles, 42 candles ≈ 7 days. Returns { high, low, pricePosition }.
 * pricePosition: 0=at low, 100=at high.
 */
function priceRange(klines, currentPrice) {
  if (!klines || klines.length < 2 || !currentPrice) return null;
  const highs = klines.map(k => parseFloat(k[2]));
  const lows  = klines.map(k => parseFloat(k[3]));
  const high  = Math.max(...highs);
  const low   = Math.min(...lows);
  const pricePosition = high > low
    ? parseFloat(((currentPrice - low) / (high - low) * 100).toFixed(1))
    : 50;
  return {
    high: parseFloat(high.toFixed(8)),
    low:  parseFloat(low.toFixed(8)),
    pricePosition,
  };
}

module.exports = { normalCDF, calculateVolatility, exerciseProbability, priceRange };
