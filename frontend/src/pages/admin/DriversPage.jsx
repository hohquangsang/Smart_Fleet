import { useState, useEffect, useContext } from 'react';
import { HiOutlineSearch, HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineX } from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import '../../styles/admin.css';

const DriversPage = () => {
  const toast = useToast();
  const socket = useContext(SocketContext);
  const [drivers, setDrivers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // Rejection / Blocking reason state
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reasonActionType, setReasonActionType] = useState(''); // 'REJECT' or 'BLOCK'
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch real drivers from backend
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const { data } = await api.get('/admin/drivers');
        const driverList = data?.data?.drivers || (Array.isArray(data?.data) ? data.data : []);
        if (Array.isArray(driverList)) {
          const mapped = driverList.map((d) => ({
            id: d.id,
            userId: d.userId,
            name: d.user?.fullName || 'Tài xế SmartFleet',
            phone: d.user?.phoneNumber || '—',
            vehicleType: d.vehicleType || 'Xe máy',
            licensePlate: d.licensePlate || '—',
            approvalStatus: d.approvalStatus || 'PENDING',
            isOnline: Boolean(d.isOnline || d.isActive),
            status: d.isOnline || d.isActive ? 'ONLINE' : 'OFFLINE',
            rating: parseFloat(d.rating || 5.0),
            createdAt: d.user?.createdAt ? new Date(d.user.createdAt).toLocaleDateString('vi-VN') : '—',
            acceptRate: '100%',
            completeRate: '100%',
            licenseImage: d.licenseImage || null,
            cccdImage: d.cccdImage || null,
            rejectionReason: d.rejectionReason || null,
            rejectionCount: d.rejectionCount || 0,
            isAppealed: Boolean(d.isAppealed),
            appealNote: d.appealNote || null,
          }));
          setDrivers(mapped);
        }
      } catch {
        setDrivers([]);
      }
    };
    fetchDrivers();
  }, []);

  // Listen to admin:new-driver-registered & admin:driver-appealed real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewDriver = (d) => {
      console.log('🚘 [Admin] admin:new-driver-registered received:', d);
      toast.info(
        `Tài xế mới ${d.fullName || ''} (${d.licensePlate || ''}) vừa đăng ký và đang chờ duyệt!`,
        '📋 Hồ sơ tài xế mới'
      );

      const newDriverObj = {
        id: d.id,
        name: d.fullName || 'Tài xế mới',
        phone: d.phoneNumber || '0900000000',
        vehicleType: d.vehicleType || 'Xe máy',
        licensePlate: d.licensePlate || 'Chưa cập nhật',
        approvalStatus: 'PENDING',
        isOnline: false,
        rating: 5.0,
        createdAt: new Date(d.createdAt || Date.now()).toLocaleDateString('vi-VN'),
        acceptRate: '100%',
        completeRate: '100%',
        licenseImage: null,
        cccdImage: null,
        rejectionReason: null,
        rejectionCount: 0,
        isAppealed: false,
        appealNote: null,
      };

      setDrivers((prev) => [newDriverObj, ...prev.filter((item) => item.id !== d.id)]);
    };

    const handleDriverAppealed = (d) => {
      console.log('📢 [Admin] admin:driver-appealed received:', d);
      toast.info(
        `Tài xế ${d.driverName || ''} vừa gửi khiếu nại/giải trình: "${d.appealNote || ''}"`,
        '📢 Khiếu Nại Mới'
      );

      setDrivers((prev) => {
        const exists = prev.some((item) => item.id === d.driverId);
        if (exists) {
          return prev.map((item) => {
            if (item.id === d.driverId) {
              return {
                ...item,
                approvalStatus: d.approvalStatus || item.approvalStatus,
                isAppealed: true,
                appealNote: d.appealNote,
                rejectionReason: d.rejectionReason || item.rejectionReason,
                rejectionCount: d.rejectionCount || item.rejectionCount,
                licenseImage: d.licenseImage || item.licenseImage,
                cccdImage: d.cccdImage || item.cccdImage,
                vehicleType: d.vehicleType || item.vehicleType,
                licensePlate: d.licensePlate || item.licensePlate,
                name: d.driverName || item.name,
                phone: d.phoneNumber || item.phone,
              };
            }
            return item;
          });
        }
        return prev;
      });

      setSelectedDriver((prev) => {
        if (prev && prev.id === d.driverId) {
          return {
            ...prev,
            approvalStatus: d.approvalStatus || prev.approvalStatus,
            isAppealed: true,
            appealNote: d.appealNote,
            rejectionReason: d.rejectionReason || prev.rejectionReason,
            rejectionCount: d.rejectionCount || prev.rejectionCount,
            licenseImage: d.licenseImage || prev.licenseImage,
            cccdImage: d.cccdImage || prev.cccdImage,
          };
        }
        return prev;
      });
    };

    socket.on('admin:new-driver-registered', handleNewDriver);
    socket.on('admin:driver-appealed', handleDriverAppealed);

    return () => {
      socket.off('admin:new-driver-registered', handleNewDriver);
      socket.off('admin:driver-appealed', handleDriverAppealed);
    };
  }, [socket, toast]);

  // Filtered drivers list
  const filteredDrivers = drivers.filter((d) => {
    if (statusFilter === 'APPEALED') {
      if (!d.isAppealed) return false;
    } else if (statusFilter !== 'ALL' && d.approvalStatus !== statusFilter) {
      return false;
    }
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
      // toast.success(`Đã phê duyệt hồ sơ tài xế ${driver.name} thành công!`, 'Phê duyệt');
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
        const { data } = await api.patch(`/admin/drivers/${driver.id}/approve`, {
          action: 'reject',
          status: 'REJECTED',
          rejectionReason: actionReason.trim(),
          reason: actionReason.trim(),
        });

        const isDeleted = data?.data?.driver?.deleted;
        if (isDeleted) {
          toast.error(`Tài xế ${driver.name} đã bị từ chối lần 2 và tài khoản đã được xóa khỏi hệ thống!`, 'Xóa tài khoản vĩnh viễn');
          setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
          setSelectedDriver(null);
          setShowReasonInput(false);
          setActionReason('');
          setProcessing(false);
          return;
        }
      } else {
        await api.patch(`/admin/drivers/${driver.id}/block`, { reason: actionReason.trim() });
      }

      toast.error(
        `Đã ${isRejecting ? 'từ chối hồ sơ' : 'khóa tài khoản'} tài xế ${driver.name}. Lý do: ${actionReason.trim()}`,
        isRejecting ? 'Từ chối hồ sơ' : 'Khóa tài khoản'
      );

      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, approvalStatus: newStatus } : d))
      );
      setSelectedDriver((prev) => (prev ? { ...prev, approvalStatus: newStatus } : null));
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể thực hiện thao tác từ chối tài xế';
      toast.error(msg, 'Lỗi thao tác Admin');
    } finally {
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

  // Action: Resolve Driver Appeal/Complaint
  const handleResolveAppeal = async (driver) => {
    setProcessing(true);
    try {
      await api.patch(`/admin/drivers/${driver.id}/resolve-appeal`);
      toast.success(`Đã xác nhận xử lý khiếu nại của tài xế ${driver.name}`, 'Xử lý khiếu nại');
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, isAppealed: false, appealNote: null } : d))
      );
      setSelectedDriver((prev) => (prev ? { ...prev, isAppealed: false, appealNote: null } : null));
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể xử lý khiếu nại tài xế';
      toast.error(msg, 'Lỗi thao tác Admin');
    } finally {
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
          <button
            type="button"
            className={`admin-filter-chip ${statusFilter === 'APPEALED' ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('APPEALED')}
            style={{
              borderColor: statusFilter === 'APPEALED' ? '#F5A623' : undefined,
              color: statusFilter === 'APPEALED' ? '#F5A623' : undefined,
            }}
          >
            ⚠️ Có khiếu nại ({drivers.filter((d) => d.isAppealed).length})
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
                      {isPending && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className="badge-status badge-status--pending">Chờ duyệt</span>
                          {driver.isAppealed && (
                            <div
                              className="appeal-badge appeal-badge--pending"
                              title={`Nội dung khiếu nại: "${driver.appealNote || ''}"`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDriver(driver);
                                setShowReasonInput(false);
                                setActionReason('');
                              }}
                            >
                              <span className="appeal-badge__dot" />
                              <span>📢 Đã gửi khiếu nại</span>
                            </div>
                          )}
                        </div>
                      )}
                      {isApproved && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className="badge-status badge-status--approved">Đã duyệt</span>
                          {driver.isAppealed && (
                            <div
                              className="appeal-badge appeal-badge--approved"
                              title={`Nội dung khiếu nại từ tài xế: "${driver.appealNote || ''}"`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDriver(driver);
                                setShowReasonInput(false);
                                setActionReason('');
                              }}
                            >
                              <span className="appeal-badge__dot" />
                              <span>⚠️ Có khiếu nại</span>
                            </div>
                          )}
                        </div>
                      )}
                      {isBlocked && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className="badge-status badge-status--blocked">Bị khóa</span>
                          {driver.isAppealed && (
                            <div
                              className="appeal-badge appeal-badge--blocked"
                              title={`Nội dung xin mở khóa: "${driver.appealNote || ''}"`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDriver(driver);
                                setShowReasonInput(false);
                                setActionReason('');
                              }}
                            >
                              <span className="appeal-badge__dot" />
                              <span>📢 Yêu cầu mở khóa</span>
                            </div>
                          )}
                        </div>
                      )}
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
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    {selectedDriver.approvalStatus === 'PENDING' && (
                      <span className="badge-status badge-status--pending">Chờ duyệt</span>
                    )}
                    {selectedDriver.approvalStatus === 'APPROVED' && (
                      <span className="badge-status badge-status--approved">Đã duyệt</span>
                    )}
                    {selectedDriver.approvalStatus === 'BLOCKED' && (
                      <span className="badge-status badge-status--blocked">Bị khóa</span>
                    )}
                    {selectedDriver.isAppealed && (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(245,166,35,0.2)', color: '#F5A623', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                        📢 Khiếu nại
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* KHỐI NỘI DUNG KHIẾU NẠI / GIẢI TRÌNH TỪ DRIVER */}
              {(selectedDriver.isAppealed || selectedDriver.appealNote) && (
                <div
                  style={{
                    background: 'rgba(245, 166, 35, 0.12)',
                    border: '1px solid rgba(245, 166, 35, 0.4)',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#F5A623', fontSize: '0.85rem' }}>
                    📢 NỘI DUNG KHIẾU NẠI / GIẢI TRÌNH TỪ TÀI XẾ:
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginTop: 4, fontStyle: 'italic', fontSize: '0.9rem' }}>
                    "{selectedDriver.appealNote || 'Tài xế đã cập nhật thông tin và đề nghị xem xét lại.'}"
                  </div>
                </div>
              )}

              {/* KHỐI LÝ DO TỪ CHỐI LẦN TRƯỚC */}
              {selectedDriver.rejectionReason && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: '0.8rem' }}>
                    ❌ LÝ DO TỪ CHỐI LẦN TRƯỚC (Lần {selectedDriver.rejectionCount || 1}):
                  </div>
                  <div style={{ color: 'var(--accent-red)', marginTop: 2, fontSize: '0.85rem' }}>
                    {selectedDriver.rejectionReason}
                  </div>
                </div>
              )}

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

              {/* Khối Giấy tờ xác minh (Hình ảnh thực tế từ Driver) */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Giấy Tờ Xác Minh Đã Tải Lên
                </h4>
                <div className="docs-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    className="doc-dashed-box"
                    style={{
                      height: 120,
                      padding: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: selectedDriver.cccdImage ? 'pointer' : 'default',
                      borderStyle: selectedDriver.cccdImage ? 'solid' : 'dashed',
                      borderColor: selectedDriver.cccdImage ? 'var(--accent-blue)' : 'var(--border-primary)',
                    }}
                    onClick={() => {
                      if (selectedDriver.cccdImage) {
                        setPreviewImageModal({ title: `Ảnh CCCD - ${selectedDriver.name}`, src: selectedDriver.cccdImage });
                      } else {
                        toast.warning('Tài xế chưa tải lên ảnh CCCD');
                      }
                    }}
                  >
                    {selectedDriver.cccdImage ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img src={selectedDriver.cccdImage} alt="CCCD" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                        <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4 }}>
                          🔍 Phóng to
                        </span>
                      </div>
                    ) : (
                      <>
                        <HiOutlineDocumentText className="doc-icon" />
                        <span className="doc-title">Chưa có ảnh CCCD</span>
                      </>
                    )}
                  </div>

                  <div
                    className="doc-dashed-box"
                    style={{
                      height: 120,
                      padding: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: selectedDriver.licenseImage ? 'pointer' : 'default',
                      borderStyle: selectedDriver.licenseImage ? 'solid' : 'dashed',
                      borderColor: selectedDriver.licenseImage ? 'var(--accent-blue)' : 'var(--border-primary)',
                    }}
                    onClick={() => {
                      if (selectedDriver.licenseImage) {
                        setPreviewImageModal({ title: `Ảnh GPLX - ${selectedDriver.name}`, src: selectedDriver.licenseImage });
                      } else {
                        toast.warning('Tài xế chưa tải lên ảnh Bằng Lái Xe');
                      }
                    }}
                  >
                    {selectedDriver.licenseImage ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img src={selectedDriver.licenseImage} alt="GPLX" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                        <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4 }}>
                          🔍 Phóng to
                        </span>
                      </div>
                    ) : (
                      <>
                        <HiOutlineDocumentText className="doc-icon" />
                        <span className="doc-title">Chưa có Bằng Lái Xe</span>
                      </>
                    )}
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
                    <div style={{ display: 'flex', gap: 12 }}>
                      {selectedDriver.isAppealed && (
                        <button
                          type="button"
                          className="btn"
                          style={{ flex: 1, background: 'var(--accent-green)', color: '#FFF' }}
                          disabled={processing}
                          onClick={() => handleResolveAppeal(selectedDriver)}
                        >
                          <HiOutlineCheckCircle /> Đã Đọc / Xử Lý Khiếu Nại
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ flex: selectedDriver.isAppealed ? 1 : undefined, width: selectedDriver.isAppealed ? undefined : '100%', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                        onClick={() => {
                          setReasonActionType('BLOCK');
                          setShowReasonInput(true);
                        }}
                      >
                        <HiOutlineLockClosed /> Khóa Tài Khoản
                      </button>
                    </div>
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

      {/* ─── MODAL PHÓNG TO HÌNH ẢNH GIẤY TỜ ───────────────── */}
      {previewImageModal && (
        <div className="modal-overlay" onClick={() => setPreviewImageModal(null)} style={{ zIndex: 9999 }}>
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

export default DriversPage;
