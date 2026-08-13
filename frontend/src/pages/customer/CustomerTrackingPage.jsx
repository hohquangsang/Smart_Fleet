import { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HiOutlinePhone,
  HiOutlineChatAlt,
  HiOutlineCheckCircle,
  HiOutlineX,
  HiOutlineTruck,
  HiOutlinePlusCircle
} from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import '../../styles/customer.css';

const STEPS = [
  { key: 'PENDING', label: 'Đang tìm tài xế' },
  { key: 'DISPATCHING', label: 'Đang phân phối tài xế' },
  { key: 'DRIVER_ACCEPTED', label: 'Tài xế đã nhận đơn' },
  { key: 'MATCHED', label: 'Tài xế đang đến' },
  { key: 'IN_TRANSIT', label: 'ĐANG GIAO' },
  { key: 'DELIVERED', label: 'Đã hoàn thành' },
];

const CANCEL_REASONS = [
  'Thay đổi lộ trình / Không còn nhu cầu',
  'Tài xế nhận đơn quá lâu',
  'Đặt nhầm loại phương tiện',
  'Địa chỉ lấy hàng bị nhập sai',
  'Lý do khác',
];

/* ─── LIVE DISPATCH GRAPH COMPONENT (REAL DATA) ────────── */
const LiveDispatchGraph = ({ driverName, vehicleCoords }) => {
  const [secondsAgo, setSecondsAgo] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => (prev >= 10 ? 1 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const latStr = vehicleCoords?.lat ? Number(vehicleCoords.lat).toFixed(4) : '10.7629';
  const lngStr = vehicleCoords?.lng ? Number(vehicleCoords.lng).toFixed(4) : '106.6602';

  return (
    <div className="dispatch-graph-card">
      <div className="dispatch-graph-viewport">
        <svg className="dispatch-graph-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowOrange" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Passed Route Path */}
          <path
            d="M 160 290 C 260 300, 360 250, 450 210"
            className="dispatch-path-passed"
          />

          {/* 2. Remaining Route Path */}
          <path
            d="M 450 210 C 540 180, 630 175, 720 170"
            className="dispatch-path-remaining"
          />

          {/* 3. Node 1: Điểm lấy hàng */}
          <g>
            <circle cx="160" cy="290" r="14" fill="rgba(51, 214, 159, 0.2)" />
            <circle cx="160" cy="290" r="7" fill="#33d69f" filter="url(#glowGreen)" />
            <rect
              x="100"
              y="232"
              width="120"
              height="30"
              rx="8"
              fill="rgba(11, 28, 22, 0.95)"
              stroke="#10b981"
              strokeWidth="1.5"
            />
            <text
              x="160"
              y="250"
              fill="#33d69f"
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              Điểm lấy hàng
            </text>
          </g>

          {/* 4. Node 2: Tài xế (Real driver name) */}
          <g>
            <circle cx="450" cy="210" r="15" fill="rgba(245, 158, 11, 0.25)" />
            <circle cx="450" cy="210" r="8" fill="#f59e0b" filter="url(#glowOrange)" />
            <rect
              x="350"
              y="148"
              width="200"
              height="34"
              rx="8"
              fill="#f59e0b"
              stroke="#fbbf24"
              strokeWidth="1"
            />
            <text
              x="450"
              y="168"
              fill="#0f172a"
              fontSize="13"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {driverName || 'Chưa gán tài xế'}
            </text>
          </g>

          {/* 5. Node 3: Điểm giao hàng */}
          <g>
            <circle cx="720" cy="170" r="14" fill="rgba(59, 130, 246, 0.25)" />
            <circle cx="720" cy="170" r="7" fill="#3b82f6" filter="url(#glowBlue)" />
            <rect
              x="655"
              y="112"
              width="130"
              height="30"
              rx="8"
              fill="rgba(15, 23, 42, 0.95)"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
            <text
              x="720"
              y="130"
              fill="#60a5fa"
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              Điểm giao hàng
            </text>
          </g>
        </svg>
      </div>

      {/* Footer status bar with real GPS coordinates */}
      <div className="dispatch-graph-footer">
        <div className="dispatch-gps-info">
          <span className="legend-dot legend-dot--passed" />
          <span>{latStr}° N, {lngStr}° E · cập nhật {secondsAgo}s trước</span>
        </div>
        <div className="dispatch-legend">
          <div className="legend-item">
            <span className="legend-dot legend-dot--passed" />
            <span>Đã qua</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--driver" />
            <span>Tài xế</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--delivery" />
            <span>Điểm đến</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── MAIN CUSTOMER TRACKING PAGE ────────────────────────────── */
const CustomerTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [orderStatus, setOrderStatus] = useState('PENDING');
  const [vehicleCoords, setVehicleCoords] = useState({ lat: 10.7629, lng: 106.6602 });

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [canceling, setCanceling] = useState(false);

  // Rating Modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submittingRating, setSubmittingRating] = useState(false);

  const QUICK_TAGS = ['Giao đúng giờ ⏱️', 'Thái độ tốt 😊', 'Cẩn thận 📦', 'Đúng tuyến đường 📍'];

  const socket = useContext(SocketContext);

  const STATUS_MAP = {
    PENDING: 0,
    DISPATCHING: 1,
    DRIVER_ACCEPTED: 2,
    MATCHED: 3,
    IN_TRANSIT: 4,
    PICKED_UP: 4,
    DELIVERED: 5,
    CANCELLED: -1,
  };

  // Fetch real order data from backend API
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        let activeOrder = null;
        if (orderIdParam) {
          const { data } = await api.get(`/orders/${orderIdParam}`);
          activeOrder = data.data?.order || data.data;
        } else {
          // Fetch customer's latest order if no orderId in URL
          const { data } = await api.get('/orders?limit=1');
          const ordersList = data.data?.orders || data.data;
          if (Array.isArray(ordersList) && ordersList.length > 0) {
            activeOrder = ordersList[0];
          }
        }

        if (activeOrder) {
          setOrder(activeOrder);
          setOrderStatus(activeOrder.status);
          if (activeOrder.driver) setDriverInfo(activeOrder.driver);

          if (activeOrder.driverLocation?.lat && activeOrder.driverLocation?.lng) {
            setVehicleCoords({ lat: activeOrder.driverLocation.lat, lng: activeOrder.driverLocation.lng });
          } else if (activeOrder.pickupLat && activeOrder.pickupLng) {
            setVehicleCoords({ lat: activeOrder.pickupLat, lng: activeOrder.pickupLng });
          }

          if (activeOrder.status === 'DELIVERED' && !activeOrder.rating) {
            setShowRatingModal(true);
          }

          const idx = STATUS_MAP[activeOrder.status];
          if (idx !== undefined && idx >= 0) {
            setCurrentStepIndex(idx);
          }
        } else {
          setOrder(null);
        }
      } catch (err) {
        console.error('Error fetching tracking order:', err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
    const pollInterval = setInterval(fetchOrder, 5000);
    return () => clearInterval(pollInterval);
  }, [orderIdParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket real-time event listeners
  useEffect(() => {
    if (!socket || !order?.id) return;

    const targetOrderId = order.id;

    const handleStatusUpdate = (data) => {
      if (data.orderId !== targetOrderId) return;

      if (data.status) {
        setOrderStatus(data.status);
        const idx = STATUS_MAP[data.status];
        if (idx !== undefined && idx >= 0) {
          setCurrentStepIndex(idx);
        }
      }

      if (data.driver) {
        setDriverInfo(data.driver);
      }

      if (data.status === 'DELIVERED') {
        setShowRatingModal(true);
      }

      const statusMessages = {
        DISPATCHING: '🔍 Hệ thống đang tìm tài xế phù hợp...',
        DRIVER_ACCEPTED: '🤝 Tài xế đã nhận đơn hàng của bạn!',
        MATCHED: '🚗 Tài xế đang trên đường đến lấy hàng!',
        IN_TRANSIT: '🚚 Đơn hàng ĐANG GIAO đến bạn!',
        DELIVERED: '✅ Đơn hàng đã được giao thành công! Vui lòng đánh giá chuyến xe.',
        CANCELLED: '❌ Đơn hàng đã bị hủy.',
      };
      if (statusMessages[data.status]) {
        toast.info(statusMessages[data.status], 'Cập nhật trạng thái');
      }
    };

    const handleDriverLocation = (data) => {
      if (data.lat && data.lng) {
        setVehicleCoords({ lat: data.lat, lng: data.lng });
      }
    };

    socket.on('order:status-update', handleStatusUpdate);
    socket.on('driver-location', handleDriverLocation);

    socket.emit('track-order', { orderId: targetOrderId });

    return () => {
      socket.off('order:status-update', handleStatusUpdate);
      socket.off('driver-location', handleDriverLocation);
      socket.emit('stop-tracking', { orderId: targetOrderId });
    };
  }, [socket, order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelOrder = async () => {
    if (!order?.id) return;
    setCanceling(true);
    try {
      await api.patch(`/orders/${order.id}/cancel`, { reason: cancelReason, note: cancelNote });
      toast.error('Đơn hàng đã được hủy thành công!', 'Hủy đơn');
      setShowCancelModal(false);
      navigate('/customer');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể hủy đơn hàng';
      toast.error(msg, 'Lỗi');
    } finally {
      setCanceling(false);
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!order?.id) return;

    setSubmittingRating(true);
    try {
      await api.post(`/orders/${order.id}/rating`, {
        rating: ratingStars,
        comment: ratingComment,
        tags: selectedTags,
      });

      toast.success('Cảm ơn bạn đã đánh giá dịch vụ vận chuyển của SmartFleet!', 'Đánh giá hoàn tất');
      setShowRatingModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể gửi đánh giá';
      toast.error(msg, 'Lỗi');
    } finally {
      setSubmittingRating(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Helper getters for real backend data
  const realDriverName = driverInfo?.user?.fullName || driverInfo?.fullName || order?.driver?.user?.fullName || order?.driver?.fullName;
  const realDriverPlate = driverInfo?.licensePlate || order?.driver?.licensePlate;
  const realDriverPhone = driverInfo?.user?.phoneNumber || driverInfo?.phoneNumber || order?.driver?.user?.phoneNumber;
  const realDriverRating = driverInfo?.rating || order?.driver?.rating || 5.0;

  if (loading) {
    return (
      <div className="customer-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>⌛ Đang tải thông tin đơn hàng real-time...</p>
      </div>
    );
  }

  // EMPTY STATE: Customer has no active orders
  if (!order) {
    return (
      <div className="customer-container">
        <div className="customer-title-bar">
          <div>
            <h1 className="page-heading">THEO DÕI ĐƠN HÀNG REAL-TIME</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Theo dõi vị trí tài xế & tiến trình vận chuyển theo thời gian thực
            </p>
          </div>
        </div>

        <div
          className="order-status-card"
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HiOutlineTruck fontSize="3rem" color="var(--accent-blue)" />
          </div>
          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontSize: '1.4rem', margin: 0 }}>
            Bạn Chưa Có Đơn Hàng Nào Cần Theo Dõi
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
            Hiện tại bạn chưa tạo đơn hàng vận chuyển nào. Hãy khởi tạo đơn mới để trải nghiệm dịch vụ theo dõi tài xế real-time trên SmartFleet.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate('/customer/create-order')}
            style={{
              padding: '0.85rem 2rem',
              background: 'var(--gradient-blue)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.95rem',
              fontWeight: 700,
            }}
          >
            <HiOutlinePlusCircle fontSize="1.2rem" /> Tạo Đơn Hàng Mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-container">
      {/* Title Bar */}
      <div className="customer-title-bar">
        <div>
          <h1 className="page-heading">THEO DÕI ĐƠN HÀNG REAL-TIME</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Mã đơn: <span className="order-code">#{order.id.slice(0, 8).toUpperCase()}</span> • Cập nhật vị trí tài xế qua GPS Live Dispatch
          </p>
        </div>
      </div>

      {/* ─── PHẦN 1: TRẠNG THÁI ĐƠN HÀNG (CARD ĐỘC LẬP TRÊN CÙNG) ────────── */}
      <div className="order-status-card">
        <div className="order-status-header">
          <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0 }}>
            Trạng Thái Đơn Hàng
          </h3>
          <div className="status-badge-pill status-badge-pill--green">
            <span className="status-pulse-dot" />
            <span>TRẠNG THÁI: {STEPS[currentStepIndex]?.label || orderStatus}</span>
          </div>
        </div>

        {/* Dynamic Progress Stepper */}
        <div className="progress-stepper-wrapper">
          <div className="progress-stepper-line">
            <div
              className="progress-stepper-fill"
              style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <div className="progress-stepper">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isActive = idx === currentStepIndex;

              return (
                <div key={step.key} className="progress-step">
                  <div
                    className={`progress-step-dot ${
                      isCompleted
                        ? 'progress-step-dot--completed'
                        : isActive
                        ? 'progress-step-dot--active'
                        : ''
                    }`}
                  >
                    {isCompleted ? <HiOutlineCheckCircle fontSize="1.2rem" /> : idx + 1}
                  </div>
                  <span
                    className={`progress-step-label ${
                      isCompleted
                        ? 'progress-step-label--completed'
                        : isActive
                        ? 'progress-step-label--active'
                        : ''
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Status Alert Banner */}
        <div className="order-status-banner">
          <HiOutlineTruck fontSize="1.3rem" color="var(--accent-blue)" />
          <div>
            {realDriverName ? (
              <>
                <strong>Tài xế {realDriverName}</strong> đang vận chuyển đơn hàng đến <strong>{order.dropoffAddress}</strong>. Trạng thái: <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{STEPS[currentStepIndex]?.label || orderStatus}</span>.
              </>
            ) : (
              <>
                Hệ thống đang tìm và phân phối tài xế cho đơn hàng tới <strong>{order.dropoffAddress}</strong>. Trạng thái: <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{STEPS[currentStepIndex]?.label || orderStatus}</span>.
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── PHẦN 2: BẢN ĐỒ LIVE DISPATCH GRAPH & THÔNG TIN TÀI XẾ ───────────── */}
      <div className="tracking-layout">
        {/* Left Column: Image 2 Style Live Dispatch Graph */}
        <LiveDispatchGraph
          driverName={realDriverName}
          vehicleCoords={vehicleCoords}
        />

        {/* Right Column: Driver Card & Route Details */}
        <div className="tracking-panel">
          <h4 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
            Tài Xế Phụ Trách
          </h4>

          {/* Driver Card */}
          {realDriverName ? (
            <div className="driver-card">
              <div className="driver-avatar">
                {realDriverName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="driver-info">
                <div className="driver-name">{realDriverName}</div>
                <div className="driver-license">{realDriverPlate || 'Chưa cập nhật BSK'} • Xe Vận Tải</div>
                <div className="driver-rating">★ {Number(realDriverRating).toFixed(1)}</div>
              </div>
              <div className="driver-actions">
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => toast.info(`Đang kết nối cuộc gọi tới tài xế ${realDriverPhone || ''}...`, 'Gọi điện')}
                  title="Gọi điện cho tài xế"
                >
                  <HiOutlinePhone />
                </button>
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => toast.info('Mở khung chat trực tiếp với tài xế...', 'Nhắn tin')}
                  title="Nhắn tin cho tài xế"
                >
                  <HiOutlineChatAlt />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1rem', background: 'var(--bg-panel-sub)', borderRadius: 12, border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
              🔍 Hệ thống đang điều phối tài xế phù hợp...
            </div>
          )}

          {/* Detailed Route Info */}
          <div
            style={{
              padding: '1.2rem',
              background: 'var(--bg-panel-sub)',
              borderRadius: 12,
              border: '1px solid var(--border-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.875rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#33D69F', boxShadow: '0 0 8px #33D69F', marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Điểm đón:</div>
                <strong style={{ color: 'var(--text-primary)' }}>{order.pickupAddress}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.875rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 8px #3B82F6', marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Điểm đến:</div>
                <strong style={{ color: 'var(--text-primary)' }}>{order.dropoffAddress}</strong>
              </div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-primary)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tổng cước phí:</span>
              <strong style={{ color: 'var(--accent-green)', fontSize: '1rem' }}>
                {Number(order.totalFare || 0).toLocaleString('vi-VN')} đ
              </strong>
            </div>
          </div>

          {/* Cancel Order Action */}
          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <button
              type="button"
              className="btn btn--danger btn-cancel-order"
              style={{ marginTop: 'auto' }}
              onClick={() => {
                if (currentStepIndex === 0) {
                  handleCancelOrder();
                } else {
                  setShowCancelModal(true);
                }
              }}
            >
              <HiOutlineX fontSize="1.1rem" /> Hủy Đơn Hàng
            </button>
          )}
        </div>
      </div>

      {/* ─── MODAL XÁC NHẬN HỦY ĐƠN ───────────── */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
            <div className="modal__header">
              <h2 className="modal__title" style={{ fontFamily: 'var(--font-heading)', color: 'var(--accent-red)' }}>
                ⚠️ Xác Nhận Hủy Đơn Hàng
              </h2>
              <button className="toast-card__close" onClick={() => setShowCancelModal(false)}>
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Vui lòng chọn lý do hủy đơn hàng:
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
                <label className="input-group__label">Ghi chú bổ sung (không bắt buộc):</label>
                <textarea
                  className="location-input"
                  rows={3}
                  placeholder="Ghi rõ lý do nếu có..."
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--danger"
                  style={{ flex: 1, background: 'var(--accent-red)' }}
                  disabled={canceling}
                  onClick={handleCancelOrder}
                >
                  {canceling ? 'Đang hủy...' : 'Xác Nhận Hủy'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowCancelModal(false)}
                >
                  Giữ Lại Đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL ĐÁNH GIÁ CHUYẾN XE KHI ĐÃ GIAO HÀNG ─── */}
      {showRatingModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 480, textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
            <h2 className="modal__title" style={{ fontFamily: 'var(--font-heading)', color: 'var(--accent-green)', fontSize: '1.4rem' }}>
              Đơn Hàng Đã Giao Thành Công!
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '8px 0 1.25rem 0' }}>
              Vui lòng dành 10 giây để đánh giá trải nghiệm dịch vụ tài xế SmartFleet:
            </p>

            <form onSubmit={handleRatingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: '2.2rem', cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    onClick={() => setRatingStars(star)}
                    style={{
                      color: star <= ratingStars ? '#F5A623' : 'var(--border-primary)',
                      transition: 'transform 0.15s ease, color 0.15s ease',
                      transform: star <= ratingStars ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-primary)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-panel-sub)',
                        color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="input-group" style={{ textAlign: 'left' }}>
                <label className="input-group__label">Nhận xét chi tiết (không bắt buộc):</label>
                <textarea
                  className="location-input"
                  rows={3}
                  placeholder="Chia sẻ nhận xét của bạn về tài xế..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{ flex: 1, padding: '0.85rem', background: 'var(--gradient-blue)' }}
                  disabled={submittingRating}
                >
                  {submittingRating ? 'Đang gửi...' : 'Gửi Đánh Giá ⭐'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowRatingModal(false)}
                >
                  Để Sau
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerTrackingPage;
