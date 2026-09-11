import { createContext, useState, useContext, useEffect } from 'react';
import { SocketContext } from './SocketContext';
import { AuthContext } from './AuthContext';
import { settingsApi } from '../services/settings.service';

export const MaintenanceContext = createContext({
  isMaintenance: false,
  maintenanceMessage: '',
});

/**
 * MaintenanceProvider
 * - On mount: fetch current maintenance state from backend (for page refresh)
 * - Listens to socket event 'system:maintenance' for real-time updates
 * - Only applies to CUSTOMER and DRIVER roles (Admin bypasses maintenance)
 */
export const MaintenanceProvider = ({ children }) => {
  const [isMaintenance, setIsMaintenance]       = useState(false);
  const [maintenanceMessage, setMaintenanceMsg] = useState('');
  const socket    = useContext(SocketContext);
  const { user }  = useContext(AuthContext);

  const isAdmin = user?.role === 'ADMIN';

  // ── Fetch current state on mount (handles page refresh) ──────────────────
  useEffect(() => {
    if (isAdmin) return; // Admin is never blocked

    settingsApi.getPublicMaintenance()
      .then(({ data }) => {
        if (data?.data?.enabled) {
          setIsMaintenance(true);
          setMaintenanceMsg(data.data.message || '');
        }
      })
      .catch(() => { /* silently ignore – backend may be unavailable */ });
  }, [isAdmin]);

  // ── Listen for real-time socket push ─────────────────────────────────────
  useEffect(() => {
    if (!socket || isAdmin) return;

    const handler = ({ enabled, message }) => {
      setIsMaintenance(!!enabled);
      setMaintenanceMsg(message || '');
    };

    socket.on('system:maintenance', handler);
    return () => socket.off('system:maintenance', handler);
  }, [socket, isAdmin]);

  return (
    <MaintenanceContext.Provider value={{ isMaintenance, maintenanceMessage }}>
      {children}
    </MaintenanceContext.Provider>
  );
};
