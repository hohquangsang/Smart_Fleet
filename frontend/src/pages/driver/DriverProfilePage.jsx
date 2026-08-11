import { useState, useEffect, useContext } from 'react';
import { HiOutlineUser, HiOutlineMail, HiOutlinePhone, HiOutlineLockClosed, HiOutlineUpload, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineEye, HiOutlineTruck, HiOutlineSave } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import api from '../../services/api';
import '../../styles/driver.css';

const DriverProfilePage = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const socket = useContext(SocketContext);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Driver specific info
  const [vehicleType, setVehicleType] = useState(user?.driver?.vehicleType || 'motorcycle');
  const [licensePlate, setLicensePlate] = useState(user?.driver?.licensePlate || '');
  const [approvalStatus, setApprovalStatus] = useState(user?.driver?.approvalStatus || 'PENDING');
  const [rating, setRating] = useState(user?.driver?.rating || 5.0);

  // Rejection & Appeal state
  const [rejectionReason, setRejectionReason] = useState(user?.driver?.rejectionReason || '');
  const [rejectionCount, setRejectionCount] = useState(user?.driver?.rejectionCount || 0);
  const [isAppealed, setIsAppealed] = useState(user?.driver?.isAppealed || false);
  const [appealNote, setAppealNote] = useState(user?.driver?.appealNote || '');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Documents (Base64 or image URL)
  const [licenseImage, setLicenseImage] = useState(user?.driver?.licenseImage || null);
  const [cccdImage, setCccdImage] = useState(user?.driver?.cccdImage || null);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // Listen to socket: driver:approval-updated
  useEffect(() => {
    if (!socket) return;

    const handleApprovalUpdate = (data) => {
      if (data.deleted || data.approvalStatus === 'PERMANENTLY_REJECTED') {
        toast.error('Hồ sơ khiếu nại của bạn đã bị từ chối lần 2. Tài khoản đã bị xóa khỏi hệ thống.', 'Tài khoản đã hủy');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2500);
        return;
      }

      if (data.approvalStatus) {
        setApprovalStatus(data.approvalStatus);
        if (data.rejectionReason) setRejectionReason(data.rejectionReason);
        if (data.rejectionCount) setRejectionCount(data.rejectionCount);
        if (data.approvalStatus === 'APPROVED') {
          toast.success('Hồ sơ tài xế của bạn đã được Admin phê duyệt!', 'Chúc mừng 🎉');
        } else if (data.approvalStatus === 'REJECTED') {
          toast.error(`Hồ sơ bị từ chối: "${data.rejectionReason || ''}"`, 'Từ chối duyệt');
        }
      }
    };

    socket.on('driver:approval-updated', handleApprovalUpdate);
    return () => socket.off('driver:approval-updated', handleApprovalUpdate);
  }, [socket, toast]);

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
          if (userData.driver) {
            setVehicleType(userData.driver.vehicleType || 'motorcycle');
            setLicensePlate(userData.driver.licensePlate || '');
            setApprovalStatus(userData.driver.approvalStatus || 'PENDING');
            setRejectionReason(userData.driver.rejectionReason || '');
            setRejectionCount(userData.driver.rejectionCount || 0);
            setIsAppealed(Boolean(userData.driver.isAppealed));
            setAppealNote(userData.driver.appealNote || '');
            setRating(userData.driver.rating || 5.0);
            setLicenseImage(userData.driver.licenseImage || null);
            setCccdImage(userData.driver.cccdImage || null);
          }
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

  // Handle image upload & convert to base64 for preview and saving
  const handleImageUpload = (e, setImageState, label) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(`Kích thước ảnh ${label} quá lớn. Dung lượng tối đa là 5MB!`, 'Lỗi hình ảnh');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageState(reader.result);
      toast.success(`Đã tải lên ảnh ${label} thành công!`, 'Tải ảnh');
    };
    reader.readAsDataURL(file);
  };

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
      const payload = {
        fullName,
        email,
        phoneNumber,
        vehicleType,
        licensePlate,
        licenseImage,
        cccdImage,
      };

      if (password) {
        payload.password = password;
      }

      const { data } = await api.patch('/users/me', payload);
      const updatedUser = data?.data?.user || data?.data;

      if (updatedUser) {
        updateUser(updatedUser);
      }

      toast.success('Cập nhật thông tin cá nhân và tài liệu thành công!', 'Thành công 🎉');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể lưu thay đổi thông tin cá nhân';
      toast.error(msg, 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleAppealSubmit = async () => {
    setSubmittingAppeal(true);
    try {
      const payload = {
        fullName,
        phoneNumber,
        vehicleType,
        licensePlate,
        licenseImage,
        cccdImage,
        appealNote,
      };

      const { data } = await api.post('/drivers/me/appeal', payload);
      const updatedDriver = data?.data?.driver;
      if (updatedDriver) {
        setApprovalStatus(updatedDriver.approvalStatus || 'PENDING');
        setIsAppealed(true);
        toast.success('Đã gửi khiếu nại và bổ sung thông tin hồ sơ đến Admin xét duyệt lại!', 'Đã gửi khiếu nại 🚀');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể gửi khiếu nại';
      toast.error(msg, 'Lỗi');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  return (
    <div className="driver-container">
      {/* ─── TIÊU ĐỀ TRANG CÁ NHÂN ──────────────────────── */}
      <div className="driver-header-bar">
        <div>
          <h1 className="driver-title">Thông Tin Cá Nhân & Hồ Sơ Tài Xế</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Quản lý giấy tờ pháp lý (Bằng lái xe, CCCD) và thông tin liên hệ cá nhân
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className={`approval-badge ${approvalStatus === 'APPROVED'
                ? 'approval-badge--approved'
                : approvalStatus === 'REJECTED'
                  ? 'approval-badge--rejected'
                  : 'approval-badge--pending'
              }`}
            style={{
              ...(approvalStatus === 'REJECTED' && {
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--accent-red)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
              }),
            }}
          >
            {approvalStatus === 'APPROVED' ? (
              <>
                <HiOutlineCheckCircle /> Tài khoản đã duyệt
              </>
            ) : approvalStatus === 'REJECTED' ? (
              <>
                <HiOutlineExclamationCircle /> Hồ sơ bị từ chối
              </>
            ) : isAppealed ? (
              <>
                <HiOutlineExclamationCircle /> Đang chờ xét duyệt lại khiếu nại
              </>
            ) : (
              <>
                <HiOutlineExclamationCircle /> Đang chờ duyệt hồ sơ
              </>
            )}
          </span>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 12,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: '#F5A623',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            ★ {Number(rating).toFixed(1)} / 5.0
          </span>
        </div>
      </div>

      {/* ─── THÔNG BÁO KHÓA TÀI KHOẢN & FORM KHIẾU NẠI MỞ KHÓA (Khi bị BLOCKED) ─── */}
      {approvalStatus === 'BLOCKED' && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 14,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 4px 20px rgba(239,68,68,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-red)' }}>
            <HiOutlineExclamationCircle size={28} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Tài Khoản Tài Xế Của Bạn Đã Bị Khóa</h3>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 10,
              borderLeft: '4px solid var(--accent-red)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Lý do khóa tài khoản từ Admin:</strong>
            <p style={{ color: 'var(--accent-red)', marginTop: 4, fontWeight: 600, fontSize: '0.95rem' }}>
              {rejectionReason || 'Vi phạm điều khoản quy chế hoạt động tài xế'}
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
              placeholder="Nhập nội dung giải trình gửi Admin mở lại tài khoản..."
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

      {/* ─── THÔNG BÁO TỪ CHỐI & FORM KHIẾU NẠI (Khi bị REJECTED) ─── */}
      {approvalStatus === 'REJECTED' && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 14,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 4px 20px rgba(239,68,68,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-red)' }}>
            <HiOutlineExclamationCircle size={26} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Hồ Sơ Đăng Ký Của Bạn Đã Bị Từ Chối</h3>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 10,
              borderLeft: '4px solid var(--accent-red)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Lý do từ chối từ Admin:</strong>
            <p style={{ color: 'var(--accent-red)', marginTop: 4, fontWeight: 600, fontSize: '0.95rem' }}>
              {rejectionReason || 'Thông tin giấy tờ chưa đủ điều kiện xác thực'}
            </p>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Vui lòng bổ sung/tải lại ảnh chụp Bằng lái xe & CCCD sắc nét hơn bên dưới, cập nhật lại thông tin cá nhân và điền nội dung khiếu nại để gửi tới Admin xem xét duyệt lại.
          </p>

          <div className="input-group">
            <label className="input-group__label">Lý do khiếu nại / Ghi chú bổ sung gửi Admin:</label>
            <textarea
              className="location-input"
              rows={3}
              placeholder="Nhập nội dung khiếu nại (VD: Em đã chụp lại ảnh CCCD và bằng lái mới sắc nét hơn...)"
              value={appealNote}
              onChange={(e) => setAppealNote(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn--primary"
            style={{
              background: 'var(--gradient-blue)',
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
            {submittingAppeal ? 'Đang gửi khiếu nại...' : 'Gửi Khiếu Nại & Yêu Cầu Xét Duyệt Lại 🚀'}
          </button>
        </div>
      )}

      {/* ─── KHUNG TRẠNG THÁI ĐÃ GỬI KHIẾU NẠI (Khi isAppealed === true) ─── */}
      {approvalStatus === 'PENDING' && isAppealed && (
        <div
          style={{
            background: 'rgba(245, 166, 35, 0.1)',
            border: '1px solid rgba(245, 166, 35, 0.35)',
            borderRadius: 14,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '0 4px 20px rgba(245,166,35,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#F5A623' }}>
            <HiOutlineExclamationCircle size={26} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Đã Gửi Khiếu Nại — Đang Chờ Admin Xem Xét Lại</h3>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 10,
              borderLeft: '4px solid #F5A623',
            }}
          >
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Nội dung khiếu nại đã gửi:</strong>
            <p style={{ color: 'var(--text-primary)', marginTop: 4, fontStyle: 'italic', fontSize: '0.925rem' }}>
              "{appealNote || 'Tài xế đã cập nhật lại giấy tờ và yêu cầu xét duyệt lại.'}"
            </p>
          </div>

          <div className="input-group">
            <label className="input-group__label">Cập nhật bổ sung nội dung giải trình (nếu cần):</label>
            <textarea
              className="location-input"
              rows={2}
              placeholder="Cập nhật thêm ghi chú giải trình cho Admin..."
              value={appealNote}
              onChange={(e) => setAppealNote(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn--secondary"
            style={{
              fontWeight: 700,
              padding: '0.75rem',
              fontSize: '0.9rem',
            }}
            disabled={submittingAppeal}
            onClick={handleAppealSubmit}
          >
            {submittingAppeal ? 'Đang cập nhật...' : 'Cập Nhật Nội Dung Khiếu Nại 🔄'}
          </button>
        </div>
      )}

      {/* ─── KHUNG GỬI KHIẾU NẠI / GHI CHÚ CHO ADMIN (Khi PENDING và chưa gửi khiếu nại) ─── */}
      {approvalStatus === 'PENDING' && !isAppealed && (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: 14,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '0 4px 20px rgba(59,130,246,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-blue)' }}>
            <HiOutlineExclamationCircle size={26} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Gửi Giải Trình & Yêu Cầu Xét Duyệt Hồ Sơ</h3>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {/* Tài khoản của bạn đang ở trạng thái chờ duyệt. Bạn có thể tải ảnh bằng lái / CCCD, cập nhật thông tin cá nhân và nhập nội dung giải trình gửi Admin bên dưới. */}
          </p>

          <div className="input-group">
            <label className="input-group__label">Lý do khiếu nại / Ghi chú giải trình gửi Admin:</label>
            <textarea
              className="location-input"
              rows={3}
              placeholder="Nhập nội dung giải trình / khiếu nại gửi Admin (VD: Em đã cập nhật lại ảnh bằng lái và CCCD chính chủ...)"
              value={appealNote}
              onChange={(e) => setAppealNote(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn--primary"
            style={{
              background: 'var(--gradient-blue)',
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
            {submittingAppeal ? 'Đang gửi thông tin...' : 'Gửi Thông Tin & Khiếu Nại Cho Admin Xét Duyệt 🚀'}
          </button>
        </div>
      )}

      {/* ─── KHUNG GỬI KHIẾU NẠI / GHI CHÚ CHO ADMIN (Khi ĐÃ DUYỆT - APPROVED) ─── */}
      {approvalStatus === 'APPROVED' && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 14,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-green)' }}>
            <HiOutlineCheckCircle size={26} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Tài Khoản Đã Được Phê Duyệt — Gửi Ghi Chú / Khiếu Nại Cho Admin
            </h3>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Tài khoản của bạn đang hoạt động bình thường. Nếu bạn cần thay đổi giấy tờ, cập nhật phương tiện hoặc gửi ghi chú phản ánh cho Admin, bạn có thể nhập nội dung bên dưới và gửi.
          </p>

          <div className="input-group">
            <label className="input-group__label">Lý do khiếu nại / Ghi chú gửi Admin xem xét:</label>
            <textarea
              className="location-input"
              rows={3}
              placeholder="Nhập ghi chú hoặc nội dung khiếu nại/yêu cầu tới Admin..."
              value={appealNote}
              onChange={(e) => setAppealNote(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn--primary"
            style={{
              background: 'var(--accent-green)',
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
            {submittingAppeal ? 'Đang gửi thông tin...' : 'Gửi Thông Tin & Khiếu Nại Cho Admin 🚀'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu hồ sơ tài xế...
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* ─── PHẦN 1: GIẤY TỜ BẰNG LÁI XE & CCCD ──────────── */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <h2 className="profile-section-title">
                🪪 Giấy tờ pháp lý (GPLX & CCCD)
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Tải lên ảnh chụp rõ nét 2 mặt Bằng lái xe và Căn cước công dân để Admin xác minh hồ sơ
              </p>
            </div>

            <div className="profile-documents-grid">
              {/* Thẻ Bằng lái xe */}
              <div className="document-upload-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="doc-card-title">1. Bằng Lái Xe (GPLX)</span>
                  {licenseImage ? (
                    <span className="doc-status-tag doc-status-tag--uploaded">
                      <HiOutlineCheckCircle /> Đã có ảnh
                    </span>
                  ) : (
                    <span className="doc-status-tag doc-status-tag--missing">
                      <HiOutlineExclamationCircle /> Chưa tải lên
                    </span>
                  )}
                </div>

                <div className="doc-preview-area">
                  {licenseImage ? (
                    <div className="doc-image-wrapper">
                      <img src={licenseImage} alt="Bằng lái xe" className="doc-img-preview" />
                      <button
                        type="button"
                        className="doc-zoom-btn"
                        onClick={() => setPreviewImageModal({ title: 'Bằng Lái Xe (GPLX)', src: licenseImage })}
                        title="Xem ảnh phóng to"
                      >
                        <HiOutlineEye size={18} /> Xem ảnh
                      </button>
                    </div>
                  ) : (
                    <div className="doc-empty-placeholder">
                      <HiOutlineUpload size={36} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Kéo thả hoặc bấm để chọn ảnh Bằng Lái Xe
                      </span>
                    </div>
                  )}
                </div>

                <label className="btn btn--secondary file-input-label">
                  <HiOutlineUpload /> {licenseImage ? 'Thay Đổi Ảnh Bằng Lái' : 'Tải Lên Bằng Lái Xe'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setLicenseImage, 'Bằng lái xe')}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Thẻ CCCD */}
              <div className="document-upload-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="doc-card-title">2. Căn Cước Công Dân (CCCD)</span>
                  {cccdImage ? (
                    <span className="doc-status-tag doc-status-tag--uploaded">
                      <HiOutlineCheckCircle /> Đã có ảnh
                    </span>
                  ) : (
                    <span className="doc-status-tag doc-status-tag--missing">
                      <HiOutlineExclamationCircle /> Chưa tải lên
                    </span>
                  )}
                </div>

                <div className="doc-preview-area">
                  {cccdImage ? (
                    <div className="doc-image-wrapper">
                      <img src={cccdImage} alt="CCCD" className="doc-img-preview" />
                      <button
                        type="button"
                        className="doc-zoom-btn"
                        onClick={() => setPreviewImageModal({ title: 'Căn Cước Công Dân (CCCD)', src: cccdImage })}
                        title="Xem ảnh phóng to"
                      >
                        <HiOutlineEye size={18} /> Xem ảnh
                      </button>
                    </div>
                  ) : (
                    <div className="doc-empty-placeholder">
                      <HiOutlineUpload size={36} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Kéo thả hoặc bấm để chọn ảnh CCCD 2 mặt
                      </span>
                    </div>
                  )}
                </div>

                <label className="btn btn--secondary file-input-label">
                  <HiOutlineUpload /> {cccdImage ? 'Thay Đổi Ảnh CCCD' : 'Tải Lên Ảnh CCCD'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setCccdImage, 'CCCD')}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* ─── PHẦN 2: THÔNG TIN CÁ NHÂN & THÔNG TIN TÀI KHOẢN ── */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <h2 className="profile-section-title">
                👤 Cập Nhật Thông Tin Liên Hệ & Đổi Mật Khẩu
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Thay đổi Số điện thoại, Email nhận thông báo và Mật khẩu đăng nhập tài khoản
              </p>
            </div>

            <div className="profile-form-grid">
              {/* Họ & Tên */}
              <div className="input-group">
                <label className="input-group__label">
                  <HiOutlineUser /> Họ và Tên Tài Xế:
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nhập họ và tên đầy đủ..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Số điện thoại */}
              <div className="input-group">
                <label className="input-group__label">
                  <HiOutlinePhone /> Số Điện Thoại:
                </label>
                <input
                  type="tel"
                  className="input"
                  placeholder="090x xxx xxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div className="input-group">
                <label className="input-group__label">
                  <HiOutlineMail /> Địa Chỉ Email:
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder="driver@smartfleet.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Loại xe */}
              <div className="input-group">
                <label className="input-group__label">
                  <HiOutlineTruck /> Loại Phương Tiện Vận Tải:
                </label>
                <select
                  className="location-input"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value="motorcycle">Xe Máy (Giao hàng nhanh)</option>
                  <option value="car_4">Xe Ô tô 4 chỗ</option>
                  <option value="car_7">Xe Ô tô 7 chỗ</option>
                </select>
              </div>

              {/* Biển số xe */}
              <div className="input-group">
                <label className="input-group__label">
                  🚘 Biển Số Xe Đăng Ký:
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ví dụ: 51K-888.99"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  required
                />
              </div>
            </div>

            <hr style={{ borderColor: 'var(--border-primary)', margin: '1rem 0' }} />

            {/* Đổi mật khẩu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                🔒 Đổi Mật Khẩu Đăng Nhập
              </h3>

              <div className="profile-form-grid">
                <div className="input-group">
                  <label className="input-group__label">
                    <HiOutlineLockClosed /> Mật Khẩu Mới:
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
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
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── NÚT LƯU THAY ĐỔI ──────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving}
              style={{
                padding: '0.85rem 2.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                background: 'var(--gradient-blue)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <HiOutlineSave size={20} />
              {saving ? 'Đang lưu cập nhật...' : 'Lưu Thay Đổi Thông Tin'}
            </button>
          </div>
        </form>
      )}

      {/* ─── MODAL PHÓNG TO HÌNH ẢNH GIẤY TỜ ───────────────── */}
      {previewImageModal && (
        <div className="modal-overlay" onClick={() => setPreviewImageModal(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 700, width: '90vw', padding: '1.5rem' }}
          >
            <div className="modal__header">
              <h2 className="modal__title">{previewImageModal.title}</h2>
              <button className="toast-card__close" onClick={() => setPreviewImageModal(null)}>
                &times;
              </button>
            </div>
            <div style={{ margin: '1rem 0', textAlign: 'center' }}>
              <img
                src={previewImageModal.src}
                alt={previewImageModal.title}
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 10, objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn--secondary" onClick={() => setPreviewImageModal(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverProfilePage;
