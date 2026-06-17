// server/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const clientRoutes = require('./client.routes');
const registrationRoutes = require('./registration.routes');
const adminRoutes = require('./admin.routes');

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/registrations', registrationRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

module.exports = router;
