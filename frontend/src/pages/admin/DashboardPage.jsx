import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineUsers,
  HiOutlineTruck,
  HiOutlineExclamationCircle,
  HiOutlineCurrencyDollar,
  HiOutlineArrowRight,
  HiOutlineX,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
} from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import '../../styles/admin.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const socket = useContext(SocketContext);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState('orders'); // 'orders' | 'revenue'
  const [hoverPoint, setHoverPoint] = useState(null);

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    driverId: null,
    driverName: '',
    reason: '',
  });

  const [stats, setStats] = useState({
    totalDrivers: 7,
    driversWeekDiff: 2,
    pendingDrivers: 2,
    totalUsers: 3,
    usersWeekDiff: 1,
    completedToday: 0,
    revenueToday: 0,
  });

  const [recentOrders, setRecentOrders] = useState([
    {
      id: 'ord-1',
      code: '#SF-1042',
      customerName: 'Nguyễn Văn A',
      customerInitials: 'NA',
      driverName: 'Trần Văn B',
      status: 'IN_TRANSIT',
      statusLabel: 'Đang giao',
      badgeClass: 'amber',
      time: '14:22',
    },
    {
      id: 'ord-2',
      code: '#SF-1041',
      customerName: 'Lê Thị C',
      customerInitials: 'LC',
      driverName: 'Phạm Văn D',
      status: 'DELIVERED',
      statusLabel: 'Hoàn thành',
      badgeClass: 'green',
      time: '13:47',
    },
    {
      id: 'ord-3',
      code: '#SF-1040',
      customerName: 'Hoàng Thị K',
      customerInitials: 'HK',
      driverName: '—',
      status: 'CANCELLED',
      statusLabel: 'Đã huỷ',
      badgeClass: 'red',
      time: '12:05',
    },
    {
      id: 'ord-4',
      code: '#SF-1039',
      customerName: 'Vũ Minh',
      customerInitials: 'VM',
      driverName: 'Đặng Thị E',
      status: 'DELIVERED',
      statusLabel: 'Hoàn thành',
      badgeClass: 'green',
      time: '11:30',
    },
  ]);

  const [pendingDriversList, setPendingDriversList] = useState([
    {
      id: 'drv-1',
      fullName: 'Nguyễn Văn A',
      initials: 'NA',
      vehicleText: 'Đăng ký tài xế xe máy · GPLX A1',
    },
    {
      id: 'drv-2',
      fullName: 'Trần Thị B',
      initials: 'TB',
      vehicleText: 'Đăng ký tài xế ô tô 4 chỗ · GPLX B2',
    },
  ]);

  const [chartDays, setChartDays] = useState([
    { dayName: 'T2', orders: 12, revenue: 450000 },
    { dayName: 'T3', orders: 18, revenue: 780000 },
    { dayName: 'T4', orders: 15, revenue: 620000 },
    { dayName: 'T5', orders: 25, revenue: 1100000 },
    { dayName: 'T6', orders: 22, revenue: 950000 },
    { dayName: 'T7', orders: 30, revenue: 1450000 },
    { dayName: 'CN', orders: 28, revenue: 1300000 },
  ]);

  const [driverLocations, setDriverLocations] = useState([
    { id: 'loc-1', name: 'Tài xế 1', x: 35, y: 32, status: 'AVAILABLE' },
    { id: 'loc-2', name: 'Tài xế 2', x: 75, y: 23, status: 'AVAILABLE' },
    { id: 'loc-3', name: 'Tài xế 3', x: 62, y: 48, status: 'DELIVERING' },
    { id: 'loc-4', name: 'Tài xế 4', x: 80, y: 65, status: 'AVAILABLE' },
    { id: 'loc-5', name: 'Tài xế 5', x: 45, y: 78, status: 'DELIVERING' },
  ]);

  // Fetch real data from backend
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/dashboard');
      if (data?.success && data?.data) {
        const d = data.data;

        if (d.stats) {
          setStats((prev) => ({
            ...prev,
            totalDrivers: d.stats.totalDrivers ?? prev.totalDrivers,
            driversWeekDiff: d.stats.driversWeekDiff ?? prev.driversWeekDiff,
            pendingDrivers: d.stats.pendingDrivers ?? prev.pendingDrivers,
            totalUsers: d.stats.totalUsers ?? prev.totalUsers,
            usersWeekDiff: d.stats.usersWeekDiff ?? prev.usersWeekDiff,
            completedToday: d.stats.completedToday ?? prev.completedToday,
            revenueToday: d.stats.revenueToday ?? prev.revenueToday,
          }));
        }

        if (Array.isArray(d.recentOrders) && d.recentOrders.length > 0) {
          setRecentOrders(d.recentOrders);
        }

        if (Array.isArray(d.pendingDriversList) && d.pendingDriversList.length > 0) {
          setPendingDriversList(d.pendingDriversList);
        }

        if (Array.isArray(d.chartDays) && d.chartDays.length > 0) {
          setChartDays(d.chartDays);
        }

        if (Array.isArray(d.driverLocations) && d.driverLocations.length > 0) {
          setDriverLocations(d.driverLocations);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen to real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewDriver = (driver) => {
      toast.info(`Tài xế mới ${driver.fullName || ''} vừa nộp hồ sơ!`, 'Hồ sơ mới 📋');
      fetchDashboardData();
    };

    const handleNewOrder = () => {
      fetchDashboardData();
    };

    const handleOrderStatusUpdate = () => {
      fetchDashboardData();
    };

    socket.on('admin:new-driver-registered', handleNewDriver);
    socket.on('admin:new-order-request', handleNewOrder);
    socket.on('admin:driver-accepted', handleOrderStatusUpdate);
    socket.on('admin:order-status-update', handleOrderStatusUpdate);

    return () => {
      socket.off('admin:new-driver-registered', handleNewDriver);
      socket.off('admin:new-order-request', handleNewOrder);
      socket.off('admin:driver-accepted', handleOrderStatusUpdate);
      socket.off('admin:order-status-update', handleOrderStatusUpdate);
    };
  }, [socket, toast]);

  // Action Handler: Approve Driver
  const handleApproveDriver = async (driverId, driverName) => {
    try {
      const res = await api.patch(`/admin/drivers/${driverId}/approve`, {
        action: 'approve',
      });

      if (res.data?.success) {
        toast.success(`Hồ sơ tài xế ${driverName} đã được phê duyệt thành công! 🎉`);
        setPendingDriversList((prev) => prev.filter((d) => d.id !== driverId));
        setStats((prev) => ({
          ...prev,
          pendingDrivers: Math.max(0, prev.pendingDrivers - 1),
          totalDrivers: prev.totalDrivers + 1,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi duyệt hồ sơ');
    }
  };

  // Action Handler: Reject Driver Modal Trigger
  const handleOpenRejectModal = (driverId, driverName) => {
    setRejectModal({
      isOpen: true,
      driverId,
      driverName,
      reason: '',
    });
  };

  // Action Handler: Confirm Rejection
  const handleConfirmRejectDriver = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason.trim()) {
      toast.error('Vui lòng nhập hoặc chọn lý do từ chối');
      return;
    }

    try {
      const res = await api.patch(`/admin/drivers/${rejectModal.driverId}/approve`, {
        action: 'reject',
        rejectionReason: rejectModal.reason.trim(),
      });

      if (res.data?.success) {
        toast.info(res.data.message || `Đã từ chối hồ sơ tài xế ${rejectModal.driverName}.`);
        setPendingDriversList((prev) => prev.filter((d) => d.id !== rejectModal.driverId));
        setStats((prev) => ({
          ...prev,
          pendingDrivers: Math.max(0, prev.pendingDrivers - 1),
        }));
        setRejectModal({ isOpen: false, driverId: null, driverName: '', reason: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi từ chối hồ sơ');
    }
  };

  // Max value for Chart scaling
  const maxChartVal = Math.max(
    ...chartDays.map((d) => (activeChartTab === 'orders' ? d.orders : d.revenue)),
    1
  );

  return (
    <div className="admin-container">
      {/* ─── ROW 1: 4 THẺ CHỈ SỐ KPI GRID ─────────────────────── */}
      <div className="kpi-grid">
        {/* Card 1: TỔNG TÀI XẾ */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__title">TỔNG TÀI XẾ</span>
            <div className="kpi-card__badge-icon kpi-card__badge-icon--blue">
              <HiOutlineTruck />
            </div>
          </div>
          <div className="kpi-card__val">{stats.totalDrivers}</div>
          <div style={{ marginTop: '4px' }}>
            <span className="trend-badge trend-badge--green">
              <HiOutlineTrendingUp /> +{stats.driversWeekDiff} so với tuần trước
            </span>
          </div>
        </div>

        {/* Card 2: CHỜ DUYỆT HỒ SƠ */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__title">CHỜ DUYỆT HỒ SƠ</span>
            <div className="kpi-card__badge-icon kpi-card__badge-icon--amber">
              <HiOutlineExclamationCircle />
            </div>
          </div>
          <div className="kpi-card__val kpi-card__val--orange">{stats.pendingDrivers}</div>
          <div className="kpi-card__sub" style={{ color: '#F5A623', fontWeight: 600, marginTop: '4px' }}>
            · {stats.pendingDrivers} hồ sơ cần duyệt
          </div>
        </div>

        {/* Card 3: TỔNG NGƯỜI DÙNG */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__title">TỔNG NGƯỜI DÙNG</span>
            <div className="kpi-card__badge-icon kpi-card__badge-icon--blue">
              <HiOutlineUsers />
            </div>
          </div>
          <div className="kpi-card__val">{stats.totalUsers}</div>
          <div style={{ marginTop: '4px' }}>
            <span className="trend-badge trend-badge--green">
              <HiOutlineTrendingUp /> +{stats.usersWeekDiff} khách hàng đăng ký
            </span>
          </div>
        </div>

        {/* Card 4: ĐƠN HOÀN THÀNH HÔM NAY */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__title">ĐƠN HOÀN THÀNH HÔM NAY</span>
            <div className="kpi-card__badge-icon kpi-card__badge-icon--green">
              <HiOutlineCurrencyDollar />
            </div>
          </div>
          <div className="kpi-card__val kpi-card__val--green">{stats.completedToday}</div>
          <div style={{ marginTop: '4px' }}>
            <span className="trend-badge trend-badge--red" style={{ background: 'transparent', padding: 0 }}>
              <HiOutlineTrendingDown /> {stats.revenueToday.toLocaleString('vi-VN')}đ doanh thu hôm nay
            </span>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: CHART 7 NGÀY & REAL-TIME DRIVER MAP ─────────── */}
      <div className="dashboard-grid-row">
        {/* Left: Đơn hàng & doanh thu 7 ngày */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">Đơn hàng & doanh thu 7 ngày</h3>
            <div className="chart-tab-group">
              <button
                className={`chart-tab-btn ${activeChartTab === 'orders' ? 'chart-tab-btn--active' : ''}`}
                onClick={() => setActiveChartTab('orders')}
              >
                Đơn hàng
              </button>
              <button
                className={`chart-tab-btn ${activeChartTab === 'revenue' ? 'chart-tab-btn--active' : ''}`}
                onClick={() => setActiveChartTab('revenue')}
              >
                Doanh thu
              </button>
            </div>
          </div>

          {/* Dynamic SVG Line/Bar Chart */}
          <div style={{ position: 'relative', width: '100%', height: '220px' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />

              {/* Build Smooth Curve Path */}
              {(() => {
                const points = chartDays.map((d, idx) => {
                  const val = activeChartTab === 'orders' ? d.orders : d.revenue;
                  const x = 35 + idx * (430 / (chartDays.length - 1 || 1));
                  const y = 170 - (val / maxChartVal) * 130;
                  return { x, y, val, label: d.dayName, date: d.date };
                });

                const dPath = points.reduce(
                  (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                  ''
                );

                const areaPath = `${dPath} L ${points[points.length - 1].x} 175 L ${points[0].x} 175 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#chartGradient)" />
                    <path d={dPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5"
                          fill="#111622"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoverPoint(p)}
                          onMouseLeave={() => setHoverPoint(null)}
                        />
                        <text
                          x={p.x}
                          y="192"
                          fill="#8a94a6"
                          fontSize="11"
                          textAnchor="middle"
                          fontWeight="500"
                        >
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>

            {/* Hover Tooltip */}
            {hoverPoint && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(hoverPoint.x / 500) * 100}%`,
                  top: `${(hoverPoint.y / 200) * 100 - 35}%`,
                  transform: 'translateX(-50%)',
                  background: '#1f283d',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  color: '#ffffff',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                {activeChartTab === 'orders'
                  ? `${hoverPoint.val} đơn hàng`
                  : `${hoverPoint.val.toLocaleString('vi-VN')} đ`}
              </div>
            )}
          </div>
        </div>

        {/* Right: Vị trí tài xế real-time */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">Vị trí tài xế real-time</h3>
            <span
              style={{
                fontSize: '0.8rem',
                color: '#33d69f',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#33d69f',
                  boxShadow: '0 0 8px #33d69f',
                  display: 'inline-block',
                }}
              />
              Trực tiếp
            </span>
          </div>

          <div className="realtime-map-box">
            <div className="map-grid-bg" />

            {/* Plotted Driver Markers */}
            {driverLocations.map((loc) => (
              <div
                key={loc.id}
                title={`${loc.name} (${loc.status === 'AVAILABLE' ? 'Đang rảnh' : 'Đang giao'})`}
                className={`driver-marker ${
                  loc.status === 'AVAILABLE'
                    ? 'driver-marker--available'
                    : 'driver-marker--delivering'
                }`}
                style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              />
            ))}

            {/* Legend Box at Bottom Left */}
            <div className="map-legend-box">
              <div className="map-legend-item">
                <span className="legend-dot legend-dot--green" />
                <span>Đang rảnh</span>
              </div>
              <div className="map-legend-item">
                <span className="legend-dot legend-dot--yellow" />
                <span>Đang giao</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: RECENT ORDERS TABLE & PENDING PROFILES LIST ── */}
      <div className="dashboard-grid-row">
        {/* Left: Đơn hàng gần đây */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">Đơn hàng gần đây</h3>
            <button
              type="button"
              className="dashboard-card__link"
              onClick={() => navigate('/admin/orders')}
              style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }}
            >
              Xem tất cả <HiOutlineArrowRight />
            </button>
          </div>

          <div className="admin-table-wrapper" style={{ border: 'none', background: 'transparent' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN</th>
                  <th>KHÁCH HÀNG</th>
                  <th>TÀI XẾ</th>
                  <th style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th>GIỜ TẠO</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td style={{ fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{ord.code}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                          {ord.customerInitials}
                        </div>
                        <span className="admin-user-name" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{ord.customerName}</span>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', whiteSpace: 'nowrap' }}>{ord.driverName}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span className={`badge-status badge-status--${ord.badgeClass}`}>
                        {ord.statusLabel}
                      </span>
                    </td>
                    <td style={{ color: '#8a94a6', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{ord.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Hồ sơ chờ duyệt */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">Hồ sơ chờ duyệt</h3>
            <button
              type="button"
              className="dashboard-card__link"
              onClick={() => navigate('/admin/drivers?approval=pending')}
              style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }}
            >
              Xem tất cả <HiOutlineArrowRight />
            </button>
          </div>

          <div className="pending-drivers-list">
            {pendingDriversList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#8a94a6', fontSize: '0.875rem' }}>
                ✓ Hiện không có hồ sơ nào đang chờ duyệt
              </div>
            ) : (
              pendingDriversList.map((drv) => (
                <div key={drv.id} className="pending-driver-item">
                  <div className="pending-driver-info">
                    <div className="pending-driver-avatar">{drv.initials}</div>
                    <div className="pending-driver-details">
                      <div className="pending-driver-name">{drv.fullName}</div>
                      <div className="pending-driver-sub">{drv.vehicleText}</div>
                    </div>
                  </div>

                  <div className="pending-driver-actions">
                    <button
                      className="btn-approve"
                      onClick={() => handleApproveDriver(drv.id, drv.fullName)}
                    >
                      Duyệt
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleOpenRejectModal(drv.id, drv.fullName)}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL TỪ CHỐI HỒ SƠ ────────────────────────────────── */}
      {rejectModal.isOpen && (
        <div className="modal-overlay" onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="modal-title">Từ Chối Hồ Sơ Tài Xế</h4>
              <button
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                style={{ background: 'none', border: 'none', color: '#8a94a6', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                <HiOutlineX />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Nhập lý do từ chối hồ sơ đăng ký của tài xế <strong>{rejectModal.driverName}</strong>:
            </p>

            {/* Quick Reason Suggestions */}
            <div className="chip-suggestions">
              {[
                'Ảnh bằng lái xe bị mờ / hết hạn',
                'Thông tin CCCD không trùng khớp',
                'Biển số xe không rõ trên đăng ký',
                'Vui lòng chụp lại ảnh chân dung',
              ].map((chip, idx) => (
                <span
                  key={idx}
                  className="chip-suggestion-item"
                  onClick={() => setRejectModal((prev) => ({ ...prev, reason: chip }))}
                >
                  + {chip}
                </span>
              ))}
            </div>

            <textarea
              className="input"
              rows={3}
              placeholder="Nhập lý do từ chối chi tiết..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              style={{ resize: 'none', width: '100%', fontSize: '0.875rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn-reject"
                type="button"
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
              >
                Hủy
              </button>
              <button className="btn-approve" style={{ background: '#f0576b', color: '#ffffff' }} onClick={handleConfirmRejectDriver}>
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
