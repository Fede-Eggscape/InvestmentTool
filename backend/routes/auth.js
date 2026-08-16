const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../store');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'wallet-tracker-secret-2026';
const WAIT_HOURS = 48;

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = store.findUser(username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.isPreloaded && !user.isAdmin) {
    const createdMs = new Date(user.createdAt).getTime();
    const waitMs = WAIT_HOURS * 3600 * 1000;
    if (Date.now() - createdMs < waitMs) {
      const activatesAt = new Date(createdMs + waitMs).toISOString();
      return res.json({ status: 'pending', activatesAt, username });
    }
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ status: 'ok', token, username: user.username, isAdmin: user.isAdmin });
});

module.exports = router;
