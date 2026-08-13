import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { UnauthorizedError } from '../utils/api-error.js';

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header, verifies it,
 * and attaches decoded user data to req.user.
 */
const authMiddleware = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.activeRole || decoded.role,
      activeRole: decoded.activeRole || decoded.role,
      jti: decoded.jti,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid access token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token has expired'));
    }
    next(error);
  }
};

export default authMiddleware;
