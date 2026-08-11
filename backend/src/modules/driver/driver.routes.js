import { Router } from 'express';
import * as driverController from './driver.controller.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/role.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import { updateProfileSchema } from '../user/user.validation.js';
import { toggleStatusSchema } from './driver.validation.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(auth);
router.use(authorize(ROLES.DRIVER));

router.get('/me', driverController.getProfile);
router.patch('/me', validate(updateProfileSchema), driverController.updateProfile);
router.post('/me/appeal', driverController.submitAppeal);
router.get('/earnings', driverController.getEarnings);
router.patch('/status', validate(toggleStatusSchema), driverController.toggleStatus);
router.post('/orders/:id/accept', driverController.acceptOrder);

export default router;
