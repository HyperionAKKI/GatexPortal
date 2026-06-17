// server/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const mockStore = require('../lib/mockStore');
const redis = require('../services/redis.service');

async function adminLogin(req, res) {
  const { email, password } = req.body;
  if (email && email !== config.ADMIN_EMAIL) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (password !== config.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { role: config.ADMIN_ROLE, id: 'admin', email: config.ADMIN_EMAIL }, 
    config.JWT_SECRET, 
    { expiresIn: '8h' }
  );
  res.json({ token, role: config.ADMIN_ROLE, email: config.ADMIN_EMAIL });
}

async function verifyOthersPin(req, res) {
  const { pin } = req.body;
  const stored = config.USE_MOCK_SERVICES
    ? (mockStore.getOthersPin() || config.OTHERS_PIN || config.ADMIN_PASSWORD)
    : (await redis.get('others_pin')) || config.OTHERS_PIN || config.ADMIN_PASSWORD;
  if (pin !== stored) {
    return res.status(401).json({ error: 'Incorrect PIN' });
  }
  const token = jwt.sign(
    { role: 'admin', scope: 'others_only' }, 
    config.JWT_SECRET, 
    { expiresIn: '30m' }
  );
  res.json({ token });
}

module.exports = {
  adminLogin,
  verifyOthersPin
};
