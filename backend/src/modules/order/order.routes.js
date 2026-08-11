import { Router } from 'express';
import * as orderController from './order.controller.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/role.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import { createOrderSchema } from './order.validation.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(auth);

// Step 1: Customer creates order
router.post('/', authorize(ROLES.CUSTOMER), validate(createOrderSchema), orderController.createOrder);

// Step 2: Admin dispatches order to online drivers
router.post('/:id/dispatch', authorize(ROLES.ADMIN), orderController.dispatchOrder);

// Step 3: Driver accepts / declines order
router.get('/available-dispatch', authorize(ROLES.DRIVER), orderController.getAvailableDispatchOrder);
router.post('/:id/accept', authorize(ROLES.DRIVER), orderController.acceptOrder);
router.post('/:id/decline', authorize(ROLES.DRIVER), orderController.declineOrder);

// Step 4: Admin confirms match with customer
router.post('/:id/confirm-match', authorize(ROLES.ADMIN), orderController.confirmMatchOrder);

// Step 5: Driver starts trip (MATCHED → IN_TRANSIT = ĐANG GIAO)
router.post('/:id/start-trip', authorize(ROLES.DRIVER), orderController.startTrip);
router.patch('/:id/status', authorize(ROLES.DRIVER, ROLES.ADMIN), orderController.updateOrderStatus);

// Step 6: Driver completes delivery (IN_TRANSIT → DELIVERED = ĐÃ GIAO HÀNG)
router.post('/:id/complete-trip', authorize(ROLES.DRIVER), orderController.completeTrip);

// Step 7: Customer rates completed trip
router.post('/:id/rating', authorize(ROLES.CUSTOMER), orderController.rateOrder);

// Get orders list / details
router.get('/', authorize(ROLES.CUSTOMER, ROLES.DRIVER, ROLES.ADMIN), orderController.getOrders);
router.get('/:id', orderController.getOrderById);

// Cancel order (Customer or Admin)
router.patch('/:id/cancel', authorize(ROLES.CUSTOMER, ROLES.ADMIN), orderController.cancelOrder);

export default router;
