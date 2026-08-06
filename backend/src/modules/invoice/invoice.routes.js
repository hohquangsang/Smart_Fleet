import { Router } from 'express';
import * as invoiceController from './invoice.controller.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/role.middleware.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(auth);

router.get('/', authorize(ROLES.CUSTOMER), invoiceController.getInvoices);
router.get('/:orderId', authorize(ROLES.CUSTOMER, ROLES.ADMIN), invoiceController.getInvoiceByOrderId);
router.get('/:orderId/download', authorize(ROLES.CUSTOMER, ROLES.ADMIN), invoiceController.downloadInvoice);

export default router;
