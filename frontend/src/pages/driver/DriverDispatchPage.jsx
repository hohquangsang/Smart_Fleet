import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlineX } from 'react-icons/hi';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import api from '../../services/api';
import '../../styles/driver.css';

const DriverDispatchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const socket = useContext(SocketContext);

  // Dữ liệu đơn hàng thực từ socket driver:new-order hoặc state điều hướng
  const [dispatchData, setDispatchData] = useState(location.state?.dispatchData || null);
  const [secondsLeft, setSecondsLeft] = useState(location.state?.dispatchData?.expiresInSec || 30);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const trackRef = useRef(null);

  // Fetch available dispatch order on mount (HTTP fallback nếu chưa có dispatchData từ state)
  useEffect(() => {
    if (location.state?.dispatchData) {
      setDispatchData(location.state.dispatchData);
      setSecondsLeft(location.state.dispatchData.expiresInSec || 30);
      return;
    }

    const fetchAvailableDispatch = async () => {
      try {
        const { data } = await api.get('/orders/available-dispatch');
        if (data?.data?.order) {
          console.log('📦 Available dispatch order loaded from API:', data.data.order);
          setDispatchData(data.data.order);
          setSecondsLeft(data.data.order.expiresInSec || 30);
          setSwipeProgress(0);
        }
      } catch {
        // No active order available
      }
    };

    fetchAvailableDispatch();
  }, [location.state]);

  // ─── Lắng nghe socket: driver:new-order ─────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (data) => {
      console.log('🔥 [Driver] driver:new-order received:', data);
      setDispatchData(data);
      setSecondsLeft(data.expiresInSec || 30);
      setSwipeProgress(0);
      toast.info('ĐƠN MỚI! Vui lòng kiểm tra cước phí và tuyến đường.', 'Đơn Hàng Mới');
    };

    // Đơn bị tài xế khác nhận → ẩn bottom sheet
    const handleOrderTaken = (data) => {
      if (dispatchData && data.orderId === dispatchData.orderId) {
        toast.warning('Đơn hàng đã được tài xế khác nhận mất rồi!', 'Hết đơn');
        setDispatchData(null);
        navigate('/driver');
      }
    };

    socket.on('driver:new-order', handleNewOrder);
    socket.on('driver:order-taken', handleOrderTaken);

    return () => {
      socket.off('driver:new-order', handleNewOrder);
      socket.off('driver:order-taken', handleOrderTaken);
    };
  }, [socket, dispatchData, navigate, toast]);

  // ─── Countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (!dispatchData) return;
    if (secondsLeft <= 0) {
      toast.warning('Đã hết thời gian nhận đơn. Đơn hàng được tự động chuyển sang tài xế khác.', 'Hết giờ');
      setDispatchData(null);
      navigate('/driver');
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, dispatchData, navigate, toast]);

  // ─── Swipe handlers ──────────────────────────────────────────
  const handleTouchStart = (e) => {
    isDragging.current = true;
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || !trackRef.current) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const diffX = currentX - startX.current;
    const trackWidth = trackRef.current.clientWidth - 56;
    const pct = Math.max(0, Math.min(100, (diffX / trackWidth) * 100));
    setSwipeProgress(pct);

    if (pct >= 90) {
      isDragging.current = false;
      setSwipeProgress(100);
      acceptOrder();
    }
  };

  const handleTouchEnd = () => {
    if (isDragging.current && swipeProgress < 90) {
      isDragging.current = false;
      setSwipeProgress(0);
    }
  };

  // ─── Nhận đơn: gọi API + emit socket ────────────────────────
  const acceptOrder = async () => {
    if (!dispatchData || accepting) return;
    setAccepting(true);

    try {
      // Gọi HTTP API lưu DB & broadcast socket (handled by order.service.js)
      await api.post(`/orders/${dispatchData.orderId}/accept`);

      toast.success('ĐÃ XÁC NHẬN NHẬN ĐƠN HÀNG! Đang mở điều hướng hành trình...', 'Nhận đơn thành công');
      // Lưu orderId để ActiveTripPage dùng
      localStorage.setItem('activeOrderId', dispatchData.orderId);
      setTimeout(() => {
        navigate('/driver/active', { state: { orderId: dispatchData.orderId } });
      }, 500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể nhận đơn. Vui lòng thử lại.';
      toast.error(msg, 'Lỗi nhận đơn');
      setSwipeProgress(0);
      setAccepting(false);
    }
  };

  const skipOrder = () => {
    if (socket && dispatchData) {
      socket.emit('decline-order', { orderId: dispatchData.orderId });
    }
    toast.info('Bạn đã bỏ qua đơn hàng này', 'Bỏ qua');
    navigate('/driver');
  };

  // Khi không có đơn → màn hình chờ
  if (!dispatchData) {
    return (
      <div className="driver-container" style={{ position: 'relative' }}>
        <div className="driver-header-bar">
          <h1 className="driver-title">Trạm Nhận Đơn Real-Time</h1>
        </div>
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 14,
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📡</div>
          <div>Đang lắng nghe Socket.IO tìm đơn hàng tốt nhất xung quanh bạn...</div>
          <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Đơn hàng sẽ hiện tự động khi Admin duyệt
          </div>
        </div>
      </div>
    );
  }

  // SVG Ring countdown
  const strokeDashoffset = 150 - (secondsLeft / (dispatchData.expiresInSec || 30)) * 150;
  const formattedFare = dispatchData.fare
    ? `${Number(dispatchData.fare).toLocaleString('vi-VN')} đ`
    : '—';

  return (
    <div className="driver-container" style={{ position: 'relative' }}>
      <div className="driver-header-bar">
        <h1 className="driver-title">Trạm Nhận Đơn Real-Time</h1>
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 14,
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Đơn hàng đã đến! Xem bên dưới để nhận hoặc bỏ qua.
      </div>

      {/* ─── BOTTOM SHEET NHẬN ĐƠN ─── */}
      <div className="dispatch-overlay">
        <div className="dispatch-bottom-sheet">
          {/* Header */}
          <div className="dispatch-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="new-order-tag">🔥 ĐƠN MỚI</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Mã: #{String(dispatchData.orderId).slice(-8).toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Ring đếm ngược */}
              <div className="countdown-ring-container">
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="var(--bg-panel-sub)" strokeWidth="4" />
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    fill="none"
                    stroke={secondsLeft <= 10 ? '#EF4444' : 'var(--accent-blue)'}
                    strokeWidth="4"
                    strokeDasharray="150"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
                <div className="countdown-ring-text" style={{ color: secondsLeft <= 10 ? '#EF4444' : undefined }}>
                  {secondsLeft}s
                </div>
              </div>

              <button type="button" className="btn-skip-order" onClick={skipOrder} title="Bỏ qua đơn hàng">
                <HiOutlineX style={{ fontSize: '1.4rem' }} />
              </button>
            </div>
          </div>

          {/* Cước phí thực nhận */}
          <div className="dispatch-fare-highlight">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CƯỚC PHÍ THỰC NHẬN
            </div>
            <div className="dispatch-fare-amount">{formattedFare}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600, marginTop: 4 }}>
              {dispatchData.distanceKm ? `${dispatchData.distanceKm} km` : ''}
              {dispatchData.etaMin ? ` • ETA ${dispatchData.etaMin} Phút` : ''}
              {dispatchData.vehicleType ? ` • ${dispatchData.vehicleType}` : ''}
            </div>
          </div>

          {/* Địa chỉ */}
          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-panel-sub)',
              borderRadius: 12,
              border: '1px solid var(--border-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>Lấy hàng:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {dispatchData.pickupAddress || '—'}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>Giao hàng:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {dispatchData.dropoffAddress || '—'}
              </strong>
            </div>
          </div>

          {/* Swipe-to-Accept */}
          <div
            ref={trackRef}
            className="swipe-track"
            style={{ opacity: accepting ? 0.6 : 1 }}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="swipe-text" style={{ opacity: 1 - swipeProgress / 100 }}>
              {accepting ? 'Đang xác nhận...' : 'Vuốt để nhận đơn ➔'}
            </div>

            <div
              className="swipe-handle"
              style={{ left: `calc(3px + ${swipeProgress}% - ${swipeProgress * 0.5}px)` }}
              onMouseDown={handleTouchStart}
              onTouchStart={handleTouchStart}
            >
              <HiOutlineArrowRight />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDispatchPage;
