import api from './api';

const BASE = '/admin/settings';

export const settingsApi = {
  // Profile
  getProfile:      () => api.get(`${BASE}/profile`),
  updateProfile:   (data) => api.patch(`${BASE}/profile`, data),
  changePassword:  (data) => api.patch(`${BASE}/profile/password`, data),

  // System Config
  getConfig:       () => api.get(`${BASE}/config`),
  updateConfig:    (updates) => api.patch(`${BASE}/config`, { updates }),

  // Admin Accounts
  getAdmins:       () => api.get(`${BASE}/admins`),
  createAdmin:     (data) => api.post(`${BASE}/admins`, data),
  toggleAdmin:     (id) => api.patch(`${BASE}/admins/${id}/toggle-status`),
  deleteAdmin:     (id) => api.delete(`${BASE}/admins/${id}`),

  // Audit Log
  getAuditLogs:    (params) => api.get(`${BASE}/audit-log`, { params }),
};
