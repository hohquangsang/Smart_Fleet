import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineExclamationCircle,
  HiOutlineSave,
  HiOutlineCamera,
  HiOutlineIdentification,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineX,
  HiOutlineCloudUpload,
  HiOutlineXCircle,
} from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import api from '../../services/api';

const CustomerProfilePage = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile Form States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [cccdImage, setCccdImage] = useState(user?.cccdImage || user?.driver?.cccdImage || null);

  // Block & Appeal States
  const [isBlocked, setIsBlocked] = useState(Boolean(user?.isBlocked));
  const [blockReason, setBlockReason] = useState(user?.blockReason || '');
  const [isAppealed, setIsAppealed] = useState(Boolean(user?.isAppealed));
  const [appealNote, setAppealNote] = useState(user?.appealNote || '');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Driver Registration Modal State
  const [showDriverRegModal, setShowDriverRegModal] = useState(false);
  const [submittingDriverReg, setSubmittingDriverReg] = useState(false);
  const [vehicleType, setVehicleType] = useState(user?.driver?.vehicleType || 'motorcycle');
  const [licensePlate, setLicensePlate] = useState(user?.driver?.licensePlate || '');
  const [licenseImage, setLicenseImage] = useState(user?.driver?.licenseImage || null);

  const avatarInputRef = useRef(null);
  const cccdInputRef = useRef(null);
  const gplxInputRef = useRef(null);
  const driverCccdInputRef = useRef(null);

  // Driver Info from Profile
  const driverInfo = user?.driver || null;
  const driverStatus = driverInfo?.approvalStatus || null;

  // Listen to socket events for real-time status updates
  useEffect(() => {
    if (!socket) return;

    const handleUserStatusUpdate = (data) => {
      if (data.isBlocked !== undefined) {
        setIsBlocked(Boolean(data.isBlocked));
        if (data.blockReason) setBlockReason(data.blockReason);
        if (data.isBlocked) {
          toast.error(`Tài khoản của bạn đã bị khóa bởi Admin: "${data.blockReason || ''}"`, 'Tài khoản bị khóa');
        } else {
          setIsAppealed(false);
          setAppealNote('');
          toast.success('Tài khoản của bạn đã được Admin mở khóa thành công!', 'Chúc mừng 🎉');
        }
      }
    };

    const handleDriverApproval = (data) => {
      if (data.approvalStatus === 'APPROVED') {
        toast.success('Hồ sơ tài xế của bạn đã được Admin phê duyệt!', 'Chúc mừng 🎉');
      } else if (data.approvalStatus === 'REJECTED') {
        toast.error(`Hồ sơ tài xế bị từ chối: "${data.rejectionReason || ''}"`, 'Từ chối hồ sơ');
      }
      fetchProfile();
    };

    socket.on('user:status-updated', handleUserStatusUpdate);
    socket.on('driver:approval-updated', handleDriverApproval);

    return () => {
      socket.off('user:status-updated', handleUserStatusUpdate);
      socket.off('driver:approval-updated', handleDriverApproval);
    };
  }, [socket, toast]);

  // Fetch latest profile on mount
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/me');
      const userData = data?.data?.user || data?.data;
      if (userData) {
        setFullName(userData.fullName || '');
        setEmail(userData.email || '');
        setPhoneNumber(userData.phoneNumber || '');
        setAvatar(userData.avatar || null);
        setCccdImage(userData.cccdImage || userData.driver?.cccdImage || null);
        setIsBlocked(Boolean(userData.isBlocked));
        setBlockReason(userData.blockReason || '');
        setIsAppealed(Boolean(userData.isAppealed));
        setAppealNote(userData.appealNote || '');

        if (userData.driver) {
          setVehicleType(userData.driver.vehicleType || 'motorcycle');
          setLicensePlate(userData.driver.licensePlate || '');
          setLicenseImage(userData.driver.licenseImage || null);
        }
        updateUser(userData);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Image Upload Converters (Base64)
  const handleImageFile = (file, setter) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB!');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile Form
  const handleSubmitProfile = async (e) => {
    e.preventDefault();

    if (password && password.length < 6) {
      toast.error('Mật khẩu mới phải chứa ít nhất 6 ký tự!', 'Lỗi mật khẩu');
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!', 'Lỗi mật khẩu');
      return;
    }

    setSaving(true);
    try {
      const payload = { fullName, email, phoneNumber, avatar, cccdImage };
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

  // Submit Appeal for Blocked Account
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

  // Submit Driver Registration
  const handleRegisterDriverSubmit = async (e) => {
    e.preventDefault();

    if (!licensePlate.trim()) {
      toast.error('Vui lòng nhập biển số xe của bạn!');
      return;
    }

    setSubmittingDriverReg(true);
    try {
      const payload = {
        vehicleType,
        licensePlate: licensePlate.trim().toUpperCase(),
        licenseImage,
        cccdImage,
      };

      const { data } = await api.post('/users/register-driver', payload);
      const updatedUser = data?.data?.user || data?.data;

      if (updatedUser) {
        updateUser(updatedUser);
      }

      toast.success('Hồ sơ đăng ký tài xế đã được gửi thành công! Admin sẽ duyệt hồ sơ của bạn sớm.', 'Nộp hồ sơ thành công 🚀');
      setShowDriverRegModal(false);
      fetchProfile();
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi hồ sơ đăng ký tài xế';
      toast.error(msg, 'Thất bại');
    } finally {
      setSubmittingDriverReg(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'KH';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="driver-container" style={{ maxWidth: 850, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="driver-header-bar" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="driver-title">Thông Tin Cá Nhân & Hồ Sơ</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Quản lý thông tin tài khoản, cập nhật CCCD và đăng ký làm đối tác tài xế SmartFleet
          </p>
        </div>
      </div>

      {/* ─── HEADER AVATAR CARD ─────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-primary)',
          borderRadius: 16,
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: 'var(--bg-panel-floating)',
              border: '2px solid var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
            }}
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(fullName)
            )}
          </div>

          <button
            type="button"
            title="Đổi ảnh đại diện"
            onClick={() => avatarInputRef.current?.click()}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              color: '#ffffff',
              border: '2px solid var(--bg-panel)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <HiOutlineCamera size={18} />
          </button>
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageFile(e.target.files[0], setAvatar)}
          />
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fullName}</h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 12,
                background: driverStatus === 'APPROVED' ? 'rgba(51, 214, 159, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: driverStatus === 'APPROVED' ? 'var(--accent-green)' : 'var(--accent-blue)',
                border: '1px solid ' + (driverStatus === 'APPROVED' ? 'rgba(51, 214, 159, 0.3)' : 'rgba(59, 130, 246, 0.3)'),
              }}
            >
              {driverStatus === 'APPROVED' ? '🚖 TÀI XẾ SMARTFLEET' : '👤 KHÁCH HÀNG'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            SĐT: {phoneNumber || '—'} · Email: {email || '—'}
          </p>
        </div>
      </div>

      {/* ─── CẢNH BÁO TÀI KHOẢN BỊ KHÓA ─────────────────────── */}
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
              placeholder="Nhập ghi chú giải trình gửi Admin..."
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

      {/* ─── KHỐI ĐĂNG KÝ LÀM TÀI XẾ SMARTFLEET ─────────────────── */}
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-primary)',
          borderRadius: 16,
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineTruck style={{ color: 'var(--accent-blue)', fontSize: '1.3rem' }} />
              Trở Thành Đối Tác Tài Xế SmartFleet
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Đăng ký xe máy, ô tô hoặc xe tải để nhận đơn chở khách & giao hàng trên toàn hệ thống
            </p>
          </div>

          {!driverStatus && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setShowDriverRegModal(true)}
              style={{
                background: 'var(--gradient-blue)',
                fontWeight: 700,
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Đăng Ký Làm Tài Xế Mới 🚀
            </button>
          )}
        </div>

        {/* Trạng thái duyệt hồ sơ tài xế */}
        {driverStatus === 'PENDING' && (
          <div
            style={{
              marginTop: '1.25rem',
              background: 'rgba(245, 166, 35, 0.12)',
              border: '1px solid rgba(245, 166, 35, 0.35)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <HiOutlineClock style={{ color: '#F5A623', fontSize: '1.8rem', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#F5A623', fontSize: '0.95rem' }}>⏳ Hồ Sơ Đăng Ký Tài Xế Đang Được Đội Ngũ Admin Xét Duyệt</strong>
              <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: 2 }}>
                Phương tiện: <strong>{licensePlate}</strong> ({vehicleType === 'motorcycle' ? 'Xe máy' : vehicleType === 'car_4' ? 'Ô tô 4 chỗ' : 'Xe tải'}). Chúng tôi sẽ thông báo cho bạn ngay khi hồ sơ được phê duyệt!
              </p>
            </div>
          </div>
        )}

        {driverStatus === 'REJECTED' && (
          <div
            style={{
              marginTop: '1.25rem',
              background: 'rgba(240, 87, 107, 0.12)',
              border: '1px solid rgba(240, 87, 107, 0.35)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HiOutlineXCircle style={{ color: 'var(--accent-red)', fontSize: '1.8rem', flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--accent-red)', fontSize: '0.95rem' }}>❌ Hồ Sơ Đăng Ký Tài Xế Bị Từ Chối</strong>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: 2 }}>
                  Lý do: <em>"{driverInfo?.rejectionReason || 'Thông tin hoặc bằng lái không hợp lệ'}"</em>
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setShowDriverRegModal(true)}
              style={{ background: 'var(--accent-red)', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              Cập Nhật & Nộp Lại Hồ Sơ 🔄
            </button>
          </div>
        )}

        {driverStatus === 'APPROVED' && (
          <div
            style={{
              marginTop: '1.25rem',
              background: 'rgba(51, 214, 159, 0.12)',
              border: '1px solid rgba(51, 214, 159, 0.35)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HiOutlineCheckCircle style={{ color: 'var(--accent-green)', fontSize: '1.8rem', flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--accent-green)', fontSize: '0.95rem' }}>🎉 Hồ Sơ Của Bạn Đã Được Admin Phê Duyệt!</strong>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: 2 }}>
                  Biển số xe: <strong>{licensePlate}</strong>. Bạn đã sẵn sàng bật Online nhận đơn ngay.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate('/driver')}
              style={{ background: 'var(--accent-green)', color: '#0d111a', fontWeight: 700, padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              Vào Trang Điều Hành Tài Xế 🚖
            </button>
          </div>
        )}
      </div>

      {/* ─── FORM CẬP NHẬT THÔNG TIN VÀ ẢNH CCCD ────────────────── */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu thông tin cá nhân...
        </div>
      ) : (
        <form onSubmit={handleSubmitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Thông tin cá nhân */}
          <div className="profile-section-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-primary)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineUser style={{ color: 'var(--accent-blue)' }} /> Thông Tin Liên Hệ Cá Nhân
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-group__label"><HiOutlineUser /> Họ và Tên:</label>
                <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div className="input-group">
                <label className="input-group__label"><HiOutlinePhone /> Số Điện Thoại:</label>
                <input type="tel" className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
              </div>

              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label className="input-group__label"><HiOutlineMail /> Địa Chỉ Email:</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Card 2: Căn Cước Công Dân (CCCD) */}
          <div className="profile-section-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-primary)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineIdentification style={{ color: 'var(--accent-blue)', fontSize: '1.3rem' }} /> Ảnh Căn Cước Công Dân (CCCD / CMND)
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Tải lên ảnh chụp mặt trước CCCD để xác minh danh tính và hỗ trợ khi đăng ký tài xế
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              {cccdImage ? (
                <div style={{ position: 'relative', width: '100%', maxHeight: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                  <img src={cccdImage} alt="CCCD Preview" style={{ width: '100%', height: 200, objectFit: 'contain', background: '#0d111a' }} />
                  <button
                    type="button"
                    onClick={() => setCccdImage(null)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }}
                  >
                    <HiOutlineX />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => cccdInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: 140,
                    border: '2px dashed var(--border-primary)',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    background: 'var(--bg-panel-sub)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <HiOutlineCloudUpload size={32} style={{ color: 'var(--accent-blue)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tải Lên Ảnh CCCD / CMND</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chấp nhận JPG, PNG (Tối đa 5MB)</span>
                </div>
              )}

              <input
                type="file"
                ref={cccdInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleImageFile(e.target.files[0], setCccdImage)}
              />

              {cccdImage && (
                <button
                  type="button"
                  onClick={() => cccdInputRef.current?.click()}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔄 Chọn ảnh CCCD khác
                </button>
              )}
            </div>
          </div>

          {/* Card 3: Đổi Mật Khẩu */}
          <div className="profile-section-card" style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-primary)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineLockClosed style={{ color: 'var(--accent-blue)' }} /> Đổi Mật Khẩu Đăng Nhập
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-group__label">Mật Khẩu Mới:</label>
                <input type="password" className="input" placeholder="Tối thiểu 6 ký tự..." value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="input-group">
                <label className="input-group__label">Xác Nhận Mật Khẩu Mới:</label>
                <input type="password" className="input" placeholder="Nhập lại mật khẩu..." value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving}
              style={{
                padding: '0.85rem 2.25rem',
                fontWeight: 700,
                background: 'var(--gradient-blue)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 10,
              }}
            >
              <HiOutlineSave size={18} />
              {saving ? 'Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}
            </button>
          </div>
        </form>
      )}

      {/* ─── MODAL FORM ĐĂNG KÝ LÀM TÀI XẾ ────────────────────── */}
      {showDriverRegModal && (
        <div className="modal-overlay" onClick={() => setShowDriverRegModal(false)}>
          <div className="modal-box" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiOutlineTruck style={{ color: 'var(--accent-blue)' }} /> Đăng Ký Trở Thành Tài Xế
              </h3>
              <button
                type="button"
                onClick={() => setShowDriverRegModal(false)}
                style={{ background: 'none', border: 'none', color: '#8a94a6', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                <HiOutlineX />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Vui lòng cung cấp đầy đủ thông tin phương tiện và ảnh chụp bằng lái xe. Hồ sơ của bạn sẽ được gửi tới Admin để phê duyệt.
            </p>

            <form onSubmit={handleRegisterDriverSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-group__label">Loại Phương Tiện:</label>
                <select
                  className="input"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  style={{ background: '#111622', color: '#fff' }}
                >
                  <option value="motorcycle">🏍️ Xe Máy (Giao hàng / Chở khách)</option>
                  <option value="car_4">🚗 Ô Tô 4 Chỗ (Chở khách)</option>
                  <option value="truck">🚚 Xe Tải Nhẹ (Vận chuyển hàng hóa)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-group__label">Biển Số Xe (*):</label>
                <input
                  type="text"
                  className="input"
                  placeholder="VD: 59-F1 123.45 hoặc 51K-888.88"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  required
                />
              </div>

              {/* Upload Ảnh GPLX */}
              <div className="input-group">
                <label className="input-group__label">Ảnh Giấy Phép Lái Xe (GPLX):</label>
                {licenseImage ? (
                  <div style={{ position: 'relative', height: 130, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                    <img src={licenseImage} alt="GPLX Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0d111a' }} />
                    <button
                      type="button"
                      onClick={() => setLicenseImage(null)}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}
                    >
                      <HiOutlineX />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => gplxInputRef.current?.click()}
                    style={{
                      height: 90,
                      border: '1.5px dashed var(--border-primary)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: '#111622',
                    }}
                  >
                    <HiOutlineCloudUpload size={24} style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Tải lên ảnh GPLX (Bằng lái xe)</span>
                  </div>
                )}
                <input type="file" ref={gplxInputRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageFile(e.target.files[0], setLicenseImage)} />
              </div>

              {/* Upload Ảnh CCCD trong form đăng ký */}
              <div className="input-group">
                <label className="input-group__label">Ảnh Căn Cước Công Dân (CCCD):</label>
                {cccdImage ? (
                  <div style={{ position: 'relative', height: 130, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                    <img src={cccdImage} alt="CCCD Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0d111a' }} />
                    <button
                      type="button"
                      onClick={() => setCccdImage(null)}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}
                    >
                      <HiOutlineX />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => driverCccdInputRef.current?.click()}
                    style={{
                      height: 90,
                      border: '1.5px dashed var(--border-primary)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: '#111622',
                    }}
                  >
                    <HiOutlineCloudUpload size={24} style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Tải lên ảnh CCCD</span>
                  </div>
                )}
                <input type="file" ref={driverCccdInputRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageFile(e.target.files[0], setCccdImage)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-reject" onClick={() => setShowDriverRegModal(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-approve"
                  disabled={submittingDriverReg}
                  style={{ background: 'var(--accent-blue)', color: '#fff' }}
                >
                  {submittingDriverReg ? 'Đang gửi...' : 'Gửi Hồ Sơ Đăng Ký 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfilePage;
