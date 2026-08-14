import { Router } from 'express';
import * as adminController from './admin.controller.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/role.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import { approveDriverSchema, ordersQuerySchema, deleteOrdersSchema } from './admin.validation.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(auth);
router.use(authorize(ROLES.ADMIN));

router.get('/dashboard', adminController.getDashboard);
router.get('/badge-counts', adminController.getBadgeCounts);
router.get('/orders', validate(ordersQuerySchema, 'query'), adminController.getOrders);
router.delete('/orders', validate(deleteOrdersSchema), adminController.deleteOrders);
router.get('/drivers', adminController.getDrivers);
router.get('/drivers/pending', adminController.getPendingDrivers);
router.get('/users', adminController.getUsers);
router.patch('/drivers/:id/approve', validate(approveDriverSchema), adminController.approveDriver);
router.patch('/drivers/:id/block', adminController.blockDriver);
router.patch('/drivers/:id/unblock', adminController.unblockDriver);
router.patch('/drivers/:id/resolve-appeal', adminController.resolveDriverAppeal);
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);
router.get('/analytics', adminController.getAnalytics);

export default router;
