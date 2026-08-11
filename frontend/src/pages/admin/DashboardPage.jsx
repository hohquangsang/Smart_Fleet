import { useState, useEffect, useContext } from 'react';
import { HiOutlineUsers, HiOutlineClock, HiOutlineUserGroup, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle } from 'react-icons/hi';
import api from '../../services/api';
import { SocketContext } from '../../contexts/SocketContext';
import '../../styles/admin.css';

const DashboardPage = () => {
  const socket = useContext(SocketContext);
  const [stats, setStats] = useState({
    totalDrivers: 0,
    pendingDrivers: 0,
    totalUsers: 0,
    completedToday: 0,
    revenueToday: 0,
  });

  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        if (data?.data?.stats) {
          const s = data.data.stats;
          setStats({
            totalDrivers: s.totalDrivers || 0,
            pendingDrivers: s.pendingDrivers || 0,
            totalUsers: s.totalUsers || 0,
            completedToday: s.deliveredToday || 0,
            revenueToday: s.revenueToday || 0,
          });
        }
      } catch {
        // Empty default
      }
    };
    fetchDashboard();
  }, []);

  // Listen to real-time socket events for system activities
  useEffect(() => {
    if (!socket) return;

    const handleNewDriver = (d) => {
      const newAct = {
        id: Date.now(),
        type: 'info',
        text: `Tài xế ${d.fullName || ''} (${d.licensePlate || ''}) vừa nộp hồ sơ mới, đang chờ duyệt`,
        time: 'Vừa xong',
      };
      setActivities((prev) => [newAct, ...prev.slice(0, 9)]);
      setStats((prev) => ({
        ...prev,
        totalDrivers: prev.totalDrivers + 1,
        pendingDrivers: prev.pendingDrivers + 1,
      }));
    };

    const handleNewOrder = (o) => {
      const newAct = {
        id: Date.now(),
        type: 'info',
        text: `Người dùng ${o.customerName || 'Khách hàng'} vừa tạo đơn hàng #${o.orderId?.slice(-8).toUpperCase()}`,
        time: 'Vừa xong',
      };
      setActivities((prev) => [newAct, ...prev.slice(0, 9)]);
    };

    const handleDriverAccepted = (d) => {
      const driverName = d.driverInfo?.name || d.driver?.name || d.name || 'Tài xế';
      const newAct = {
        id: Date.now(),
        type: 'success',
        text: `Tài xế ${driverName} đã nhận đơn hàng #${d.orderId?.slice(-8).toUpperCase()} (Trạng thái: ĐANG GIAO)`,
        time: 'Vừa xong',
      };
      setActivities((prev) => [newAct, ...prev.slice(0, 9)]);
    };

    const handleOrderStatusUpdate = (d) => {
      const driverName = d.driver?.name ? ` bởi ${d.driver.name}` : '';
      const newAct = {
        id: Date.now(),
        type: 'info',
        text: `Đơn hàng #${d.orderId?.slice(-8).toUpperCase()} vừa cập nhật trạng thái: ${d.label || d.status}${driverName}`,
        time: 'Vừa xong',
      };
      setActivities((prev) => [newAct, ...prev.slice(0, 9)]);
    };

    socket.on('admin:new-driver-registered', handleNewDriver);
    socket.on('admin:new-order-request', handleNewOrder);
    socket.on('admin:driver-accepted', handleDriverAccepted);
    socket.on('admin:order-status-update', handleOrderStatusUpdate);

    return () => {
      socket.off('admin:new-driver-registered', handleNewDriver);
      socket.off('admin:new-order-request', handleNewOrder);
      socket.off('admin:driver-accepted', handleDriverAccepted);
      socket.off('admin:order-status-update', handleOrderStatusUpdate);
    };
  }, [socket]);

  return (
    <div className="admin-container">
      <div className="admin-header-bar">
        <div>
          <h1 className="admin-title">Tổng Quan Điều Hành SmartFleet</h1>
          <p className="admin-subtitle">
            Bảng theo dõi các chỉ số vận tải, hồ sơ chờ duyệt và nhật ký hoạt động hệ thống real-time
          </p>
        </div>
      </div>

      {/* ─── 4 THẺ CHỈ SỐ KPI GRID ─────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__title">TỔNG TÀI XẾ</div>
          <div className="kpi-card__val">{stats.totalDrivers}</div>
          <div className="kpi-card__sub" style={{ color: 'var(--accent-blue)' }}>
            Dữ liệu hệ thống thực tế
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__title">CHỜ DUYỆT HỒ SƠ</div>
          <div className="kpi-card__val kpi-card__val--orange">{stats.pendingDrivers}</div>
          <div className="kpi-card__sub" style={{ color: '#F5A623', fontWeight: 600 }}>
            {stats.pendingDrivers > 0 ? `⚠️ ${stats.pendingDrivers} hồ sơ cần duyệt` : '✓ Không có hồ sơ chờ'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__title">TỔNG NGƯỜI DÙNG</div>
          <div className="kpi-card__val">{stats.totalUsers.toLocaleString('vi-VN')}</div>
          <div className="kpi-card__sub" style={{ color: 'var(--accent-green)' }}>
            Khách hàng đã đăng ký
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__title">ĐƠN HOÀN THÀNH HÔM NAY</div>
          <div className="kpi-card__val kpi-card__val--green">{stats.completedToday}</div>
          <div className="kpi-card__sub" style={{ color: 'var(--accent-green)' }}>
            Doanh thu: {stats.revenueToday.toLocaleString('vi-VN')} đ
          </div>
        </div>
      </div>

      {/* ─── KHỐI HOẠT ĐỘNG GẦN ĐÂY ───────────────────── */}
      <div className="activity-feed-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.15rem' }}>
            Hoạt Động Gần Đây (Real-Time)
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cập nhật tự động qua Socket.IO</span>
        </div>

        <div className="activity-list">
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Đang chờ các hoạt động phát sinh từ người dùng và tài xế...
            </div>
          ) : (
            activities.map((act) => {
              const iconClass =
                act.type === 'alert'
                  ? 'activity-icon--alert'
                  : act.type === 'success'
                  ? 'activity-icon--success'
                  : 'activity-icon--info';

              return (
                <div key={act.id} className="activity-item">
                  <div className={`activity-icon ${iconClass}`}>
                    {act.type === 'alert' && <HiOutlineExclamationCircle />}
                    {act.type === 'success' && <HiOutlineCheckCircle />}
                    {act.type === 'info' && <HiOutlineInformationCircle />}
                  </div>
                  <div className="activity-text">{act.text}</div>
                  <div className="activity-time">{act.time}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
