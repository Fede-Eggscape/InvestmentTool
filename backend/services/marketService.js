const priceService = require('./binancePriceService');
const dualService  = require('./binanceDualService');
const meteoraService = require('./meteoraService');
const { calculateVolatility } = require('../utils/volatilityCalculator');
const cache = require('./cacheService');

async function getMarketSummary() {
  const cacheKey = 'market:summary';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [prices, trends, dualData, meteoraData] = await Promise.all([
    priceService.getPrices(),
    priceService.getAllTrends(),
    dualService.getDualProducts(),
    meteoraService.getCombinedPools(),
  ]);

  // Coin stats
  const coins = Object.entries(prices);
  const bullish  = coins.filter(([, p]) => p.change24h >= 1).length;
  const bearish  = coins.filter(([, p]) => p.change24h <= -1).length;
  const neutral  = coins.length - bullish - bearish;
  const avgChange = coins.length
    ? parseFloat((coins.reduce((s, [, p]) => s + p.change24h, 0) / coins.length).toFixed(2))
    : 0;

  // Average volatility
  const vols = Object.entries(trends)
    .map(([, k]) => calculateVolatility(k))
    .filter(v => v != null);
  const avgVol = vols.length
    ? parseFloat((vols.reduce((a, b) => a + b, 0) / vols.length * 100).toFixed(1))
    : null;

  // Market sentiment
  let sentiment, sentimentColor;
  if (avgChange >= 2 && bullish > bearish) {
    sentiment = 'FAVORABLE'; sentimentColor = 'emerald';
  } else if (avgChange <= -2 && bearish > bullish) {
    sentiment = 'BAJISTA'; sentimentColor = 'red';
  } else if (avgVol && avgVol > 100) {
    sentiment = 'VOLÁTIL'; sentimentColor = 'orange';
  } else {
    sentiment = 'NEUTRO'; sentimentColor = 'slate';
  }

  // Best DCI opportunity
  const dualProducts = dualData?.products || [];
  const bestDual = dualProducts
    .filter(p => p.signal === 'STRONG_BUY' || p.signal === 'BUY')
    .sort((a, b) => b.apy - a.apy)[0] || dualProducts.sort((a, b) => b.apy - a.apy)[0] || null;

  // Best pool opportunity
  const pools = meteoraData?.pools || [];
  const bestPool = pools
    .filter(p => p.analysis?.verdict === 'EXCELENTE' || p.analysis?.verdict === 'BUENA')
    .sort((a, b) => (b.analysis?.netReturnEstimate?.moderate ?? 0) - (a.analysis?.netReturnEstimate?.moderate ?? 0))[0]
    || pools.sort((a, b) => b.apy - a.apy)[0] || null;

  const summary = {
    sentiment,
    sentimentColor,
    bullish,
    bearish,
    neutral,
    avgChange,
    avgVol,
    totalCoins: coins.length,
    bestDual: bestDual ? {
      coin:      bestDual.coin,
      direction: bestDual.direction,
      apy:       bestDual.apy,
      signal:    bestDual.signal,
    } : null,
    bestPool: bestPool ? {
      pair:       bestPool.pair,
      apy:        bestPool.apy,
      verdict:    bestPool.analysis?.verdict,
      netReturn:  bestPool.analysis?.netReturnEstimate?.moderate,
    } : null,
    updatedAt: Date.now(),
  };

  cache.set(cacheKey, summary, 60_000);
  return summary;
}

// For capital allocator: returns ranked opportunities across both products
async function getAllocations(capital) {
  const [dualData, meteoraData] = await Promise.all([
    dualService.getDualProducts(),
    meteoraService.getCombinedPools(),
  ]);

  const SIGNAL_SCORE = { STRONG_BUY: 4, BUY: 3, NEUTRAL: 2, CAUTION: 1 };
  const VERDICT_SCORE = { EXCELENTE: 4, BUENA: 3, ACEPTABLE: 2, PRECAUCIÓN: 1, EVITAR: 0 };

  // Score DCI products
  const dualOps = (dualData?.products || [])
    .filter(p => p.signal !== 'CAUTION')
    .map(p => ({
      type:        'DCI',
      name:        `${p.coin} ${p.direction === 'BUY' ? '↓ Compra' : '↑ Venta'}`,
      details:     `Strike ${p.strikePrice} · ${p.daysToExpiry}d · ${p.signal}`,
      apy:         p.apy,
      signal:      p.signal,
      exerciseProb: p.exerciseProb,
      score:       (SIGNAL_SCORE[p.signal] || 0) * 25 + Math.min(p.apy / 2, 25),
      color:       'blue',
      risk:        p.direction === 'BUY' ? 'Recibís la moneda si baja al strike' : 'Vendés la moneda si sube al strike',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Score pool products
  const poolOps = (meteoraData?.pools || [])
    .filter(p => p.analysis && p.analysis.verdict !== 'EVITAR' && p.analysis.isViable)
    .map(p => ({
      type:    'POOL',
      name:    p.pair,
      details: `${p.analysis.verdict} · ${p.analysis.reliabilityScore}/100 confianza`,
      apy:     p.apy,
      verdict: p.analysis.verdict,
      netReturn: p.analysis.netReturnEstimate.moderate,
      score:   (VERDICT_SCORE[p.analysis.verdict] || 0) * 20 + Math.min(p.analysis.reliabilityScore / 2, 20) + Math.min(p.analysis.netReturnEstimate.moderate / 5, 20),
      color:   'violet',
      risk:    `IL moderada est. ${p.analysis.ilEstimate.moderate}%/año`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Combine and allocate
  const all = [...dualOps, ...poolOps].sort((a, b) => b.score - a.score).slice(0, 5);
  const totalScore = all.reduce((s, o) => s + o.score, 0);

  const allocations = all.map(op => {
    const pct    = totalScore > 0 ? parseFloat((op.score / totalScore * 100).toFixed(1)) : 20;
    const amount = parseFloat((capital * pct / 100).toFixed(2));
    return { ...op, pct, amount };
  });

  // Keep 10% as reserve
  const reservePct    = 10;
  const reserveAmount = parseFloat((capital * reservePct / 100).toFixed(2));

  return { allocations, reservePct, reserveAmount, capital };
}

module.exports = { getMarketSummary, getAllocations };
