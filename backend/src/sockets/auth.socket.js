import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Socket.IO authentication middleware.
 * Verifies JWT from handshake auth token.
 */
export const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    socket.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(new Error('Invalid authentication token'));
  }
};
