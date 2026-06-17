// server/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const limiter = require('./middleware/rateLimiter');
const apiRoutes = require('./routes');

const app = express();

if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Global middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiter to all API endpoints
app.use('/api', limiter);

// Register routes
app.use('/api', apiRoutes);

if (config.SERVE_STATIC_FRONTEND) {
  app.use(express.static(config.PUBLIC_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
  });
}

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
