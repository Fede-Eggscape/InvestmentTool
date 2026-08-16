const express = require('express');
const store = require('../store');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

router.get('/users', (req, res) => {
  const now = Date.now();
  const WAIT_MS = 48 * 3600 * 1000;
  const users = store.users.map((u) => {
    const elapsed = now - new Date(u.createdAt).getTime();
    const pending = !u.isPreloaded && !u.isAdmin && elapsed < WAIT_MS;
    const remaining = pending ? WAIT_MS - elapsed : 0;
    return {
      id: u.id,
      username: u.username,
      isAdmin: u.isAdmin,
      isPreloaded: u.isPreloaded,
      createdAt: u.createdAt,
      pending,
      hoursLeft: pending ? Math.floor(remaining / 3600000) : 0,
      minutesLeft: pending ? Math.floor((remaining % 3600000) / 60000) : 0,
    };
  });
  res.json(users);
});

router.post('/users', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (store.findUser(username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  const user = store.addUser(username, password);
  res.status(201).json({ id: user.id, username: user.username, createdAt: user.createdAt });
});

router.delete('/users/:id', (req, res) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.isAdmin) return res.status(400).json({ error: 'Cannot delete admin user' });
  store.removeUser(req.params.id);
  res.json({ success: true });
});

module.exports = router;
