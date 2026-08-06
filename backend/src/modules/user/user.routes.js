import { Router } from 'express';
import * as userController from './user.controller.js';
import auth from '../../middlewares/auth.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import { updateProfileSchema } from './user.validation.js';

const router = Router();

router.use(auth);

router.get('/me', userController.getProfile);
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);

export default router;
