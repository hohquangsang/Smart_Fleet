import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlineX } from 'react-icons/hi';
import useToast from '../../hooks/useToast';
import '../../styles/driver.css';

const DriverDispatchPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [secondsLeft, setSecondsLeft] = useState(30);
  const [swipeProgress, setSwipeProgress] = useState(0); // 0 to 100
  const isDragging = useRef(false);
  const startX = useRef(0);
  const trackRef = useRef(null);

  // Simulated audio chime on new dispatch order arrival
  useEffect(() => {
    toast.info('ĐƠN MỚI! Vui lòng kiểm tra cước phí và tuyến đường.', 'Đơn Hàng Mới');
  }, []);

  // Countdown timer 30s
  useEffect(() => {
    if (secondsLeft <= 0) {
      toast.warning('Đã hết thời gian nhận đơn. Đơn hàng được tự động chuyển sang tài xế khác.', 'Hết giờ');
      navigate('/driver');
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, navigate, toast]);

  // Handle Swipe-to-Accept Dragging
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

  const acceptOrder = () => {
    toast.success('ĐÃ XÁC NHẬN NHẬN ĐƠN HÀNG! Đang mở điều hướng hành trình...', 'Nhận đơn thành công');
    setTimeout(() => {
      navigate('/driver/active');
    }, 500);
  };

  const skipOrder = () => {
    toast.info('Bạn đã bỏ qua đơn hàng này', 'Bỏ qua');
    navigate('/driver');
  };

  // SVG Ring Calculations
  const strokeDashoffset = 150 - (secondsLeft / 30) * 150;

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
        Đang lắng nghe Socket.IO tìm đơn hàng tốt nhất xung quanh bạn...
      </div>

      {/* ─── BOTTOM SHEET NHẬN ĐƠN TRƯỢT LÊN TỪ ĐÁY ─── */}
      <div className="dispatch-overlay">
        <div className="dispatch-bottom-sheet">
          {/* Header với Nút Bỏ Qua & Ring đếm ngược 30s */}
          <div className="dispatch-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="new-order-tag">🔥 ĐƠN MỚI</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mã: #ORD-99120</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Ring đếm ngược 30 giây */}
              <div className="countdown-ring-container">
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="var(--bg-panel-sub)" strokeWidth="4" />
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    fill="none"
                    stroke="var(--accent-blue)"
                    strokeWidth="4"
                    strokeDasharray="150"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
                <div className="countdown-ring-text">{secondsLeft}s</div>
              </div>

              <button type="button" className="btn-skip-order" onClick={skipOrder} title="Bỏ qua đơn hàng">
                <HiOutlineX style={{ fontSize: '1.4rem' }} />
              </button>
            </div>
          </div>

          {/* Cước phí thực nhận NỔI BẬT NHẤT */}
          <div className="dispatch-fare-highlight">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CƯỚC PHÍ THỰC NHẬN
            </div>
            <div className="dispatch-fare-amount">185.000 đ</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600, marginTop: 4 }}>
              4.2 km • ETA 12 Phút • Đã cộng +15.000đ Giờ cao điểm
            </div>
          </div>

          {/* Địa chỉ rút gọn 2 dòng */}
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
              <strong style={{ color: 'var(--text-primary)' }}>123 Nguyễn Trãi, Q.5, TP.HCM</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>Giao hàng:</span>
              <strong style={{ color: 'var(--text-primary)' }}>45 Lê Duẩn, Q.1, TP.HCM</strong>
            </div>
          </div>

          {/* Swipe-to-Accept Track */}
          <div
            ref={trackRef}
            className="swipe-track"
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="swipe-text" style={{ opacity: 1 - swipeProgress / 100 }}>
              Vuốt để nhận đơn ➔
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
