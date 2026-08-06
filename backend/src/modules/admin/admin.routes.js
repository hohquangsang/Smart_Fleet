import { Router } from 'express';
import * as adminController from './admin.controller.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/role.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import { approveDriverSchema, ordersQuerySchema } from './admin.validation.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(auth);
router.use(authorize(ROLES.ADMIN));

router.get('/dashboard', adminController.getDashboard);
router.get('/orders', validate(ordersQuerySchema, 'query'), adminController.getOrders);
router.get('/drivers', adminController.getDrivers);
router.get('/drivers/pending', adminController.getPendingDrivers);
router.patch('/drivers/:id/approve', validate(approveDriverSchema), adminController.approveDriver);
router.get('/analytics', adminController.getAnalytics);

export default router;
