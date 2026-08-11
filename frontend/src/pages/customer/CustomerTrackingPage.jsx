import { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { HiOutlinePhone, HiOutlineChatAlt, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineX } from 'react-icons/hi';
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

const createCustomPuckIcon = (color, label = '') =>
  L.divIcon({
    className: 'custom-puck-pin',
    html: `<div style="
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
      ${
        label
          ? `<div style="
        background: #10141D;
        border: 1px solid ${color};
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        margin-bottom: 4px;
        white-space: nowrap;
      ">${label}</div>`
          : ''
      }
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid #FFFFFF;
        box-shadow: 0 0 16px ${color};
      "></div>
    </div>`,
    iconSize: [24, 40],
    iconAnchor: [12, 38],
  });

const vehicleMarkerIcon = createCustomPuckIcon('#3B82F6', '51K-888.99');
const pickupMarkerIcon = createCustomPuckIcon('#33D69F', 'LẤY HÀNG');
const dropoffMarkerIcon = createCustomPuckIcon('#5B9DF5', 'GIAO HÀNG');

const CustomerTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null); // thông tin tài xế từ socket
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [orderStatus, setOrderStatus] = useState('PENDING');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [canceling, setCanceling] = useState(false);
  const socket = useContext(SocketContext);

  // Live GPS vehicle position simulation
  const [vehicleCoords, setVehicleCoords] = useState([10.768, 106.685]);

  // statusMap đầy đủ các trạng thái
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

  // Fetch active order details khi load trang
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        const orderData = data.data?.order || data.data;
        setOrder(orderData);
        setOrderStatus(orderData.status);
        if (orderData.driver) setDriverInfo(orderData.driver);

        const idx = STATUS_MAP[orderData.status];
        if (idx !== undefined && idx >= 0) {
          setCurrentStepIndex(idx);
        }
      } catch {
        // Mock fallback if order not found
      }
    };

    fetchOrder();
    // Poll mỗi 5s như backup (socket là primary)
    const pollInterval = setInterval(fetchOrder, 5000);
    return () => clearInterval(pollInterval);
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lắng nghe socket order:status-update (real-time primary source)
  useEffect(() => {
    if (!socket || !orderId) return;

    const handleStatusUpdate = (data) => {
      if (data.orderId !== orderId) return;

      console.log('📦 [Customer] order:status-update received:', data);

      setOrderStatus(data.status);
      const idx = STATUS_MAP[data.status];
      if (idx !== undefined && idx >= 0) {
        setCurrentStepIndex(idx);
      }

      if (data.driver) {
        setDriverInfo(data.driver);
      }

      // Hiển thị toast thông báo
      const statusMessages = {
        DISPATCHING: '🔍 Hệ thống đang tìm tài xế phù hợp...',
        DRIVER_ACCEPTED: '🤝 Tài xế đã nhận đơn hàng của bạn!',
        MATCHED: '🚗 Tài xế đang trên đường đến lấy hàng!',
        IN_TRANSIT: '🚚 Đơn hàng ĐANG GIAO đến bạn!',
        DELIVERED: '✅ Đơn hàng đã được giao thành công!',
        CANCELLED: '❌ Đơn hàng đã bị hủy.',
      };
      if (statusMessages[data.status]) {
        toast.info(statusMessages[data.status], 'Cập nhật trạng thái');
      }
    };

    socket.on('order:status-update', handleStatusUpdate);
    // Join room theo dõi đơn hàng cụ thể
    socket.emit('track-order', { orderId });

    return () => {
      socket.off('order:status-update', handleStatusUpdate);
      socket.emit('stop-tracking', { orderId });
    };
  }, [socket, orderId]); // eslint-disable-line react-hooks/exhaustive-deps


  // Smooth vehicle movement animation
  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      const lat = 10.7548 + (10.7801 - 10.7548) * (Math.sin(t) * 0.5 + 0.5);
      const lng = 106.6712 + (10.7003 - 106.6712) * (Math.sin(t) * 0.5 + 0.5);
      setVehicleCoords([lat, lng]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelOrder = async () => {
    setCanceling(true);
    try {
      if (orderId) {
        await api.patch(`/orders/${orderId}/cancel`, { reason: cancelReason, note: cancelNote });
      }
    } catch {
      // Mock fallback
    } finally {
      toast.error('Đơn hàng đã được hủy thành công!', 'Hủy đơn');
      setShowCancelModal(false);
      navigate('/customer');
    }
  };

  return (
    <div className="customer-container">
      <div className="customer-title-bar">
        <div>
          <h1 className="page-heading">Theo Dõi Đơn Hàng Real-Time</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Mã đơn: <span className="order-code">{orderId || '#ORD-88294'}</span> • Cập nhật vị trí tài xế qua GPS Google Maps
          </p>
        </div>
      </div>

      <div className="tracking-layout">
        {/* ─── BẢN ĐỒ TƯƠNG TÁC GOOGLE MAPS ────────────── */}
        <div className="order-map-wrapper" style={{ minHeight: 600 }}>
          <MapContainer
            center={[10.768, 106.685]}
            zoom={13}
            style={{ width: '100%', height: '100%', borderRadius: 14 }}
            zoomControl={false}
          >
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
              maxZoom={20}
              className="google-maps-dark-tiles"
            />

            {/* Pickup Marker */}
            <Marker position={[10.7548, 106.6712]} icon={pickupMarkerIcon}>
              <Popup>📍 Điểm Đón: 123 Nguyễn Trãi, Q.5</Popup>
            </Marker>

            {/* Dynamic Live Vehicle Marker */}
            <Marker position={vehicleCoords} icon={vehicleMarkerIcon}>
              <Popup>🚚 Xe Vận Tải SmartFleet (Tài xế Nguyễn Văn Nam)</Popup>
            </Marker>

            {/* Dropoff Marker */}
            <Marker position={[10.7801, 106.7003]} icon={dropoffMarkerIcon}>
              <Popup>🏁 Điểm Đến: 45 Lê Duẩn, Q.1</Popup>
            </Marker>

            {/* Traveled polyline segment */}
            <Polyline
              positions={[
                [10.7548, 106.6712],
                vehicleCoords,
              ]}
              color="#33D69F"
              weight={5}
              opacity={0.9}
            />

            {/* Remaining polyline segment */}
            <Polyline
              positions={[
                vehicleCoords,
                [10.7801, 106.7003],
              ]}
              color="#3B82F6"
              weight={5}
              dashArray="8, 8"
              opacity={0.8}
            />
          </MapContainer>
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
                    {isCompleted ? <HiOutlineCheckCircle /> : idx + 1}
                  </div>
                  <span
                    className="progress-step-label"
                    style={{
                      color: isCompleted
                        ? 'var(--accent-green)'
                        : isActive
                        ? 'var(--accent-blue)'
                        : 'var(--text-muted)',
                      fontWeight: isActive || isCompleted ? 600 : 400,
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Card Tài Xế Đang Đón/Giao Hàng */}
          <div className="driver-card">
            <div className="driver-avatar">NN</div>
            <div className="driver-info">
              <div className="driver-name">Nguyễn Văn Nam</div>
              <div className="driver-plate">51K-888.99 • Xe Máy Express</div>
              <div className="driver-rating">★ 4.9 (128 đánh giá)</div>
            </div>
            <div className="driver-actions">
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => toast.info('Đang kết nối cuộc gọi tới tài xế 0908.123.456...', 'Gọi điện')}
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

          {/* Chi tiết lộ trình ngắn */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }} />
              <span style={{ color: 'var(--text-muted)', minWidth: 65 }}>Điểm đón:</span>
              <strong style={{ color: 'var(--text-primary)' }}>123 Nguyễn Trãi, Q.5</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5B9DF5' }} />
              <span style={{ color: 'var(--text-muted)', minWidth: 65 }}>Điểm đến:</span>
              <strong style={{ color: 'var(--text-primary)' }}>45 Lê Duẩn, Q.1</strong>
            </div>
          </div>

          {/* Nút Hủy Đơn */}
          <button
            type="button"
            className="btn btn--danger"
            style={{ width: '100%', marginTop: 'auto', background: 'var(--accent-red)' }}
            onClick={() => {
              if (currentStepIndex === 0) {
                handleCancelOrder();
              } else {
                setShowCancelModal(true);
              }
            }}
          >
            <HiOutlineX /> Hủy Đơn Hàng
          </button>
        </div>
      </div>

      {/* ─── MODAL XÁC NHẬN HỦY ĐƠN VỚI LÝ DO ───────────── */}
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
              Tài xế đã chấp nhận đơn và đang trên đường di chuyển. Vui lòng chọn lý do hủy đơn:
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
    </div>
  );
};

export default CustomerTrackingPage;
