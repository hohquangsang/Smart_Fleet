import { HiOutlineLockClosed } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const BlockedModal = ({ isBlocked, blockReason, profilePath = '/customer/profile', onClose }) => {
  const navigate = useNavigate();

  if (!isBlocked) return null;

  const handleGoToProfile = () => {
    if (onClose) onClose();
    navigate(profilePath);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 99999, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(6px)' }}>
      <div
        className="modal"
        style={{
          maxWidth: 480,
          width: '90vw',
          padding: '2rem',
          textAlign: 'center',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 10px 40px rgba(239, 68, 68, 0.25)',
          background: 'var(--bg-panel, #1a1d24)',
          borderRadius: 16,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--accent-red, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            border: '2px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <HiOutlineLockClosed size={36} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-red, #ef4444)', marginBottom: 8 }}>
          Tài Khoản Đã Bị Khóa
        </h2>

        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '12px 16px',
            borderRadius: 10,
            borderLeft: '4px solid var(--accent-red, #ef4444)',
            margin: '1rem 0',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #a0aec0)' }}>LÝ DO KHÓA TỪ ADMIN:</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-red, #ef4444)', marginTop: 4 }}>
            "{blockReason || 'Vi phạm điều khoản dịch vụ hệ thống'}"
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #cbd5e0)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          Tài khoản của bạn tạm thời bị khóa tất cả các chức năng. Bạn chỉ có thể truy cập trang <strong>Thông Tin Cá Nhân</strong> để gửi khiếu nại mở khóa tài khoản.
        </p>

        <button
          type="button"
          className="btn btn--primary"
          style={{
            width: '100%',
            padding: '0.85rem',
            fontWeight: 700,
            fontSize: '1rem',
            background: 'var(--accent-red, #ef4444)',
            color: '#fff',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onClick={handleGoToProfile}
        >
          Đến Trang Khiếu Nại ➔
        </button>
      </div>
    </div>
  );
};

export default BlockedModal;
