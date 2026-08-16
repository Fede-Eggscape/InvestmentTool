const express = require('express');
const store = require('../store');
const { authMiddleware } = require('../middleware/authMiddleware');
const { fetchAssets, isSolanaAddress } = require('../services/solanaAssets');

const router = express.Router();
router.use(authMiddleware);

router.get('/me', async (req, res) => {
  const wallet = store.getWallet(req.user.username);
  if (!wallet) return res.json({ assets: [], pools: [] });

  // For Solana wallet addresses, fetch real on-chain balances.
  // Seeded assets are only used for non-address usernames (e.g. admin/test users).
  if (isSolanaAddress(req.user.username)) {
    try {
      const realAssets = await fetchAssets(req.user.username);
      return res.json({ ...wallet, assets: realAssets });
    } catch (err) {
      console.error('[wallet/me] fetchAssets failed:', err.message);
      return res.json({ ...wallet, assets: [], assetsError: 'Unable to load on-chain assets' });
    }
  }

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
