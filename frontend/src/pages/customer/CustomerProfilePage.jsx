import { useState, useEffect } from 'react';
import { HiOutlineUser, HiOutlineMail, HiOutlinePhone, HiOutlineLockClosed, HiOutlineExclamationCircle, HiOutlineSave } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import api from '../../services/api';

const CustomerProfilePage = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Block & Appeal states
  const [isBlocked, setIsBlocked] = useState(Boolean(user?.isBlocked));
  const [blockReason, setBlockReason] = useState(user?.blockReason || '');
  const [isAppealed, setIsAppealed] = useState(Boolean(user?.isAppealed));
  const [appealNote, setAppealNote] = useState(user?.appealNote || '');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Fetch latest profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/users/me');
        const userData = data?.data?.user || data?.data;
        if (userData) {
          setFullName(userData.fullName || '');
          setEmail(userData.email || '');
          setPhoneNumber(userData.phoneNumber || '');
          setIsBlocked(Boolean(userData.isBlocked));
          setBlockReason(userData.blockReason || '');
          setIsAppealed(Boolean(userData.isAppealed));
          setAppealNote(userData.appealNote || '');
          updateUser(userData);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [updateUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password && password.length < 6) {
      toast.error('Mật khẩu mới phải chứa ít nhất 6 ký tự!', 'Lỗi mật khẩu');
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp với mật khẩu mới!', 'Lỗi mật khẩu');
      return;
    }

    setSaving(true);
    try {
      const payload = { fullName, email, phoneNumber };
      if (password) payload.password = password;

      const { data } = await api.patch('/users/me', payload);
      const updatedUser = data?.data?.user || data?.data;
      if (updatedUser) updateUser(updatedUser);

      toast.success('Cập nhật thông tin cá nhân thành công!', 'Thành công 🎉');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể cập nhật thông tin cá nhân';
      toast.error(msg, 'Thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleAppealSubmit = async () => {
    if (!appealNote.trim()) {
      toast.warning('Vui lòng nhập nội dung giải trình khiếu nại gửi Admin!', 'Cảnh báo');
      return;
    }

    setSubmittingAppeal(true);
    try {
      const { data } = await api.post('/users/me/appeal', { appealNote });
      const updatedUser = data?.data?.user;
      if (updatedUser) {
        setIsAppealed(true);
        updateUser(updatedUser);
      } else {
        setIsAppealed(true);
      }
      toast.success('Đã gửi khiếu nại mở khóa tài khoản tới Admin xét duyệt!', 'Đã gửi khiếu nại 🚀');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể gửi khiếu nại';
      toast.error(msg, 'Lỗi');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  return (
    <div className="driver-container" style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="driver-header-bar" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="driver-title">Thông Tin Cá Nhân & Tài Khoản</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Quản lý thông tin liên hệ và trạng thái tài khoản khách hàng
          </p>
        </div>
      </div>

      {/* ─── CẢNH BÁO KHI TÀI KHOẢN BỊ KHÓA ─── */}
      {isBlocked && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 14,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginBottom: '1.5rem',
            boxShadow: '0 4px 20px rgba(239,68,68,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-red)' }}>
            <HiOutlineExclamationCircle size={28} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Tài Khoản Của Bạn Đang Bị Khóa</h3>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 10,
              borderLeft: '4px solid var(--accent-red)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Lý do từ Admin:</strong>
            <p style={{ color: 'var(--accent-red)', marginTop: 4, fontWeight: 600, fontSize: '0.95rem' }}>
              {blockReason || 'Vi phạm điều khoản sử dụng hệ thống SmartFleet'}
            </p>
          </div>

          {isAppealed ? (
            <div
              style={{
                background: 'rgba(245, 166, 35, 0.1)',
                border: '1px solid rgba(245, 166, 35, 0.35)',
                borderRadius: 10,
                padding: '12px 16px',
              }}
            >
              <strong style={{ color: '#F5A623', fontSize: '0.9rem' }}>📢 Nội dung khiếu nại đã gửi:</strong>
              <p style={{ color: 'var(--text-primary)', marginTop: 4, fontStyle: 'italic', fontSize: '0.925rem' }}>
                "{appealNote}"
              </p>
            </div>
          ) : null}

          <div className="input-group">
            <label className="input-group__label">
              {isAppealed ? 'Cập nhật bổ sung nội dung khiếu nại:' : 'Nội dung giải trình / khiếu nại mở khóa gửi Admin:'}
            </label>
            <textarea
              className="location-input"
              rows={3}
              placeholder="Nhập ghi chú giải trình gửi Admin (VD: Em cam kết không hủy đơn vô lý nữa, mong Admin mở khóa lại tài khoản giúp em...)"
              value={appealNote}
              onChange={(e) => setAppealNote(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn--primary"
            style={{
              background: 'var(--accent-red)',
              fontWeight: 700,
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: '0.95rem',
            }}
            disabled={submittingAppeal}
            onClick={handleAppealSubmit}
          >
            {submittingAppeal ? 'Đang gửi khiếu nại...' : isAppealed ? 'Cập Nhật Nội Dung Khiếu Nại 🔄' : 'Gửi Khiếu Nại Mở Khóa Tài Khoản 🚀'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu thông tin cá nhân...
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="profile-section-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: 14, border: '1px solid var(--border-primary)' }}>
            <div className="profile-section-header" style={{ marginBottom: '1.25rem' }}>
              <h2 className="profile-section-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                👤 Thông Tin Liên Hệ & Đổi Mật Khẩu
              </h2>
            </div>

            <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-group__label">
                  <HiOutlineUser /> Họ và Tên:
                </label>
                <input
                  type="text"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-group__label">
                  <HiOutlinePhone /> Số Điện Thoại:
                </label>
                <input
                  type="tel"
                  className="input"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-group__label">
                  <HiOutlineMail /> Địa Chỉ Email:
                </label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <hr style={{ borderColor: 'var(--border-primary)', margin: '1.25rem 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>🔒 Đổi Mật Khẩu Đăng Nhập</h3>
              <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-group__label">
                    <HiOutlineLockClosed /> Mật Khẩu Mới:
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Tối thiểu 6 ký tự..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-group__label">
                    <HiOutlineLockClosed /> Xác Nhận Mật Khẩu Mới:
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Nhập lại mật khẩu..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving}
              style={{
                padding: '0.8rem 2rem',
                fontWeight: 700,
                background: 'var(--gradient-blue)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <HiOutlineSave size={18} />
              {saving ? 'Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CustomerProfilePage;
