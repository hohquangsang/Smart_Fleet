import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineLightningBolt, HiOutlineTrendingUp, HiOutlineMap, HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import api from '../../services/api';
import '../../styles/driver.css';

const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const socket = useContext(SocketContext);

  const [approvalStatus, setApprovalStatus] = useState(user?.driver?.approvalStatus || 'PENDING');
  const isApproved = approvalStatus === 'APPROVED';
  const [isOnline, setIsOnline] = useState(false);

  const [quickStats, setQuickStats] = useState({
    todayEarnings: 0,
    todayBase: 0,
    todayBonus: 0,
    todayTripsCount: 0,
    acceptRate: 100,
    completeRate: 100,
    rating: 5.0,
  });

  // Fetch driver profile & quick stats on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/drivers/me');
        const driverObj = data?.data?.driver || data?.data;
        if (driverObj) {
          if (driverObj.approvalStatus) {
            setApprovalStatus(driverObj.approvalStatus);
          }
          const activeState = Boolean(driverObj.isActive || driverObj.status === 'ONLINE');
          setIsOnline(activeState);
          if (activeState && socket) {
            socket.emit('go-online', { lat: 10.7769, lng: 106.7009 });
          }
        }

        const earningsRes = await api.get('/drivers/earnings', { params: { period: 'day' } });
        if (earningsRes?.data?.data) {
          const d = earningsRes.data.data;
          setQuickStats({
            todayEarnings: d.todayEarnings || 0,
            todayBase: d.todayBase || 0,
            todayBonus: d.todayBonus || 0,
            todayTripsCount: d.todayTripsCount || 0,
            acceptRate: d.acceptRate || 100,
            completeRate: d.completeRate || 100,
            rating: d.driver?.rating || 5.0,
          });
        }
      } catch {
        // Fallback to initial state
      }
    };
    fetchProfile();
  }, []);

  // Sync socket online state when socket becomes available
  useEffect(() => {
    if (socket && isOnline && isApproved) {
      console.log('🟢 [Driver] Syncing online status to socket');
      socket.emit('go-online', { lat: 10.7769, lng: 106.7009 });
    }
  }, [socket, isOnline, isApproved]);

  // Real-time socket listener for Admin Approval & New Order Dispatch
  useEffect(() => {
    if (!socket) return;

    const handleApprovalUpdated = (data) => {
      console.log('🔔 [Driver] driver:approval-updated received:', data);
      setApprovalStatus(data.approvalStatus);

      if (data.approvalStatus === 'APPROVED') {
        toast.success(
          data.message || 'Hồ sơ của bạn đã được Admin phê duyệt! Bạn đã có thể bật Online và nhận đơn.',
          '🎉 Đã Phê Duyệt Hồ Sơ'
        );
      } else if (data.approvalStatus === 'REJECTED') {
        toast.error(
          data.message || 'Hồ sơ tài xế của bạn đã bị từ chối.',
          '❌ Hồ Sơ Bị Từ Chối'
        );
      }
    };

    const handleNewOrder = (data) => {
      console.log('🔥 [Driver] driver:new-order received on Dashboard:', data);
      toast.info('⚡ BẠN CÓ ĐƠN HÀNG MỚI! Đang mở trạm nhận đơn...', 'Đơn Hàng Mới');
      navigate('/driver/dispatch', { state: { dispatchData: data } });
    };

    socket.on('driver:approval-updated', handleApprovalUpdated);
    socket.on('driver:new-order', handleNewOrder);

    return () => {
      socket.off('driver:approval-updated', handleApprovalUpdated);
      socket.off('driver:new-order', handleNewOrder);
    };
  }, [socket, toast, navigate]);

  const handleToggleOnline = async () => {
    if (!isApproved) {
      toast.warning('Tài khoản của bạn đang chờ Admin duyệt hồ sơ. Vui lòng đợi!', 'Tài khoản chưa duyệt');
      return;
    }

    const nextState = !isOnline;

    try {
      if (nextState) {
        // Default HCM center coords if navigator geolocation is delayed
        const lat = 10.7769;
        const lng = 106.7009;

        if (socket) {
          socket.emit('go-online', { lat, lng });
        }
        await api.patch('/drivers/status', { lat, lng }).catch(() => {});
        setIsOnline(true);
        toast.success('Đã bật ONLINE! Bạn sẵn sàng nhận đơn từ hệ thống SmartFleet.', 'ONLINE');
      } else {
        if (socket) {
          socket.emit('go-offline');
        }
        await api.patch('/drivers/status', {}).catch(() => {});
        setIsOnline(false);
        toast.info('Đã tắt ONLINE (OFFLINE). Tạm ngưng nhận đơn mới.', 'OFFLINE');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể thay đổi trạng thái';
      toast.error(msg, 'Lỗi');
    }
  };

  return (
    <div className="driver-container">
      {/* ─── CÔNG TẮC ONLINE/OFFLINE CỠ LỚN Ở ĐỈNH TRANG ─── */}
      <div className="driver-header-bar">
        <div>
          <h1 className="driver-title">SmartFleet Driver Console</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Hệ thống quản lý trạng thái, phát GPS & phân tích nhu cầu theo thời gian thực
          </p>
        </div>

        <div className="online-toggle-wrapper">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              TRẠNG THÁI HOẠT ĐỘNG
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: isOnline ? 'var(--accent-green)' : 'var(--text-muted)',
                }}
              >
                {isOnline ? 'ONLINE (SẴN SÀNG)' : 'OFFLINE (TẠM NGHỈ)'}
              </span>
              <span
                className={`approval-badge ${
                  isApproved ? 'approval-badge--approved' : 'approval-badge--pending'
                }`}
              >
                {isApproved ? (
                  <>
                    <HiOutlineCheckCircle /> Đã duyệt
                  </>
                ) : (
                  <>
                    <HiOutlineExclamationCircle /> Đang chờ duyệt
                  </>
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={`online-switch ${isOnline ? 'online-switch--on' : ''} ${
              !isApproved ? 'online-switch--disabled' : ''
            }`}
            onClick={handleToggleOnline}
            title={!isApproved ? 'Tài khoản chưa được duyệt' : 'Bật/Tắt Online'}
          >
            <div className="online-switch-handle" />
          </button>
        </div>
      </div>

      {/* ─── DASHBOARD 2 CỘT ────────────────────────── */}
      <div className="dashboard-driver-layout">
        {/* BẢN ĐỒ NHU CẦU REAL-TIME (HEATMAP) */}
        <div className="driver-heatmap-wrapper">
          {/* Nhãn nổi gợi ý khu vực nên di chuyển */}
          <div className="heatmap-chip-floating">
            <span style={{ color: '#F5A623', fontWeight: 700 }}>🔥 KHU VỰC QUẬN 1 (+2.4 km)</span>
            <span style={{ color: 'var(--text-secondary)' }}>• AI Dự đoán: Nhu cầu xe tăng +15% cước</span>
          </div>

          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid slice"
            style={{ background: '#0A0D13' }}
          >
            {/* Dark Grid */}
            <defs>
              <pattern id="heatGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(38, 46, 60, 0.4)" strokeWidth="1" />
              </pattern>
              {/* Heatmap Gradients */}
              <radialGradient id="heatHot" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F0576B" stopOpacity="0.6" />
                <stop offset="60%" stopColor="#F5A623" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatWarm" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F5A623" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#heatGrid)" />

            {/* Simulated Road network */}
            <path d="M 50,180 L 750,180 M 50,360 L 750,360 M 50,480 L 750,480" stroke="rgba(38, 46, 60, 0.6)" strokeWidth="3" />
            <path d="M 220,50 L 220,550 M 520,50 L 520,550 M 680,50 L 680,550" stroke="rgba(38, 46, 60, 0.6)" strokeWidth="3" />

            {/* Heatmap Zones (Cam / Đỏ mờ) */}
            <circle cx="520" cy="180" r="140" fill="url(#heatHot)" />
            <circle cx="220" cy="360" r="110" fill="url(#heatWarm)" />

            {/* Labels on Heatmap */}
            <g transform="translate(520, 180)">
              <rect x="-65" y="-14" width="130" height="28" rx="6" fill="#10141D" stroke="#F0576B" strokeWidth="1" />
              <text x="0" y="4" textAnchor="middle" fill="#F0576B" fontSize="11" fontWeight="700" fontFamily="Inter">
                🔥 QUẬN 1 (HOT +15%)
              </text>
            </g>

            <g transform="translate(220, 360)">
              <rect x="-60" y="-14" width="120" height="28" rx="6" fill="#10141D" stroke="#F5A623" strokeWidth="1" />
              <text x="0" y="4" textAnchor="middle" fill="#F5A623" fontSize="11" fontWeight="700" fontFamily="Inter">
                ⚡ TÂN BÌNH (+10%)
              </text>
            </g>

            {/* Chấm Xanh Dương đánh dấu vị trí Tài xế hiện tại */}
            <g transform="translate(380, 280)">
              <circle r="20" fill="rgba(59, 130, 246, 0.25)">
                <animate attributeName="r" values="16;24;16" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="10" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
              <rect x="-45" y="-36" width="90" height="20" rx="4" fill="#10141D" stroke="#3B82F6" strokeWidth="1" />
              <text x="0" y="-22" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="700" fontFamily="Inter">
                📍 VỊ TRÍ BẠN
              </text>
            </g>
          </svg>
        </div>

        {/* THẺ THU NHẬP NHANH */}
        <div className="quick-earnings-card">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
              THU NHẬP HÔM NAY
            </span>
            <div className="quick-earnings-amount">{(quickStats.todayEarnings || 0).toLocaleString('vi-VN')} đ</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600, marginTop: 4 }}>
              ▲ {quickStats.todayTripsCount || 0} chuyến hôm nay
            </div>
          </div>

          <div className="earnings-breakdown-grid">
            <div className="earnings-sub-box">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CƯỚC CƠ BẢN</span>
              <span className="earnings-sub-val" style={{ color: 'var(--accent-blue)' }}>
                {(quickStats.todayBase || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="earnings-sub-box">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>THƯỞNG HIỆU SUẤT</span>
              <span className="earnings-sub-val" style={{ color: 'var(--accent-green)' }}>
                {(quickStats.todayBonus || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-panel-sub)',
              borderRadius: '10px',
              border: '1px solid var(--border-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tỷ lệ nhận đơn:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {quickStats.acceptRate || 100}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tỷ lệ hoàn thành:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)' }}>
                {quickStats.completeRate || 100}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Đánh giá sao:</span>
              <span style={{ color: '#F5A623', fontWeight: 700 }}>★ {(quickStats.rating || 5.0).toFixed(1)} / 5.0</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            style={{ width: '100%', padding: '0.85rem', background: 'var(--gradient-blue)' }}
            onClick={() => navigate('/driver/dispatch')}
          >
            Mở Trạm Nhận Đơn Real-Time 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
