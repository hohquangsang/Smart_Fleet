// Placeholder cho Tab 5 — SMTP & Notifications
// Sẽ được implement trong Phase 4
import { HiOutlineMail } from 'react-icons/hi';

const SmtpTab = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="settings-card">
        <div className="settings-card__title">
          <HiOutlineMail className="settings-card__title-icon" />
          Email & SMTP
        </div>
        <div className="settings-card__divider" />
        <div className="settings-empty" style={{ padding: '4rem 1rem' }}>
          <div className="settings-empty__icon">📧</div>
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>
            Tính năng đang phát triển
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Cấu hình SMTP và template email sẽ có trong phiên bản tiếp theo
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmtpTab;
