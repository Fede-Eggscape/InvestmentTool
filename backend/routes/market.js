const express = require('express');
const router  = express.Router();
const marketService = require('../services/marketService');

router.get('/summary', async (req, res, next) => {
  try {
    res.json(await marketService.getMarketSummary());
  } catch (err) { next(err); }
});

router.get('/allocate', async (req, res, next) => {
  try {
    const capital = parseFloat(req.query.capital) || 1000;
    res.json(await marketService.getAllocations(capital));
  } catch (err) { next(err); }
});

module.exports = router;
