// server/config/index.js
require('dotenv').config();

const path = require('path');

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  CORS_ORIGINS: parseCsv(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000'),
  USE_MOCK_SERVICES: process.env.USE_MOCK_SERVICES === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'gatex_secret',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'gatex@admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@gatex.local',
  ADMIN_ROLE: process.env.ADMIN_ROLE || 'admin',
  OTHERS_PIN: process.env.OTHERS_PIN || '',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
  SERVE_STATIC_FRONTEND: process.env.SERVE_STATIC_FRONTEND !== 'false',
  PUBLIC_DIR: path.join(process.cwd(), 'public'),
  
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  AWS: {
    REGION: process.env.AWS_REGION || 'ap-south-1',
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_BUCKET: process.env.S3_BUCKET || 'gatex-images-prod',
  }
};
