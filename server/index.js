// server/index.js
const app = require('./app');
const config = require('./config');

const server = app.listen(config.PORT, () => {
  console.log(`========================================`);
  console.log(`GateX Portal Backend Running on Port ${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Frontend URL: ${config.FRONTEND_URL}`);
  console.log(`========================================`);
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('Received kill signal, shutting down gracefully...');
  server.close(() => {
    console.log('Closed out remaining connections.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
