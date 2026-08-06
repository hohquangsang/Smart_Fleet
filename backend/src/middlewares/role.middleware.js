import { ForbiddenError } from '../utils/api-error.js';

/**
 * Role-based access control middleware.
 * Only allows access if the authenticated user's role is in the allowed list.
 *
 * @param  {...string} allowedRoles - Roles that can access this route
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/admin/dashboard', auth, authorize('ADMIN'), controller);
 * router.patch('/orders/:id/status', auth, authorize('DRIVER', 'ADMIN'), controller);
 */
const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};

export default authorize;
