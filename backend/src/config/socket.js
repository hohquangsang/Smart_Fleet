import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.IO server attached to HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'development'
        ? ['http://localhost:5173', 'http://localhost:3000']
        : [],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

/**
 * Get the Socket.IO instance (must be initialized first).
 * @returns {Server}
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocketIO() first.');
  }
  return io;
};

export default { initSocketIO, getIO };
