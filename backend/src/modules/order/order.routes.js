import { Router } from 'express';
import * as orderController from './order.controller.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/role.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import { createOrderSchema, updateStatusSchema } from './order.validation.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(auth);

// Customer creates order
router.post('/', authorize(ROLES.CUSTOMER), validate(createOrderSchema), orderController.createOrder);

// Customer or Driver gets their orders
router.get('/', authorize(ROLES.CUSTOMER, ROLES.DRIVER), orderController.getOrders);

// Anyone authenticated can view order details
router.get('/:id', orderController.getOrderById);

// Driver updates status (PICKED_UP, DELIVERED)
router.patch('/:id/status', authorize(ROLES.DRIVER), validate(updateStatusSchema), orderController.updateStatus);

// Customer cancels order
router.patch('/:id/cancel', authorize(ROLES.CUSTOMER), orderController.cancelOrder);

export default router;
