import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineLocationMarker, HiOutlineRefresh } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import api from '../../services/api';
import '../../styles/driver.css';

const createDriverPuckIcon = (label = '📍 VỊ TRÍ TÀI XẾ') =>
  L.divIcon({
    className: 'custom-puck-pin',
    html: `<div style="
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
      <div style="
        background: #10141D;
        border: 1px solid #3B82F6;
        color: #3B82F6;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 6px;
        margin-bottom: 4px;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      ">${label}</div>
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #3B82F6;
        border: 3px solid #FFFFFF;
        box-shadow: 0 0 20px #3B82F6;
      "></div>
    </div>`,
    iconSize: [140, 52],
    iconAnchor: [70, 48],
  });

const driverMarkerIcon = createDriverPuckIcon('📍 VỊ TRÍ BẠN (GPS)');

const RecenterMap = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] && coords[1]) {
      map.flyTo(coords, 15, { animate: true });
    }
  }, [coords, map]);
  return null;
};

const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const socket = useContext(SocketContext);

  const [approvalStatus, setApprovalStatus] = useState(user?.driver?.approvalStatus || 'PENDING');
  const [rejectionReason, setRejectionReason] = useState(user?.driver?.rejectionReason || '');
  const isApproved = approvalStatus === 'APPROVED';
  const [isOnline, setIsOnline] = useState(false);

  // Live GPS Coords state
  const [coords, setCoords] = useState([10.7769, 106.7009]);
  const [gpsStatus, setGpsStatus] = useState('Đang kết nối GPS...');

  const [quickStats, setQuickStats] = useState({
    todayEarnings: 0,
    todayBase: 0,
    todayBonus: 0,
    todayTripsCount: 0,
    acceptRate: 100,
    completeRate: 100,
    rating: 5.0,
  });

  // Request browser geolocation
  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Trình duyệt không hỗ trợ Geolocation GPS');
      return;
    }

    setGpsStatus('Đang định vị...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords([latitude, longitude]);
        setGpsStatus(`GPS Thực: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        toast.success('Đã lấy vị trí GPS hiện tại thành công!', 'GPS Real-Time');

        if (socket && isOnline) {
          socket.emit('go-online', { lat: latitude, lng: longitude });
        }
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
        setGpsStatus('Sử dụng vị trí mặc định TP.HCM');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    requestGpsLocation();
    // Continuous watch position
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords([latitude, longitude]);
          setGpsStatus(`GPS Thực: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        },
        null,
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          if (driverObj.rejectionReason) {
            setRejectionReason(driverObj.rejectionReason);
          }
          const activeState = Boolean(driverObj.isActive || driverObj.status === 'ONLINE');
          setIsOnline(activeState);
          if (activeState && socket) {
            socket.emit('go-online', { lat: coords[0], lng: coords[1] });
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync socket online state when socket becomes available
  useEffect(() => {
    if (socket && isOnline && isApproved) {
      console.log('🟢 [Driver] Syncing online status to socket');
      socket.emit('go-online', { lat: coords[0], lng: coords[1] });
    }
  }, [socket, isOnline, isApproved, coords]);

  // Real-time socket listener for Admin Approval & New Order Dispatch
  useEffect(() => {
    if (!socket) return;

    const handleApprovalUpdated = (data) => {
      console.log('🔔 [Driver] driver:approval-updated received:', data);

      if (data.deleted || data.approvalStatus === 'PERMANENTLY_REJECTED') {
        toast.error('Hồ sơ khiếu nại của bạn đã bị từ chối lần 2. Tài khoản đã bị xóa khỏi hệ thống.', 'Tài khoản đã hủy');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2500);
        return;
      }

      if (data.approvalStatus) {
        setApprovalStatus(data.approvalStatus);
      }
      if (data.rejectionReason) {
        setRejectionReason(data.rejectionReason);
      }

      if (data.approvalStatus === 'APPROVED') {
        toast.success(
          data.message || 'Hồ sơ của bạn đã được Admin phê duyệt! Bạn đã có thể bật Online và nhận đơn.',
          '🎉 Đã Phê Duyệt Hồ Sơ'
        );
      } else if (data.approvalStatus === 'REJECTED') {
        toast.error(
          data.message || `Hồ sơ tài xế của bạn bị từ chối: "${data.rejectionReason || ''}". Vui lòng cập nhật và khiếu nại!`,
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
      if (approvalStatus === 'REJECTED') {
        toast.error(
          `Tài khoản bị từ chối: "${rejectionReason || 'Thông tin chưa hợp lệ'}". Đang chuyển tới trang Thông tin cá nhân để khiếu nại!`,
          'Hồ sơ bị từ chối'
        );
        navigate('/driver/profile');
        return;
      }
      toast.warning('Tài khoản của bạn đang chờ Admin duyệt hồ sơ. Vui lòng đợi!', 'Tài khoản chưa duyệt');
      return;
    }

    const nextState = !isOnline;

    try {
      if (nextState) {
        const lat = coords[0];
        const lng = coords[1];

        if (socket) {
          socket.emit('go-online', { lat, lng });
        }
        await api.patch('/drivers/status', { lat, lng }).catch(() => { });
        setIsOnline(true);
        toast.success('Đã bật ONLINE! Bạn sẵn sàng nhận đơn từ hệ thống SmartFleet.', 'ONLINE');
      } else {
        if (socket) {
          socket.emit('go-offline');
        }
        await api.patch('/drivers/status', {}).catch(() => { });
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
            Hệ thống quản lý trạng thái, phát vị trí GPS thực & nhận đơn theo thời gian thực
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
                  fontSize: '0.9rem',
                  color: isOnline ? 'var(--accent-green)' : 'var(--text-muted)',
                }}
              >
                {isOnline ? 'ONLINE (SẴN SÀNG)' : 'OFFLINE (TẠM NGHỈ)'}
              </span>
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
                    <HiOutlineCheckCircle /> Đã duyệt
                  </>
                ) : approvalStatus === 'REJECTED' ? (
                  <>
                    <HiOutlineExclamationCircle /> Bị từ chối
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
            className={`online-switch ${isOnline ? 'online-switch--on' : ''} ${!isApproved ? 'online-switch--disabled' : ''
              }`}
            onClick={handleToggleOnline}
            title={!isApproved ? 'Tài khoản chưa được duyệt' : 'Bật/Tắt Online'}
          >
            <div className="online-switch-handle" />
          </button>
        </div>
      </div>

      {/* ─── CẢNH BÁO KHI HỒ SƠ BỊ TỪ CHỐI ─── */}
      {approvalStatus === 'REJECTED' && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 14,
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: '1.25rem',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HiOutlineExclamationCircle size={32} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
            <div>
              <h4 style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: '1.05rem' }}>
                Hồ Sơ Đăng Ký Tài Xế Của Bạn Đã Bị Từ Chối!
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
                Lý do từ Admin: <strong style={{ color: 'var(--accent-red)' }}>{rejectionReason || 'Thông tin giấy tờ chưa đủ điều kiện xét duyệt'}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            style={{
              background: 'var(--gradient-blue)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.9rem',
            }}
            onClick={() => navigate('/driver/profile')}
          >
            Vào Cập Nhật Hồ Sơ & Khiếu Nại ➔
          </button>
        </div>
      )}

      {/* ─── THÔNG BÁO KHI HỒ SƠ ĐANG CHỜ DUYỆT ─── */}
      {approvalStatus === 'PENDING' && (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: 14,
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: '1.25rem',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HiOutlineExclamationCircle size={32} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
            <div>
              <h4 style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '1.05rem' }}>
                Hồ Sơ Của Bạn Đang Chờ Admin Phê Duyệt
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
                Bạn có thể vào trang hồ sơ cá nhân để tải lại giấy tờ hoặc gửi ghi chú / khiếu nại tới Admin.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            style={{
              background: 'var(--gradient-blue)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.9rem',
            }}
            onClick={() => navigate('/driver/profile')}
          >
            Vào Hồ Sơ & Gửi Giải Trình ➔
          </button>
        </div>
      )}

      {/* ─── DASHBOARD 2 CỘT ────────────────────────── */}
      <div className="dashboard-driver-layout">
        {/* BẢN ĐỒ LEAFLET GPS HIỆN TẠI CỦA DRIVER */}
        <div className="driver-heatmap-wrapper" style={{ minHeight: 520, position: 'relative' }}>
          {/* Bar thông tin GPS & Nút định vị lại */}
          <div className="heatmap-chip-floating" style={{ justifyContent: 'space-between', right: 16, width: 'calc(100% - 32px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineLocationMarker size={18} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{gpsStatus}</span>
            </div>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={requestGpsLocation}
              style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
              title="Cập nhật vị trí GPS hiện tại"
            >
              <HiOutlineRefresh /> Cập Nhật GPS
            </button>
          </div>

          <MapContainer
            center={coords}
            zoom={15}
            style={{ width: '100%', height: '100%', minHeight: 520, borderRadius: 14 }}
            zoomControl={false}
          >
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
              maxZoom={20}
              className="google-maps-dark-tiles"
            />
            <RecenterMap coords={coords} />
            <Marker position={coords} icon={driverMarkerIcon}>
              <Popup>
                📍 <strong>Vị trí của bạn (Driver)</strong>
                <br />
                Kinh độ: {coords[1].toFixed(6)}
                <br />
                Vĩ độ: {coords[0].toFixed(6)}
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* THẺ THU NHẬP NHANH */}
        <div className="quick-earnings-card">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
              THU NHẬP HÔM NAY
            </span>
            <div className="quick-earnings-amount">{(quickStats.todayEarnings || 0).toLocaleString('vi-VN')} đ</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600, marginTop: 4 }}>
              {quickStats.todayTripsCount || 0} chuyến hôm nay
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
                {quickStats.acceptRate || 0}%
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
            Mở Trạm Nhận Đơn Real-Time
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
