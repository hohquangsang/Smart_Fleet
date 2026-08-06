import http from 'http';
import app from './app.js';
import env from './config/env.js';
import { initSocketIO } from './config/socket.js';
import { initSocketHandlers } from './sockets/index.js';
import { initGpsFlushJob } from './queues/gps-flush.worker.js';

// Import workers so they start processing
import './queues/order.worker.js';
import './queues/invoice.worker.js';

const startServer = async () => {
  try {
    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocketIO(server);
    initSocketHandlers();

    // Initialize GPS flush repeatable job
    await initGpsFlushJob();

    // Start listening
    server.listen(env.PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║          🚀 SmartFleet API Server            ║
╠══════════════════════════════════════════════╣
║  Port:        ${String(env.PORT).padEnd(30)}║
║  Environment: ${env.NODE_ENV.padEnd(30)}║
║  API:         http://localhost:${env.PORT}/api/v1  ║
╚══════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🔄 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
