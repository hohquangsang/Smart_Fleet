import axios from 'axios';
import api from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const BASE = '/admin/settings';

export const settingsApi = {
  // Profile
  getProfile:      () => api.get(`${BASE}/profile`),
  updateProfile:   (data) => api.patch(`${BASE}/profile`, data),
  changePassword:  (data) => api.patch(`${BASE}/profile/password`, data),
  uploadAvatar:    (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      api.post(`${BASE}/profile/avatar`, { avatarBase64: reader.result })
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.readAsDataURL(file);
  }),

  // System Config
  getConfig:            () => api.get(`${BASE}/config`),
  updateConfig:         (updates) => api.patch(`${BASE}/config`, { updates }),

  // Maintenance Mode
  getPublicMaintenance: () => axios.get(`${API_URL}/admin/settings/public-maintenance`),
  getMaintenance:       () => api.get(`${BASE}/maintenance`),
  setMaintenance:       (enabled, message) => api.patch(`${BASE}/maintenance`, { enabled, message }),

  // Admin Accounts
  getAdmins:       () => api.get(`${BASE}/admins`),
  createAdmin:     (data) => api.post(`${BASE}/admins`, data),
  toggleAdmin:     (id) => api.patch(`${BASE}/admins/${id}/toggle-status`),
  deleteAdmin:     (id) => api.delete(`${BASE}/admins/${id}`),

  // Audit Log
  getAuditLogs:    (params) => api.get(`${BASE}/audit-log`, { params }),
};
