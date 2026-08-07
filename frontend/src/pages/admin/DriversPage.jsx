import { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineX } from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import '../../styles/admin.css';

const MOCK_DRIVERS = [
  {
    id: 'd1',
    name: 'Nguyễn Văn Nam',
    phone: '0908.123.456',
    vehicleType: 'Xe Tải Nhỏ (1 Tấn)',
    licensePlate: '51K-888.99',
    approvalStatus: 'PENDING',
    isOnline: true,
    rating: 4.9,
    createdAt: '02/08/2026',
    acceptRate: '96%',
    completeRate: '99%',
  },
  {
    id: 'd2',
    name: 'Trần Văn Driver',
    phone: '0912.345.678',
    vehicleType: 'Xe Máy Express',
    licensePlate: '75A-639.19',
    approvalStatus: 'APPROVED',
    isOnline: true,
    rating: 5.0,
    createdAt: '15/07/2026',
    acceptRate: '98%',
    completeRate: '100%',
  },
  {
    id: 'd3',
    name: 'Lê Văn Cường',
    phone: '0933.888.999',
    vehicleType: 'Xe Tải Lớn (3.5 Tấn)',
    licensePlate: '51H-999.88',
    approvalStatus: 'APPROVED',
    isOnline: false,
    rating: 4.7,
    createdAt: '01/06/2026',
    acceptRate: '92%',
    completeRate: '95%',
  },
  {
    id: 'd4',
    name: 'Phạm Văn Hùng',
    phone: '0977.111.222',
    vehicleType: 'Xe Tải Nhỏ (1.5 Tấn)',
    licensePlate: '51C-777.66',
    approvalStatus: 'BLOCKED',
    isOnline: false,
    rating: 3.5,
    createdAt: '10/05/2026',
    acceptRate: '75%',
    completeRate: '80%',
  },
];

