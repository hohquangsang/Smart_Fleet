import { useState, useEffect } from 'react';
import { HiOutlineUsers, HiOutlineClock, HiOutlineUserGroup, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle } from 'react-icons/hi';
import api from '../../services/api';
import '../../styles/admin.css';

const MOCK_ACTIVITIES = [
  {
    id: 1,
    type: 'alert',
    text: 'Tài xế Nguyễn Văn Nam báo sự cố: Kẹt xe nghiêm trọng tại Q.1',
    highlightName: 'Nguyễn Văn Nam',
    time: '5 phút trước',
  },
  {
    id: 2,
    type: 'info',
    text: 'Người dùng Hồ Hữu Quang Sang vừa khởi tạo đơn giao hàng mới #ORD-88294',
    highlightName: 'Hồ Hữu Quang Sang',
    time: '12 phút trước',
  },
  {
    id: 3,
    type: 'success',
    text: 'Tài xế Trần Văn Driver đã hoàn thành đơn hàng #ORD-88100',
    highlightName: 'Trần Văn Driver',
    time: '25 phút trước',
  },
  {
    id: 4,
    type: 'alert',
    text: 'Tài xế Phạm Văn C báo sự cố: Xe gặp sự cố hỏng hóc tại Q.7',
    highlightName: 'Phạm Văn C',
    time: '45 phút trước',
  },
  {
    id: 5,
    type: 'info',
    text: 'Tài xế Lê Văn D vừa nộp hồ sơ đăng ký mới, đang chờ kiểm duyệt',
    highlightName: 'Lê Văn D',
    time: '1 giờ trước',
  },
];

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalDrivers: 48,
    pendingDrivers: 3,
    totalUsers: 1250,
    completedToday: 142,
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/admin/analytics');
        if (data?.data) {
          setStats((prev) => ({
            ...prev,
            totalDrivers: data.data.totalDrivers || prev.totalDrivers,
            totalUsers: data.data.totalUsers || prev.totalUsers,
          }));
        }
      } catch {
        // Fallback to mock stats
      }
    };
    fetchDashboard();
  }, []);

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
            ▲ +4 tài xế mới tuần này
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__title">CHỜ DUYỆT HỒ SƠ</div>
          <div className="kpi-card__val kpi-card__val--orange">{stats.pendingDrivers}</div>
          <div className="kpi-card__sub" style={{ color: '#F5A623', fontWeight: 600 }}>
            ⚠️ 3 hồ sơ cần xử lý ngay
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__title">TỔNG NGƯỜI DÙNG</div>
          <div className="kpi-card__val">{stats.totalUsers.toLocaleString('vi-VN')}</div>
          <div className="kpi-card__sub" style={{ color: 'var(--accent-green)' }}>
            ▲ +12% tăng trưởng tháng này
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__title">ĐƠN HOÀN THÀNH HÔM NAY</div>
          <div className="kpi-card__val kpi-card__val--green">{stats.completedToday}</div>
          <div className="kpi-card__sub" style={{ color: 'var(--accent-green)' }}>
            Tổng cước: 28.500.000 đ
          </div>
        </div>
      </div>

      {/* ─── KHỐI HOẠT ĐỘNG GẦN ĐÂY ───────────────────── */}
      <div className="activity-feed-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.15rem' }}>
            Hoạt Động Gần Đây
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cập nhật tự động qua Socket.IO</span>
        </div>

        <div className="activity-list">
          {MOCK_ACTIVITIES.map((act) => {
            const iconClass =
              act.type === 'alert'
                ? 'activity-icon--alert'
                : act.type === 'success'
                ? 'activity-icon--success'
                : 'activity-icon--info';

            const renderTextWithHighlight = () => {
              const parts = act.text.split(act.highlightName);
              return (
                <span>
                  {parts[0]}
                  <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{act.highlightName}</strong>
                  {parts[1]}
                </span>
              );
            };

            return (
              <div key={act.id} className="activity-item">
                <div className={`activity-icon ${iconClass}`}>
                  {act.type === 'alert' && <HiOutlineExclamationCircle />}
                  {act.type === 'success' && <HiOutlineCheckCircle />}
                  {act.type === 'info' && <HiOutlineInformationCircle />}
                </div>
                <div className="activity-text">{renderTextWithHighlight()}</div>
                <div className="activity-time">{act.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
