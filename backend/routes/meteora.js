const express = require('express');
const router = express.Router();
const meteoraService = require('../services/meteoraService');

// GET /api/meteora/combined
router.get('/combined', async (req, res, next) => {
  try {
    const data = await meteoraService.getCombinedPools();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
