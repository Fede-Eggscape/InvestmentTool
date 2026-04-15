// Generates investment signals based on trend analysis and product parameters

function generateSignal(product, trendData, currentPrice) {
  const { direction, strikePrice, apy } = product;
  const { trend, momentum } = trendData;

  if (trend === 'UNKNOWN') {
    return {
      signal: 'NEUTRAL',
      confidence: 0,
      reason: 'Datos de tendencia no disponibles',
    };
  }

  const strikeDistance = ((strikePrice - currentPrice) / currentPrice) * 100;
  // strikeDistance < 0 means strike is BELOW current price (typical for BUY products)
  // strikeDistance > 0 means strike is ABOVE current price (typical for SELL products)

  let signal, confidence, reason;

  if (direction === 'BUY') {
    // BUY product: investor wins if price FALLS to strike (buys BTC cheap)
    // Risk: if price stays above strike, you get back USDT + APY only
    // Good signal: price is falling toward the strike
    const strikeIsTooFar = strikeDistance < -12; // more than 12% below current price

    if (strikeIsTooFar) {
      signal = 'NEUTRAL';
      confidence = 30;
      reason = `Strike ${Math.abs(strikeDistance).toFixed(1)}% por debajo — poco probable que llegue`;
    } else if (trend === 'DOWN' && momentum === 'STRONG_DOWN') {
      signal = 'STRONG_BUY';
      confidence = 88;
      reason = 'Tendencia bajista fuerte confirma strike alcanzable';
    } else if (trend === 'DOWN' && momentum === 'DOWN') {
      signal = 'BUY';
      confidence = 70;
      reason = 'Tendencia bajista alineada con el producto';
    } else if (trend === 'DOWN') {
      signal = 'BUY';
      confidence = 58;
      reason = 'Tendencia bajista, momentum mixto';
    } else if (trend === 'UP' && momentum === 'STRONG_UP') {
      signal = 'CAUTION';
      confidence = 25;
      reason = 'Precio sube fuerte — strike difícil de alcanzar, APY como seguro';
    } else {
      signal = 'NEUTRAL';
      confidence = 45;
      reason = 'Señales mixtas — rendimiento garantizado si precio sigue arriba';
    }
  } else {
    // SELL product: investor wins if price RISES to strike (sells BTC at premium)
    // Risk: if price stays below strike, you get back BTC + APY only
    // Good signal: price is rising toward the strike
    const strikeIsTooFar = strikeDistance > 12; // more than 12% above current price

    if (strikeIsTooFar) {
      signal = 'NEUTRAL';
      confidence = 30;
      reason = `Strike ${strikeDistance.toFixed(1)}% por arriba — poco probable que llegue`;
    } else if (trend === 'UP' && momentum === 'STRONG_UP') {
      signal = 'STRONG_BUY';
      confidence = 88;
      reason = 'Tendencia alcista fuerte confirma strike alcanzable';
    } else if (trend === 'UP' && momentum === 'UP') {
      signal = 'BUY';
      confidence = 70;
      reason = 'Tendencia alcista alineada con el producto';
    } else if (trend === 'UP') {
      signal = 'BUY';
      confidence = 58;
      reason = 'Tendencia alcista, momentum mixto';
    } else if (trend === 'DOWN' && momentum === 'STRONG_DOWN') {
      signal = 'CAUTION';
      confidence = 25;
      reason = 'Precio cae fuerte — strike difícil de alcanzar, APY como seguro';
    } else {
      signal = 'NEUTRAL';
      confidence = 45;
      reason = 'Señales mixtas — rendimiento garantizado si precio sigue abajo';
    }
  }

  return {
    signal,
    confidence,
    reason,
    strikeDistance: parseFloat(strikeDistance.toFixed(2)),
  };
}

module.exports = { generateSignal };
