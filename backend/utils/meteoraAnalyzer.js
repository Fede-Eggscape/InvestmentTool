const { normalCDF } = require('./volatilityCalculator');

/**
 * Meteora DLMM Pool Analysis Engine
 * Produces a full structured analysis for each pool covering:
 *   - Reliability score
 *   - Profitability projections
 *   - Impermanent loss estimates
 *   - Capital requirements
 *   - Range recommendations
 *   - Risk/safety assessment
 */

const STABLECOINS = new Set([
  'USDC','USDT','DAI','BUSD','FRAX','TUSD','USDH','FDUSD','PYUSD',
  'USD1','EURC','ISC','UXD','USDY','SUSD','LUSD','CRVUSD','GUSD',
]);
const BLUE_CHIPS = new Set([
  'BTC','WBTC','CBBTC','TBTC','ETH','WETH','CBETH','STETH',
  'SOL','WSOL','BNB','WBNB','XRP','AVAX','WAVAX',
]);

// Annual impermanent loss estimates (%) by pair category
// [optimistic, moderate, conservative]
const IL_BY_CATEGORY = {
  STABLE_STABLE:     [0.1,  1,    3  ],
  STABLE_BLUECHIP:   [5,    15,   35 ],
  BLUECHIP_BLUECHIP: [10,   25,   55 ],
  STABLE_ALT:        [15,   40,   80 ],
  BLUECHIP_ALT:      [20,   50,   100],
  ALT_ALT:           [30,   70,   150],
};

