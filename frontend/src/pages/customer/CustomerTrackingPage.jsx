import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HiOutlinePhone, HiOutlineChatAlt, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineX } from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import '../../styles/customer.css';

const STEPS = [
  { key: 'PENDING', label: 'Đang tìm tài xế' },
  { key: 'MATCHED', label: 'Tài xế đang đến' },
  { key: 'PICKED_UP', label: 'Đã lấy hàng' },
  { key: 'DELIVERED', label: 'Đã hoàn thành' },
];

const CANCEL_REASONS = [
  'Thay đổi lộ trình / Không còn nhu cầu',
  'Tài xế nhận đơn quá lâu',
  'Đặt nhầm loại phương tiện',
  'Địa chỉ lấy hàng bị nhập sai',
  'Lý do khác',
];

const CustomerTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(1); // Default to MATCHED for demo
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [canceling, setCanceling] = useState(false);

  // Live GPS simulation
  const [vehiclePos, setVehiclePos] = useState({ x: 300, y: 280, heading: 45 });

  // Fetch active order details
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        setOrder(data.data);
        const statusMap = { PENDING: 0, MATCHED: 1, PICKED_UP: 2, DELIVERED: 3, CANCELLED: -1 };
        const idx = statusMap[data.data.status];
        if (idx !== undefined && idx >= 0) setCurrentStepIndex(idx);
      } catch {
        // Mock fallback if order not found
      }
    };
    fetchOrder();
  }, [orderId]);

  // Smooth vehicle movement animation
  useEffect(() => {
    const interval = setInterval(() => {
      setVehiclePos((prev) => {
        const nextX = prev.x + (prev.x < 550 ? 1.5 : -1.5);
        const nextY = prev.y + (prev.y > 180 ? -1 : 1);
        const dx = nextX - prev.x;
        const dy = nextY - prev.y;
        const heading = (Math.atan2(dy, dx) * 180) / Math.PI;
        return { x: nextX, y: nextY, heading };
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Cancel Order action
  const handleCancelClick = () => {
    const status = order?.status || (currentStepIndex === 0 ? 'PENDING' : 'MATCHED');

    if (status === 'PENDING') {
      // Direct cancel
      executeCancel();
    } else {
      // Require modal confirmation
      setShowCancelModal(true);
    }
  };

  const executeCancel = async () => {
    setCanceling(true);
    try {
      if (orderId) {
        await api.patch(`/orders/${orderId}/cancel`, { reason: cancelReason, note: cancelNote });
      }
      toast.success('Đã hủy đơn hàng thành công', 'Hủy đơn hàng');
      setShowCancelModal(false);
      setTimeout(() => navigate('/customer/history'), 500);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Không thể hủy đơn hàng', 'Lỗi');
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="customer-container">
      <div className="customer-title-bar">
        <div>
          <h1 className="page-heading">Theo Dõi Đơn Hàng Real-Time</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Mã đơn: <span className="order-code">{orderId || '#ORD-88294'}</span> • Cập nhật vị trí tài xế qua GPS
          </p>
        </div>
      </div>

      <div className="tracking-layout">
        {/* ─── BẢN ĐỒ LỚN CHIẾM PHẦN CHÍNH ────────────── */}
        <div className="order-map-wrapper" style={{ minHeight: 600 }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid slice"
            style={{ background: '#0A0D13' }}
          >
            {/* Grid Pattern */}
            <defs>
              <pattern id="trackGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(38, 46, 60, 0.4)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#trackGrid)" />

            {/* Road lines */}
            <path d="M 50,200 L 750,200 M 50,380 L 750,380" stroke="rgba(38, 46, 60, 0.6)" strokeWidth="4" />
            <path d="M 180,50 L 180,550 M 550,50 L 550,550" stroke="rgba(38, 46, 60, 0.6)" strokeWidth="4" />

            {/* Traveled Route Segment (Solid Green #33D69F) */}
            <path
              d="M 180,380 L 300,280"
              fill="none"
              stroke="#33D69F"
              strokeWidth="6"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px rgba(51, 214, 159, 0.6))' }}
            />

            {/* Remaining Route Segment (Dashed Blue #3B82F6) */}
            <path
              d="M 300,280 C 400,200 480,180 550,180"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="5"
              strokeDasharray="8 8"
              strokeLinecap="round"
            />

            {/* Pickup Marker (Green) */}
            <g transform="translate(180, 380)">
              <circle r="14" fill="rgba(51, 214, 159, 0.25)" />
              <circle r="8" fill="#33D69F" />
              <text x="0" y="24" textAnchor="middle" fill="#33D69F" fontSize="11" fontWeight="600" fontFamily="Inter">
                LẤY HÀNG
              </text>
            </g>

            {/* Dropoff Marker (Blue) */}
            <g transform="translate(550, 180)">
              <circle r="14" fill="rgba(59, 130, 246, 0.25)" />
              <circle r="8" fill="#3B82F6" />
              <text x="0" y="24" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="600" fontFamily="Inter">
                GIAO HÀNG
              </text>
            </g>

            {/* Vehicle Puck (Rotating accent circle with direction arrow) */}
            <g transform={`translate(${vehiclePos.x}, ${vehiclePos.y})`}>
              {/* Outer Pulsing Glow */}
              <circle r="24" fill="rgba(59, 130, 246, 0.25)">
                <animate attributeName="r" values="20;28;20" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Main Puck Circle */}
              <circle r="16" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
              {/* Heading Pointer Arrow */}
              <g transform={`rotate(${vehiclePos.heading})`}>
                <polygon points="0,-10 6,6 0,2 -6,6" fill="#FFFFFF" />
              </g>
              {/* Vehicle Label Chip */}
              <rect x="-42" y="-36" width="84" height="20" rx="4" fill="#10141D" stroke="#3B82F6" strokeWidth="1" />
              <text x="0" y="-22" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono">
                51K-888.99
              </text>
            </g>
          </svg>
        </div>

        {/* ─── CARD NỔI BÊN CẠNH: BƯỚC TIẾN ĐỘ & TÀI XẾ ──── */}
        <div className="tracking-panel">
          <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.15rem' }}>
            Trạng Thái Đơn Hàng
          </h3>

          {/* Progress Bar 4 bước */}
          <div className="progress-stepper">
            <div className="progress-stepper-line">
              <div
                className="progress-stepper-fill"
                style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isActive = idx === currentStepIndex;

              return (
                <div key={step.key} className="progress-step-item">
                  <div
                    className={`step-circle ${
                      isCompleted ? 'step-circle--completed' : isActive ? 'step-circle--active' : ''
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`step-label ${
                      isCompleted ? 'step-label--completed' : isActive ? 'step-label--active' : ''
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Card Tài Xế */}
          <div className="driver-card">
            <div className="driver-avatar">TN</div>
            <div className="driver-info">
              <div className="driver-name">Nguyễn Văn Nam</div>
              <div className="driver-license">51K-888.99</div>
              <div className="driver-rating">★ 4.9 (128 chuyến) • Xe Tải 1 Tấn</div>
            </div>
            <div className="driver-actions">
              <button
                type="button"
                className="quick-action-btn"
                title="Gọi điện cho tài xế"
                onClick={() => toast.info('Đang kết nối cuộc gọi thoại tới 0908.123.456...', 'Gọi điện')}
              >
                <HiOutlinePhone />
              </button>
              <button
                type="button"
                className="quick-action-btn"
                title="Nhắn tin với tài xế"
                onClick={() => toast.info('Đã mở cửa sổ nhắn tin nhanh với tài xế', 'Chat')}
              >
                <HiOutlineChatAlt />
              </button>
            </div>
          </div>

          {/* Chi tiết vị trí */}
          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-panel-sub)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Điểm lấy hàng:</span>
              <span style={{ fontWeight: 600 }}>123 Nguyễn Trãi, Q.5</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Điểm giao hàng:</span>
              <span style={{ fontWeight: 600 }}>45 Lê Duẩn, Q.1</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Dự kiến hoàn thành:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                10:45 AM (Còn 12 phút)
              </span>
            </div>
          </div>

          {/* Nút Hủy Đơn */}
          <button type="button" className="btn-cancel-order" onClick={handleCancelClick}>
            Hủy Đơn Hàng
          </button>
        </div>
      </div>

      {/* ─── MODAL XÁC NHẬN HỦY ĐƠN VỚI LÝ DO ─────────── */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
            <div className="modal__header">
              <h2 className="modal__title" style={{ fontFamily: 'var(--font-heading)', color: 'var(--accent-red)' }}>
                ⚠ Xác Nhận Hủy Đơn Hàng
              </h2>
              <button className="toast-card__close" onClick={() => setShowCancelModal(false)}>
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Tài xế đã nhận đơn và đang trên đường di chuyển. Vui lòng chọn lý do trước khi xác nhận hủy đơn:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-group__label">Lý do hủy đơn:</label>
                <select
                  className="location-input"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                >
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-group__label">Ghi chú thêm (không bắt buộc):</label>
                <textarea
                  className="location-input"
                  rows={3}
                  placeholder="Nhập ghi chú giải thích thêm..."
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--danger"
                  style={{ flex: 1, background: 'var(--accent-red)' }}
                  disabled={canceling}
                  onClick={executeCancel}
                >
                  {canceling ? 'Đang hủy...' : 'Xác Nhận Hủy'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowCancelModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerTrackingPage;
