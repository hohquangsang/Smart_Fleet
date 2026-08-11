import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import driverRoutes from '../modules/driver/driver.routes.js';
import orderRoutes from '../modules/order/order.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import invoiceRoutes from '../modules/invoice/invoice.routes.js';
import mapRoutes from '../modules/map/map.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/maps', mapRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