function getPairCategory(tokenX, tokenY) {
  const x = (tokenX?.symbol || '').toUpperCase();
  const y = (tokenY?.symbol || '').toUpperCase();
  const xs = STABLECOINS.has(x), ys = STABLECOINS.has(y);
  const xb = BLUE_CHIPS.has(x),  yb = BLUE_CHIPS.has(y);
  if (xs && ys) return 'STABLE_STABLE';
  if ((xs && yb) || (xb && ys)) return 'STABLE_BLUECHIP';
  if (xb && yb) return 'BLUECHIP_BLUECHIP';
  if (xs || ys) return 'STABLE_ALT';
  if (xb || yb) return 'BLUECHIP_ALT';
  return 'ALT_ALT';
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function scoreTVL(tvl) {
  if (tvl >= 10_000_000) return 100;
  if (tvl >= 5_000_000)  return 92;
  if (tvl >= 1_000_000)  return 82;
  if (tvl >= 500_000)    return 70;
  if (tvl >= 100_000)    return 55;
  if (tvl >= 50_000)     return 40;
  if (tvl >= 10_000)     return 25;
  return 10;
}

function scoreActivity(vol24h, tvl) {
  if (!tvl) return 0;
  const r = vol24h / tvl;
  if (r >= 5)    return 100;
  if (r >= 2)    return 90;
  if (r >= 1)    return 80;
  if (r >= 0.5)  return 68;
  if (r >= 0.2)  return 55;
  if (r >= 0.1)  return 42;
  if (r >= 0.05) return 28;
  if (r >= 0.01) return 15;
  return 5;
}

function scoreTokenSafety(token) {
  if (!token) return 50;
  let s = 50;
  if (token.isVerified)               s += 20;
  if (token.freezeAuthorityDisabled)  s += 20;
  if (token.holders >= 100_000)       s += 10;
  else if (token.holders >= 10_000)   s += 5;
  else if (token.holders < 1_000)     s -= 15;
  return Math.min(100, Math.max(0, s));
}

function scorePoolMaturity(poolAgeDays, cumulativeVolume) {
  let s = 0;
  // Age
  if (poolAgeDays >= 365) s += 40;
  else if (poolAgeDays >= 180) s += 32;
  else if (poolAgeDays >= 90)  s += 24;
  else if (poolAgeDays >= 30)  s += 16;
  else if (poolAgeDays >= 7)   s += 8;
  // Cumulative volume
  if (cumulativeVolume >= 1_000_000_000) s += 60;
  else if (cumulativeVolume >= 100_000_000) s += 50;
  else if (cumulativeVolume >= 10_000_000)  s += 38;
  else if (cumulativeVolume >= 1_000_000)   s += 25;
  else if (cumulativeVolume >= 100_000)     s += 12;
  else s += 4;
  return Math.min(100, s);
}

// Detects if activity is trending up or down by comparing time windows
function detectVolumeTrend(vol30m, vol4h, vol12h, vol24h) {
  // Project 30m → 24h pace
  const pace30m = vol30m * 48;
  // Project 12h → 24h pace
  const pace12h = vol12h * 2;
  const ratio = pace30m / Math.max(vol24h, 1);
  const ratio12 = pace12h / Math.max(vol24h, 1);

  if (ratio > 1.4 && ratio12 > 1.1) return 'ACELERANDO';
  if (ratio > 1.1) return 'ESTABLE_ARRIBA';
  if (ratio < 0.6) return 'DESACELERANDO';
  if (ratio < 0.85) return 'ESTABLE_ABAJO';
  return 'ESTABLE';
}

// ─── Main analysis function ───────────────────────────────────────────────────

function analyze(pool) {
  const {
    pair, tvl, vol24h, fees24h, apy, dailyYield,
    binStep, baseFee, dynamicFee,
    currentPrice, poolAgeDays, isBlacklisted,
    hasFarm, farmApr, cumulativeVolume, cumulativeFees,
    vol30m, vol4h, vol12h, fees4h, fees12h,
    tokenX, tokenY,
  } = pool;

  // ── Immediate disqualifiers ────────────────────────────────────────────────
  if (isBlacklisted) {
    return {
      verdict: 'EVITAR', verdictColor: 'red',
      reliabilityScore: 0, reliabilityLevel: 'MUY_BAJA',
      alert: 'Pool en lista negra — no invertir',
      reliabilityFactors: {}, ilEstimate: {}, netReturnEstimate: {},
      profitabilityDays: {}, minCapital: {}, rangeRecommendation: {},
      riskFactors: ['Pool en LISTA NEGRA'], strengths: [],
    };
  }

  // ── Pair category & IL ─────────────────────────────────────────────────────
  const pairCategory = getPairCategory(tokenX, tokenY);
  const [ilOpt, ilMid, ilCons] = IL_BY_CATEGORY[pairCategory] || IL_BY_CATEGORY.ALT_ALT;

  // ── Actual fee rates ───────────────────────────────────────────────────────
  const actualDailyFeeRate   = tvl > 0 ? fees24h / tvl : 0;
  const actualAnnualFeeRate  = actualDailyFeeRate * 365 * 100;

  // ── Reliability scores ─────────────────────────────────────────────────────
  const tvlScore      = scoreTVL(tvl);
  const activityScore = scoreActivity(vol24h, tvl);
  const safetyScoreX  = scoreTokenSafety(tokenX);
  const safetyScoreY  = scoreTokenSafety(tokenY);
  const safetyScore   = Math.round((safetyScoreX + safetyScoreY) / 2);
  const maturityScore = scorePoolMaturity(poolAgeDays, cumulativeVolume);

  const reliabilityScore = Math.round(
    tvlScore      * 0.35 +
    activityScore * 0.30 +
    safetyScore   * 0.20 +
    maturityScore * 0.15
  );

  const reliabilityLevel =
    reliabilityScore >= 80 ? 'MUY_ALTA' :
    reliabilityScore >= 65 ? 'ALTA'     :
    reliabilityScore >= 50 ? 'MEDIA'    :
    reliabilityScore >= 35 ? 'BAJA'     : 'MUY_BAJA';

  // ── Net return estimates ───────────────────────────────────────────────────
  const netOpt  = actualAnnualFeeRate - ilOpt;
  const netMid  = actualAnnualFeeRate - ilMid;
  const netCons = actualAnnualFeeRate - ilCons;

  // ── Profitability timeline (days to earn X% net) ───────────────────────────
  // Use moderate IL scenario for timeline
  const netDailyMid = Math.max(actualDailyFeeRate - ilMid / 365 / 100, 0);

  function daysToEarn(targetPct) {
    if (netDailyMid <= 0) return null;
    return Math.ceil(targetPct / 100 / netDailyMid);
  }

  const profitabilityDays = {
    for1Pct:  daysToEarn(1),
    for5Pct:  daysToEarn(5),
    for10Pct: daysToEarn(10),
    for20Pct: daysToEarn(20),
    for50Pct: daysToEarn(50),
  };

  // ── Minimum capital requirements ───────────────────────────────────────────
  function minCapitalForUsdPerDay(usdDay) {
    if (actualDailyFeeRate <= 0) return null;
    return Math.ceil(usdDay / actualDailyFeeRate);
  }

  const minCapital = {
    for1UsdDay:   minCapitalForUsdPerDay(1),
    for5UsdDay:   minCapitalForUsdPerDay(5),
    for10UsdDay:  minCapitalForUsdPerDay(10),
    for50UsdDay:  minCapitalForUsdPerDay(50),
    for100UsdDay: minCapitalForUsdPerDay(100),
  };

  // Max recommended capital (don't exceed % of pool TVL to avoid large slippage impact)
  const maxRecommendedCapital = Math.floor(tvl * 0.10); // max 10% of pool TVL

  // ── Range recommendations ──────────────────────────────────────────────────
  // binStep is in basis points (10 = 0.1% per bin)
  // Ranges assume symmetric deployment around current price
  const binStepPct = binStep / 100; // % per bin

  // ── Break-even price (price movement where fees = IL) ─────────────────────────
  // IL(p) = 2√p/(1+p) - 1 where p = newPrice/oldPrice
  // Solving fees_accumulated = |IL(p)|: p is the break-even price ratio
  // 2√p/(1+p) = 1 - f  →  (1-f)p - 2√p + (1-f) = 0  →  solve for √p
  // √p = [1 ± √(1-(1-f)²)] / (1-f)  where f = accumulated_fee_rate
  let breakEvenPriceDown = null;
  let breakEvenPriceUp   = null;
  const feeAccum30d = actualDailyFeeRate * 30;  // 30-day accumulated fee rate
  if (feeAccum30d > 0 && feeAccum30d < 1) {
    const f    = Math.min(feeAccum30d, 0.99);
    const disc = Math.sqrt(Math.max(0, 2 * f - f * f));
    const sqpDown = (1 - disc) / (1 - f);
    const sqpUp   = (1 + disc) / (1 - f);
    if (sqpDown > 0 && currentPrice > 0) {
      breakEvenPriceDown = parseFloat((currentPrice * sqpDown * sqpDown).toFixed(6));
      breakEvenPriceUp   = parseFloat((currentPrice * sqpUp   * sqpUp  ).toFixed(6));
    }
  }

  const ranges = {
    tight:    { bins: 10,  pct: parseFloat((10  * binStepPct).toFixed(2)) },
    moderate: { bins: 20,  pct: parseFloat((20  * binStepPct).toFixed(2)) },
    wide:     { bins: 40,  pct: parseFloat((40  * binStepPct).toFixed(2)) },
  };

  // Actual price ranges if current price is available
  if (currentPrice > 0) {
    for (const r of Object.values(ranges)) {
      r.priceMin = parseFloat((currentPrice * (1 - r.pct / 100)).toFixed(6));
      r.priceMax = parseFloat((currentPrice * (1 + r.pct / 100)).toFixed(6));
    }
  }

  // Management frequency based on tight range
  const mgmtFreq =
    ranges.tight.pct < 0.5  ? 'Diaria (rango muy estrecho — alta gestión)'  :
    ranges.tight.pct < 1    ? 'Cada 1-2 días'   :
    ranges.tight.pct < 3    ? 'Cada 2-4 días'   :
    ranges.tight.pct < 5    ? 'Semanal'          :
    ranges.tight.pct < 10   ? 'Quincenal'        : 'Mensual';

  // ── Range exit probability using pool-implied volatility ──────────────────────
  // Implied vol from baseFee and binStep: vol ≈ binStepPct / sqrt(daily_trading_fraction)
  // We use a simpler estimate: derive from actual vol/TVL ratio
  // Or use baseFee as a proxy (market makers price fees ≈ vol)
  // baseFee (%) ≈ 0.5 × daily_vol, so daily_vol ≈ baseFee / 0.5, annual_vol ≈ daily_vol × √365
  const impliedAnnualVol = baseFee > 0
    ? Math.min(parseFloat(((baseFee / 0.5) / 100 * Math.sqrt(365)).toFixed(4)), 5)
    : 0.8; // default 80% annual vol if no baseFee data

  function rangeProbability(pMin, pMax, S, sigma, days) {
    if (!S || !sigma || !days || !pMin || !pMax) return null;
    const T   = days / 365;
    const sqT = Math.sqrt(T);
    const pH  = (Math.log(pMax / S)) / (sigma * sqT);
    const pL  = (Math.log(pMin / S)) / (sigma * sqT);
    const pInRange = normalCDF(pH) - normalCDF(pL);
    return parseFloat(((1 - Math.max(0, Math.min(1, pInRange))) * 100).toFixed(1));
  }

  const rangeExitProb = {
    tight7d:    rangeProbability(ranges.tight.priceMin,    ranges.tight.priceMax,    currentPrice, impliedAnnualVol, 7),
    moderate7d: rangeProbability(ranges.moderate.priceMin, ranges.moderate.priceMax, currentPrice, impliedAnnualVol, 7),
    wide7d:     rangeProbability(ranges.wide.priceMin,     ranges.wide.priceMax,     currentPrice, impliedAnnualVol, 7),
    tight14d:   rangeProbability(ranges.tight.priceMin,    ranges.tight.priceMax,    currentPrice, impliedAnnualVol, 14),
    moderate14d:rangeProbability(ranges.moderate.priceMin, ranges.moderate.priceMax, currentPrice, impliedAnnualVol, 14),
  };

  // ── Fee vs APY discrepancy ─────────────────────────────────────────────────────
  const feeBasedApy       = actualAnnualFeeRate;
  const reportedApy       = apy;
  const apyDiscrepancy    = reportedApy > 0 ? parseFloat(((reportedApy - feeBasedApy) / reportedApy * 100).toFixed(1)) : 0;
  const apyIsInflated     = apyDiscrepancy > 30; // >30% higher than fee-based = suspicious

  // ── Volume trend ───────────────────────────────────────────────────────────
  const volumeTrend = detectVolumeTrend(vol30m, vol4h, vol12h, vol24h);

  // ── Risk factors & strengths ───────────────────────────────────────────────
  const riskFactors = [];
  const strengths   = [];

  if (tvl < 50_000)                riskFactors.push('Liquidez muy baja — difícil salir de posición sin slippage');
  if (tvl < 200_000 && tvl >= 50_000) riskFactors.push('Liquidez moderada — monitorear TVL');
  if (!tokenX?.freezeAuthorityDisabled) riskFactors.push(`${tokenX?.symbol}: freeze authority activa — riesgo de rug`);
  if (!tokenY?.freezeAuthorityDisabled) riskFactors.push(`${tokenY?.symbol}: freeze authority activa — riesgo de rug`);
  if (!tokenX?.isVerified)         riskFactors.push(`${tokenX?.symbol}: token no verificado`);
  if (!tokenY?.isVerified)         riskFactors.push(`${tokenY?.symbol}: token no verificado`);
  if (tokenX?.holders < 1_000)     riskFactors.push(`${tokenX?.symbol}: muy pocos holders (${tokenX.holders})`);
  if (tokenY?.holders < 1_000)     riskFactors.push(`${tokenY?.symbol}: muy pocos holders (${tokenY.holders})`);
  if (pairCategory === 'ALT_ALT')  riskFactors.push('Par de altcoins — pérdida impermanente potencialmente alta');
  if (apy > 10_000)                riskFactors.push('APY extremadamente alto — probable pool nueva o trampa de liquidez');
  if (binStep <= 2)                riskFactors.push('Bin step mínimo — requiere gestión casi diaria');
  if (vol24h / Math.max(tvl, 1) < 0.02) riskFactors.push('Volumen muy bajo relativo a TVL — pocos fees generados');
  if (volumeTrend === 'DESACELERANDO') riskFactors.push('Volumen desacelerando en las últimas horas');
  if (poolAgeDays < 7)             riskFactors.push('Pool muy nueva — historial insuficiente');
  if (netMid < 0)                  riskFactors.push('Retorno neto estimado negativo en escenario moderado (fees < IL esperada)');

  if (tvl >= 1_000_000)            strengths.push(`Alta liquidez ($${(tvl/1e6).toFixed(1)}M TVL)`);
  if (vol24h / tvl >= 0.5)         strengths.push('Volumen muy activo — fees constantes');
  if (pairCategory === 'STABLE_STABLE') strengths.push('Par estable-estable — pérdida impermanente mínima');
  if (pairCategory === 'STABLE_BLUECHIP') strengths.push('Par de bajo riesgo — stablecoin + blue chip');
  if (tokenX?.isVerified && tokenY?.isVerified) strengths.push('Ambos tokens verificados');
  if (tokenX?.freezeAuthorityDisabled && tokenY?.freezeAuthorityDisabled) strengths.push('Freeze authority deshabilitada en ambos tokens');
  if (poolAgeDays >= 180)          strengths.push(`Pool madura (${poolAgeDays} días)`);
  if (cumulativeVolume >= 100_000_000) strengths.push(`Gran volumen histórico ($${(cumulativeVolume/1e6).toFixed(0)}M total)`);
  if (hasFarm && farmApr > 0)      strengths.push(`Recompensas de farm (+${(farmApr*100).toFixed(1)}% APR extra)`);
  if (volumeTrend === 'ACELERANDO') strengths.push('Volumen acelerando — demanda creciente');
  if (netMid > 30)                 strengths.push(`Retorno neto moderado estimado: +${netMid.toFixed(0)}%/año`);
  if (actualAnnualFeeRate > 100)   strengths.push(`Fees reales anualizadas altas: ${actualAnnualFeeRate.toFixed(0)}%`);

  // ── Overall verdict ────────────────────────────────────────────────────────
  let verdict, verdictColor;
  if (reliabilityScore >= 70 && netMid > 30) {
    verdict = 'EXCELENTE'; verdictColor = 'emerald';
  } else if (reliabilityScore >= 60 && netMid > 10) {
    verdict = 'BUENA'; verdictColor = 'green';
  } else if (reliabilityScore >= 45 && netMid > 0) {
    verdict = 'ACEPTABLE'; verdictColor = 'yellow';
  } else if (reliabilityScore >= 30 || netMid > -10) {
    verdict = 'PRECAUCIÓN'; verdictColor = 'orange';
  } else {
    verdict = 'EVITAR'; verdictColor = 'red';
  }

  return {
    // Summary
    verdict,
    verdictColor,
    pairCategory,
    isViable: netMid > 0,

    // Reliability
    reliabilityScore,
    reliabilityLevel,
    reliabilityFactors: { tvlScore, activityScore, safetyScore, maturityScore },

    // Volume trend
    volumeTrend,
    volTvlRatio: parseFloat((vol24h / Math.max(tvl, 1)).toFixed(4)),

    // Fee data
    actualDailyFeeRate: parseFloat((actualDailyFeeRate * 100).toFixed(4)),
    actualAnnualFeeRate: parseFloat(actualAnnualFeeRate.toFixed(2)),

    // IL estimates
    ilEstimate: {
      optimistic:   parseFloat(ilOpt.toFixed(1)),
      moderate:     parseFloat(ilMid.toFixed(1)),
      conservative: parseFloat(ilCons.toFixed(1)),
    },

    // Net return after IL
    netReturnEstimate: {
      optimistic:   parseFloat(netOpt.toFixed(1)),
      moderate:     parseFloat(netMid.toFixed(1)),
      conservative: parseFloat(netCons.toFixed(1)),
    },

    // Days to earn X%
    profitabilityDays,

    // Capital requirements
    minCapital,
    maxRecommendedCapital,

    // Range recommendations
    rangeRecommendation: ranges,
    managementFrequency: mgmtFreq,

    // Risk & strengths
    riskFactors,
    strengths,

    // Pool extras
    poolAgeDays: poolAgeDays || 0,
    cumulativeVolume: parseFloat((cumulativeVolume / 1e6).toFixed(2)), // in $M
    cumulativeFees: parseFloat((cumulativeFees / 1e3).toFixed(2)),     // in $K
    hasFarm,
    farmApr: parseFloat((farmApr * 100).toFixed(2)),
    totalApy: hasFarm ? parseFloat((apy + farmApr * 100).toFixed(2)) : apy,

    // New fields
    breakEvenPriceDown,
    breakEvenPriceUp,
    rangeExitProb,
    feeBasedApy:    parseFloat(feeBasedApy.toFixed(2)),
    reportedApy:    parseFloat(reportedApy.toFixed(2)),
    apyDiscrepancy,
    apyIsInflated,
    impliedAnnualVol: parseFloat((impliedAnnualVol * 100).toFixed(1)),
  };
}

module.exports = { analyze };
