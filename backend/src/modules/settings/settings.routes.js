import { Router } from 'express';
import * as settingsController from './settings.controller.js';
import auth from '../../middlewares/auth.middleware.js';
import authorize from '../../middlewares/role.middleware.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

// All settings routes require authentication and ADMIN role
router.use(auth);
router.use(authorize(ROLES.ADMIN));

// ── Profile ──────────────────────────────────────────────
router.get('/profile', settingsController.getProfile);
router.patch('/profile', settingsController.updateProfile);
router.patch('/profile/password', settingsController.changePassword);

// ── System Config ─────────────────────────────────────────
router.get('/config', settingsController.getConfig);
router.patch('/config', settingsController.updateConfig);

// ── Admin Accounts ────────────────────────────────────────
router.get('/admins', settingsController.getAdmins);
router.post('/admins', settingsController.createAdmin);
router.patch('/admins/:id/toggle-status', settingsController.toggleAdminStatus);
router.delete('/admins/:id', settingsController.deleteAdmin);

// ── Audit Log ─────────────────────────────────────────────
router.get('/audit-log', settingsController.getAuditLogs);

export default router;
