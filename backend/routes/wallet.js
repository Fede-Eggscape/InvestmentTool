const express = require('express');
const store = require('../store');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/me', (req, res) => {
  const wallet = store.getWallet(req.user.username);
  if (!wallet) return res.json({ assets: [], pools: [] });
  res.json(wallet);
});

router.put('/pools/:poolId/name', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name required' });
  }
  const ok = store.updatePoolName(req.user.username, req.params.poolId, name.trim());
  if (!ok) return res.status(404).json({ error: 'Pool not found' });
  res.json({ success: true });
});

module.exports = router;
