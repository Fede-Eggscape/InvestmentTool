const express = require('express');
const router = express.Router();
const priceService = require('../services/binancePriceService');
const dualService = require('../services/binanceDualService');
const cache = require('../services/cacheService');

// GET /api/binance/prices
router.get('/prices', async (req, res, next) => {
  try {
    const data = await priceService.getPrices();
    res.json({ data, updatedAt: Date.now() });
  } catch (err) {
    next(err);
  }
});

// GET /api/binance/dual
router.get('/dual', async (req, res, next) => {
  try {
    const data = await dualService.getDualProducts();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/binance/cache-stats (debug)
router.get('/cache-stats', (req, res) => {
  res.json(cache.getStats());
});

// GET /api/binance/ping — confirm serverless function is running
router.get('/ping', (req, res) => {
  res.json({ ok: true, ts: Date.now(), region: process.env.VERCEL_REGION || 'local', node: process.version });
});

module.exports = router;