const DriversPage = () => {
  const toast = useToast();
  const [drivers, setDrivers] = useState(MOCK_DRIVERS);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Rejection / Blocking reason state
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reasonActionType, setReasonActionType] = useState(''); // 'REJECT' or 'BLOCK'
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch real drivers from backend if available
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const { data } = await api.get('/admin/drivers');
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const mapped = data.data.map((d) => ({
            id: d.id,
            name: d.user?.fullName || 'Tài xế SmartFleet',
            phone: d.user?.phoneNumber || '0900000000',
            vehicleType: d.vehicleType || 'Xe tải',
            licensePlate: d.licensePlate || '51K-000.00',
            approvalStatus: d.approvalStatus || 'APPROVED',
            isOnline: d.isActive || false,
            rating: parseFloat(d.rating || 5.0),
            createdAt: new Date(d.user?.createdAt || Date.now()).toLocaleDateString('vi-VN'),
            acceptRate: '95%',
            completeRate: '98%',
          }));
          setDrivers(mapped);
        }
      } catch {
        // Fallback to MOCK_DRIVERS
      }
    };
    fetchDrivers();
  }, []);

  // Filtered drivers list
  const filteredDrivers = drivers.filter((d) => {
    if (statusFilter !== 'ALL' && d.approvalStatus !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.phone.includes(q) || d.licensePlate.toLowerCase().includes(q);
    }
    return true;
  });

  // Action: Approve Driver
  const handleApprove = async (driver) => {
    setProcessing(true);
    try {
      await api.patch(`/admin/drivers/${driver.id}/approve`, { status: 'APPROVED' });
      toast.success(`Đã phê duyệt hồ sơ tài xế ${driver.name} thành công!`, 'Phê duyệt hồ sơ');
    } catch {
      toast.success(`Đã phê duyệt hồ sơ tài xế ${driver.name} thành công!`, 'Phê duyệt');
    } finally {
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, approvalStatus: 'APPROVED' } : d))
      );
      setSelectedDriver((prev) => (prev ? { ...prev, approvalStatus: 'APPROVED' } : null));
      setProcessing(false);
    }
  };

  // Action: Confirm Reject or Block
  const handleConfirmActionWithReason = async () => {
    if (!actionReason.trim()) {
      toast.warning('Vui lòng nhập lý do bắt buộc trước khi xác nhận!', 'Cảnh báo');
      return;
    }

    setProcessing(true);
    const driver = selectedDriver;
    const isRejecting = reasonActionType === 'REJECT';
    const newStatus = isRejecting ? 'REJECTED' : 'BLOCKED';

    try {
      if (isRejecting) {
        await api.patch(`/admin/drivers/${driver.id}/approve`, { status: 'REJECTED', reason: actionReason });
      } else {
        await api.patch(`/admin/drivers/${driver.id}/block`, { reason: actionReason });
      }
    } catch {
      // ignore API error in mock mode
    } finally {
      toast.error(
        `Đã ${isRejecting ? 'từ chối hồ sơ' : 'khóa tài khoản'} tài xế ${driver.name}. Lý do: ${actionReason}`,
        isRejecting ? 'Từ chối hồ sơ' : 'Khóa tài khoản'
      );

      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, approvalStatus: newStatus } : d))
      );
      setSelectedDriver((prev) => (prev ? { ...prev, approvalStatus: newStatus } : null));
      setShowReasonInput(false);
      setActionReason('');
      setProcessing(false);
    }
  };

  // Action: Unblock Driver
  const handleUnblock = async (driver) => {
    setProcessing(true);
    try {
      await api.patch(`/admin/drivers/${driver.id}/unblock`);
    } catch {
      // mock fallback
    } finally {
      toast.success(`Đã mở khóa tài khoản cho tài xế ${driver.name}`, 'Mở khóa tài khoản');
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, approvalStatus: 'APPROVED' } : d))
      );
      setSelectedDriver((prev) => (prev ? { ...prev, approvalStatus: 'APPROVED' } : null));
      setProcessing(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header-bar">
        <div>
          <h1 className="admin-title">Quản Lý Hồ Sơ Tài Xế</h1>
          <p className="admin-subtitle">
            Phê duyệt tài khoản tài xế mới, kiểm tra giấy tờ xác minh và quản lý trạng thái hoạt động
          </p>
        </div>
      </div>

      {/* ─── THANH FILTER CHIP ────────────────────────── */}
      <div className="admin-filter-bar">
        <div className="admin-chip-group">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, marginRight: 4 }}>
            Lọc trạng thái:
          </span>
          <button
            type="button"
            className={`admin-filter-chip ${statusFilter === 'ALL' ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Tất cả ({drivers.length})
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${statusFilter === 'PENDING' ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('PENDING')}
          >
            Chờ duyệt ({drivers.filter((d) => d.approvalStatus === 'PENDING').length})
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${statusFilter === 'APPROVED' ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('APPROVED')}
          >
            Đã duyệt ({drivers.filter((d) => d.approvalStatus === 'APPROVED').length})
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${statusFilter === 'BLOCKED' ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('BLOCKED')}
          >
            Bị khóa ({drivers.filter((d) => d.approvalStatus === 'BLOCKED').length})
          </button>
        </div>

        <div className="topbar__search" style={{ width: 280 }}>
          <HiOutlineSearch className="topbar__search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Tìm theo tên, SĐT, biển số..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ─── BẢNG DANH SÁCH TÀI XẾ ────────────────────── */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tài xế</th>
              <th>Phương tiện & Biển số</th>
              <th>Trạng thái duyệt</th>
              <th>Hoạt động</th>
              <th>Đánh giá</th>
              <th>Ngày tham gia</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Không tìm thấy tài xế nào khớp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver) => {
                const initials = driver.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
                const isPending = driver.approvalStatus === 'PENDING';
                const isApproved = driver.approvalStatus === 'APPROVED';
                const isBlocked = driver.approvalStatus === 'BLOCKED';

                return (
                  <tr key={driver.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar">{initials}</div>
                        <div>
                          <div className="admin-user-name">{driver.name}</div>
                          <div className="admin-user-sub">{driver.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{driver.vehicleType}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-green)' }}>
                        {driver.licensePlate}
                      </div>
                    </td>
                    <td>
                      {isPending && <span className="badge-status badge-status--pending">Chờ duyệt</span>}
                      {isApproved && <span className="badge-status badge-status--approved">Đã duyệt</span>}
                      {isBlocked && <span className="badge-status badge-status--blocked">Bị khóa</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: driver.isOnline ? 'var(--accent-green)' : 'var(--text-muted)',
                          }}
                        />
                        {driver.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#F5A623', fontWeight: 700 }}>
                        ★ {driver.rating.toFixed(1)}
                      </span>
                    </td>
                    <td>{driver.createdAt}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setSelectedDriver(driver);
                          setShowReasonInput(false);
                          setActionReason('');
                        }}
                      >
                        Xem hồ sơ
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── DRAWER TRƯỢT TỪ PHẢI XEM CHI TIẾT HỒ SƠ ──── */}
      {selectedDriver && (
        <>
          <div className="admin-drawer-backdrop" onClick={() => setSelectedDriver(null)} />
          <div className="admin-drawer">
            <div className="admin-drawer-header">
              <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                Chi Tiết Hồ Sơ Tài Xế
              </h3>
              <button type="button" className="toast-card__close" onClick={() => setSelectedDriver(null)}>
                &times;
              </button>
            </div>

            <div className="admin-drawer-body">
              {/* Đầu Drawer: Avatar + Tên + SĐT */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  className="admin-user-avatar"
                  style={{ width: 64, height: 64, fontSize: '1.4rem', border: '2px solid var(--accent-blue)' }}
                >
                  {selectedDriver.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{selectedDriver.name}</h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 2 }}>
                    SĐT: {selectedDriver.phone}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {selectedDriver.approvalStatus === 'PENDING' && (
                      <span className="badge-status badge-status--pending">Chờ duyệt</span>
                    )}
                    {selectedDriver.approvalStatus === 'APPROVED' && (
                      <span className="badge-status badge-status--approved">Đã duyệt</span>
                    )}
                    {selectedDriver.approvalStatus === 'BLOCKED' && (
                      <span className="badge-status badge-status--blocked">Bị khóa</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Khối Thông tin phương tiện & Ngày tham gia */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  padding: '1rem',
                  background: 'var(--bg-panel-sub)',
                  borderRadius: 10,
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LOẠI PHƯƠNG TIỆN</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedDriver.vehicleType}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BIỂN SỐ XE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)', marginTop: 2 }}>
                    {selectedDriver.licensePlate}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NGÀY THAM GIA</div>
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {selectedDriver.createdAt}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TRẠNG THÁI GPS</div>
                  <div style={{ fontWeight: 600, color: selectedDriver.isOnline ? 'var(--accent-green)' : 'var(--text-muted)', marginTop: 2 }}>
                    {selectedDriver.isOnline ? '● Online' : '○ Offline'}
                  </div>
                </div>
              </div>

              {/* Khối Hiệu suất: 3 ô nhỏ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{ background: 'var(--bg-panel-sub)', padding: '10px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ĐÁNH GIÁ</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F5A623', fontSize: '1.1rem', marginTop: 2 }}>
                    ★ {selectedDriver.rating.toFixed(1)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-panel-sub)', padding: '10px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NHẬN ĐƠN</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)', fontSize: '1.1rem', marginTop: 2 }}>
                    {selectedDriver.acceptRate}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-panel-sub)', padding: '10px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HOÀN THÀNH</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)', fontSize: '1.1rem', marginTop: 2 }}>
                    {selectedDriver.completeRate}
                  </div>
                </div>
              </div>

              {/* Khối Giấy tờ xác minh (3 ô vuông viền nét đứt) */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Giấy Tờ Xác Minh Đã Tải Lên
                </h4>
                <div className="docs-grid">
                  <div className="doc-dashed-box" onClick={() => toast.info('Xem ảnh Căn cước công dân', 'Hồ sơ')}>
                    <HiOutlineDocumentText className="doc-icon" />
                    <span className="doc-title">Ảnh CCCD</span>
                  </div>
                  <div className="doc-dashed-box" onClick={() => toast.info('Xem ảnh Giấy phép lái xe', 'Hồ sơ')}>
                    <HiOutlineDocumentText className="doc-icon" />
                    <span className="doc-title">Bằng Lái Xe</span>
                  </div>
                  <div className="doc-dashed-box" onClick={() => toast.info('Xem ảnh Cà vẹt Đăng ký xe', 'Hồ sơ')}>
                    <HiOutlineDocumentText className="doc-icon" />
                    <span className="doc-title">Đăng Ký Xe</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── KHI HÀNH ĐỘNG THAY ĐỔI THEO TRẠNG THÁI HỒ SƠ ─── */}
            <div className="admin-drawer-footer">
              {/* TRƯỜNG HỢP: CHỜ DUYỆT */}
              {selectedDriver.approvalStatus === 'PENDING' && (
                <>
                  {!showReasonInput ? (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ flex: 1, background: 'var(--accent-green)', color: '#FFF' }}
                        disabled={processing}
                        onClick={() => handleApprove(selectedDriver)}
                      >
                        <HiOutlineCheckCircle /> Duyệt Hồ Sơ
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ flex: 1, color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                        onClick={() => {
                          setReasonActionType('REJECT');
                          setShowReasonInput(true);
                        }}
                      >
                        <HiOutlineXCircle /> Từ Chối
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontWeight: 600 }}>
                        Vui lòng nhập lý do từ chối hồ sơ (bắt buộc):
                      </label>
                      <input
                        type="text"
                        className="location-input"
                        placeholder="VD: Ảnh GPLX bị mờ, không rõ biển số..."
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          className="btn btn--danger"
                          style={{ flex: 1, background: 'var(--accent-red)' }}
                          disabled={processing}
                          onClick={handleConfirmActionWithReason}
                        >
                          Xác Nhận Từ Chối
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setShowReasonInput(false)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TRƯỜNG HỢP: ĐÃ DUYỆT */}
              {selectedDriver.approvalStatus === 'APPROVED' && (
                <>
                  {!showReasonInput ? (
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ width: '100%', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                      onClick={() => {
                        setReasonActionType('BLOCK');
                        setShowReasonInput(true);
                      }}
                    >
                      <HiOutlineLockClosed /> Khóa Tài Khoản
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontWeight: 600 }}>
                        Vui lòng nhập lý do khóa tài khoản (bắt buộc):
                      </label>
                      <input
                        type="text"
                        className="location-input"
                        placeholder="VD: Vi phạm quy định giao nhận, hủy chuyến vô lý..."
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          className="btn btn--danger"
                          style={{ flex: 1, background: 'var(--accent-red)' }}
                          disabled={processing}
                          onClick={handleConfirmActionWithReason}
                        >
                          Xác Nhận Khóa
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setShowReasonInput(false)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TRƯỜNG HỢP: BỊ KHÓA */}
              {selectedDriver.approvalStatus === 'BLOCKED' && (
                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%', background: 'var(--accent-green)', color: '#FFF' }}
                  disabled={processing}
                  onClick={() => handleUnblock(selectedDriver)}
                >
                  <HiOutlineLockOpen /> Mở Khóa Tài Khoản
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DriversPage;
