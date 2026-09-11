import { useContext } from 'react';
import { MaintenanceContext } from '../../contexts/MaintenanceContext';

/**
 * MaintenanceBanner
 * Renders a fullscreen overlay blocking all user interaction
 * when the system is in maintenance mode.
 * Only shown to CUSTOMER and DRIVER roles — Admin is exempt.
 */
const MaintenanceBanner = () => {
  const { isMaintenance, maintenanceMessage } = useContext(MaintenanceContext);

  if (!isMaintenance) return null;

  return (
    <div className="maint-overlay" role="alertdialog" aria-modal="true" aria-labelledby="maint-title">
      {/* Animated background particles */}
      <div className="maint-particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`maint-particle maint-particle--${i + 1}`} />
        ))}
      </div>

      <div className="maint-card">
        {/* Icon */}
        <div className="maint-icon-wrap">
          <div className="maint-icon-ring" />
          <span className="maint-icon" role="img" aria-label="maintenance">🔧</span>
        </div>

        {/* Texts */}
        <h2 id="maint-title" className="maint-title">Hệ Thống Đang Bảo Trì</h2>
        <p className="maint-subtitle">
          {maintenanceMessage || 'Chúng tôi đang thực hiện bảo trì định kỳ để mang đến trải nghiệm tốt hơn cho bạn.'}
        </p>

        {/* Status chips */}
        <div className="maint-chips">
          <span className="maint-chip maint-chip--pulse">⚙️ Đang xử lý</span>
          <span className="maint-chip">🔒 Tạm thời không khả dụng</span>
        </div>

        {/* Progress bar (cosmetic) */}
        <div className="maint-progress-wrap" aria-hidden="true">
          <div className="maint-progress-bar" />
        </div>

        <p className="maint-note">
          Vui lòng quay lại sau. Chúng tôi sẽ thông báo khi hệ thống hoạt động trở lại.
        </p>
      </div>
    </div>
  );
};

export default MaintenanceBanner;
