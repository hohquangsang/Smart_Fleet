import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { HiOutlinePhone, HiOutlineChatAlt, HiOutlineCheckCircle, HiOutlineUpload, HiOutlineLocationMarker, HiOutlineArrowRight, HiOutlineRefresh } from 'react-icons/hi';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import api from '../../services/api';
import '../../styles/driver.css';

const INCIDENTS = [
  'Kẹt xe nghiêm trọng / Tắc đường',
  'Xe gặp sự cố hỏng hóc / Thủng lốp',
  'Khách hàng không bắt máy / Không liên lạc được',
  'Địa chỉ nhận hàng bị đóng cửa',
  'Sự cố khác',
];

// Custom Puck Markers
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
        font-family: 'Inter', sans-serif;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        margin-bottom: 4px;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      ">${label}</div>`
          : ''
      }
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid #FFFFFF;
        box-shadow: 0 0 18px ${color};
      "></div>
    </div>`,
    iconSize: [140, 52],
    iconAnchor: [70, 48],
  });

const driverPuckIcon = createCustomPuckIcon('#3B82F6', '📍 VỊ TRÍ GPS CỦA BẠN');
const pickupPuckIcon = createCustomPuckIcon('#33D69F', '📦 ĐIỂM LẤY HÀNG');
const dropoffPuckIcon = createCustomPuckIcon('#5B9DF5', '🏁 ĐIỂM GIAO HÀNG');

// Haversine Distance Calculation in Meters
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

const RecenterMap = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] && coords[1]) {
      map.flyTo(coords, 15, { animate: true });
    }
  }, [coords, map]);
  return null;
};

const getSavedGpsCoords = () => {
  try {
    const saved = localStorage.getItem('driver_gps_coords');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 2 && !isNaN(parsed[0]) && !isNaN(parsed[1])) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved GPS coords:', e);
  }
  return [10.7769, 106.7009];
};

const ActiveTripPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const socket = useContext(SocketContext);

  const initialOrderId = location.state?.orderId || localStorage.getItem('activeOrderId');
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live Driver GPS Coordinates (persisted from localStorage, no auto-fetch on mount)
  const [driverCoords, setDriverCoords] = useState(getSavedGpsCoords);

  // Trip stage: 1 = En route to Pickup, 2 = Delivering (IN_TRANSIT), 3 = Completed (DELIVERED)
  const [tripStage, setTripStage] = useState(1);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Test bypass toggle for radius check
  const [testBypassRadius, setTestBypassRadius] = useState(true);

  // Proof of Delivery Modal
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [completingDelivery, setCompletingDelivery] = useState(false);

  // Incident Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(INCIDENTS[0]);

  // Request browser geolocation ONLY when driver clicks "Cập Nhật GPS"
  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Trình duyệt không hỗ trợ Geolocation GPS', 'Lỗi GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newCoords = [latitude, longitude];
        const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const newStatus = `GPS Hiện Tại: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (${nowTime})`;

        setDriverCoords(newCoords);

        try {
          localStorage.setItem('driver_gps_coords', JSON.stringify(newCoords));
          localStorage.setItem('driver_gps_status', newStatus);
        } catch (e) {
          console.warn('Error saving GPS to localStorage:', e);
        }

        if (socket && orderId) {
          socket.emit('driver:location-update', { orderId, lat: latitude, lng: longitude });
        }
        toast.success(`Đã cập nhật vị trí GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'Cập Nhật GPS');
      },
      (err) => {
        console.warn('GPS error:', err.message);
        toast.error('Không thể lấy vị trí GPS hiện tại', 'Lỗi GPS');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Fetch Order details
  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        let fetchedOrder = null;
        if (orderId) {
          try {
            const { data } = await api.get(`/orders/${orderId}`);
            const o = data?.data?.order || data?.data;
            if (o && ['DRIVER_ACCEPTED', 'MATCHED', 'IN_TRANSIT'].includes(o.status)) {
              fetchedOrder = o;
            }
          } catch {
            // orderId not found
          }
        }

        if (!fetchedOrder) {
          // Check driver's active orders from API
          const { data } = await api.get('/orders', { params: { limit: 5 } });
          const orders = data?.data?.orders || [];
          const activeOrder = orders.find((o) =>
            ['DRIVER_ACCEPTED', 'MATCHED', 'IN_TRANSIT'].includes(o.status)
          );
          if (activeOrder) {
            fetchedOrder = activeOrder;
            setOrderId(activeOrder.id);
            localStorage.setItem('activeOrderId', activeOrder.id);
          } else {
            localStorage.removeItem('activeOrderId');
            setOrderId(null);
          }
        }

        if (fetchedOrder) {
          setOrder(fetchedOrder);
          if (fetchedOrder.status === 'IN_TRANSIT') {
            setTripStage(2);
          } else if (fetchedOrder.status === 'DELIVERED' || fetchedOrder.status === 'COMPLETED') {
            setTripStage(3);
          } else {
            setTripStage(1);
          }
        } else {
          setOrder(null);
        }
      } catch (err) {
        console.error('Failed to load active order:', err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Calculate distance to pickup point if order exists
  const pickupLat = order?.pickupLat;
  const pickupLng = order?.pickupLng;
  const dropoffLat = order?.dropoffLat;
  const dropoffLng = order?.dropoffLng;

  const distanceToPickupMeters =
    pickupLat && pickupLng
      ? calculateDistanceMeters(driverCoords[0], driverCoords[1], pickupLat, pickupLng)
      : 0;

  const isWithinPickupRadius = distanceToPickupMeters <= 200 || testBypassRadius;

  // Step 3: Transition Stage 1 → Stage 2 (Bắt đầu giao hàng)
  const handleStartTrip = async () => {
    if (!orderId || updatingStage) return;

    setUpdatingStage(true);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'IN_TRANSIT' });

      if (socket) {
        socket.emit('order:status-update', {
          orderId,
          status: 'IN_TRANSIT',
          label: 'ĐANG GIAO',
        });
      }

      setTripStage(2);
      toast.success('Đã xác nhận đến điểm lấy hàng! Bắt đầu chuyển sang GIAI ĐOẠN 2: GIAO HÀNG.', 'Bắt đầu giao');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể chuyển trạng thái sang ĐANG GIAO';
      toast.error(msg, 'Lỗi');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Step 4: Open Proof of Delivery Modal
  const handleOpenProofModal = () => {
    setShowProofModal(true);
  };

  const handleProofImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh quá lớn (tối đa 5MB)', 'Lỗi hình ảnh');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result);
      toast.success('Đã tải lên ảnh chụp giao hàng!', 'Tải ảnh');
    };
    reader.readAsDataURL(file);
  };

  // Step 4 Complete Delivery: Call API complete-trip with photo
  const handleConfirmDelivery = async () => {
    if (!orderId || completingDelivery) return;

    setCompletingDelivery(true);
    try {
      await api.post(`/orders/${orderId}/complete-trip`, {
        proofImage,
        deliveredLat: driverCoords[0],
        deliveredLng: driverCoords[1],
        deliveryNotes,
      });

      if (socket) {
        socket.emit('order:status-update', {
          orderId,
          status: 'DELIVERED',
          label: 'ĐÃ GIAO HÀNG',
          proofImage,
        });
      }

      setShowProofModal(false);
      setTripStage(3);
      localStorage.removeItem('activeOrderId');
      setOrder(null);
      setOrderId(null);
      toast.success('GIAO HÀNG THÀNH CÔNG! Đơn hàng đã được xác nhận hoàn thành.', 'Hoàn tất chuyến');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể hoàn tất đơn hàng';
      toast.error(msg, 'Lỗi giao hàng');
    } finally {
      setCompletingDelivery(false);
    }
  };

  const handleSendIncident = () => {
    toast.error(`Đã gửi báo cáo sự cố: "${selectedIncident}" tới Admin!`, 'Cảnh báo sự cố');
    setShowIncidentModal(false);
  };

  return (
    <div className="driver-container">
      {/* ─── TIÊU ĐỀ TRANG ────────────────────────────── */}
      <div className="driver-header-bar">
        <div>
          <h1 className="driver-title">Đang Thực Hiện Chuyến Hàng Real-Time</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {order ? (
              <>
                Mã đơn: <span className="order-code">{`#ORD-${order.id.slice(-8).toUpperCase()}`}</span> • Điều hướng GPS thời gian thực
              </>
            ) : (
              'Chưa có đơn hàng nào đang thực hiện • Vị trí GPS của bạn được định vị thời gian thực'
            )}
          </p>
        </div>

        {order && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={requestGpsLocation}
              style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
              title="Bấm để cập nhật vị trí GPS hiện tại"
            >
              <HiOutlineRefresh /> Cập Nhật GPS
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setTestBypassRadius(!testBypassRadius)}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              {testBypassRadius ? '⚡ Thử nghiệm: Bỏ qua bán kính' : '🔒 Bán kính GPS thực'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải thông tin lộ trình chuyến hàng...
        </div>
      ) : (
        <div className="active-trip-layout">
          {/* ─── BẢN ĐỒ LEAFLET CHỈ HIỂN THỊ MARKERS KHI CÓ ĐƠN HÀNG HỢP LỆ ─── */}
          <div className="order-map-wrapper" style={{ minHeight: 560, position: 'relative' }}>
            <MapContainer
              center={driverCoords}
              zoom={14}
              style={{ width: '100%', height: '100%', borderRadius: 14 }}
              zoomControl={false}
            >
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
                maxZoom={20}
                className="google-maps-dark-tiles"
              />
              <RecenterMap coords={driverCoords} />

              {/* Marker Vị trí Tài xế (GPS Thực) */}
              <Marker position={driverCoords} icon={driverPuckIcon}>
                <Popup>📍 Vị trí GPS hiện tại của Bạn</Popup>
              </Marker>

              {/* Chỉ render Điểm lấy hàng & Điểm giao hàng khi CÓ ĐƠN HÀNG THỰC TẾ */}
              {order && pickupLat && pickupLng && (
                <Marker position={[pickupLat, pickupLng]} icon={pickupPuckIcon}>
                  <Popup>📦 Điểm Lấy Hàng: {order.pickupAddress}</Popup>
                </Marker>
              )}

              {order && dropoffLat && dropoffLng && (
                <Marker position={[dropoffLat, dropoffLng]} icon={dropoffPuckIcon}>
                  <Popup>🏁 Điểm Giao Hàng: {order.dropoffAddress}</Popup>
                </Marker>
              )}

              {/* Polyline Stage 1: Driver -> Pickup */}
              {order && tripStage === 1 && pickupLat && pickupLng && (
                <Polyline
                  positions={[
                    driverCoords,
                    [pickupLat, pickupLng],
                  ]}
                  color="#33D69F"
                  weight={5}
                  opacity={0.85}
                  dashArray="6, 6"
                />
              )}

              {/* Polyline Stage 2: Driver -> Dropoff */}
              {order && tripStage >= 2 && dropoffLat && dropoffLng && (
                <Polyline
                  positions={[
                    driverCoords,
                    [dropoffLat, dropoffLng],
                  ]}
                  color="#3B82F6"
                  weight={6}
                  opacity={0.9}
                />
              )}
            </MapContainer>
          </div>

          {/* ─── CỘT BẢNG TIẾN ĐỘ HOẶC MÀN HÌNH CHỜ NHẬN ĐƠN ────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!order ? (
              /* EMPTY STATE KHI CHƯA CÓ ĐƠN HÀNG */
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 14,
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1.25rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                  }}
                >
                  🛵
                </div>

                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    Chưa Có Chuyến Xe Đang Thực Hiện
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
                    Bạn hiện chưa có chuyến xe nào cần thực hiện. Hãy bật trạng thái sẵn sàng và chuyển sang màn hình <strong>Nhận đơn Real-Time</strong> để theo dõi và nhận các chuyến hàng mới nhất!
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn--primary"
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    background: 'var(--gradient-blue)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    marginTop: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  onClick={() => navigate('/driver/dispatch')}
                >
                  Chuyển Đến Nhận Đơn Real-Time <HiOutlineArrowRight />
                </button>
              </div>
            ) : (
              /* PANEL TIẾN ĐỘ KHI CÓ ĐƠN HÀNG THỰC TẾ */
              <>
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 14,
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}
                >
                  {/* GIAI ĐOẠN 1: ĐANG ĐẾN ĐIỂM LẤY HÀNG */}
                  {tripStage === 1 && (
                    <>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                            GIAI ĐOẠN 1 / 2
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: isWithinPickupRadius ? 'rgba(51, 214, 159, 0.15)' : 'rgba(245, 166, 35, 0.15)',
                              color: isWithinPickupRadius ? 'var(--accent-green)' : '#F5A623',
                              fontWeight: 700,
                            }}
                          >
                            Cách điểm đón: {distanceToPickupMeters}m
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: 6, fontWeight: 700 }}>
                          Đang đến điểm lấy hàng
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 6, background: 'var(--bg-panel-sub)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                          📍 <strong>Địa chỉ đón:</strong> {order.pickupAddress}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="step-action-button step-action-button--blue"
                        onClick={handleStartTrip}
                        disabled={!isWithinPickupRadius || updatingStage}
                        style={{
                          opacity: !isWithinPickupRadius || updatingStage ? 0.5 : 1,
                          cursor: !isWithinPickupRadius ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {updatingStage
                          ? 'Đang cập nhật...'
                          : !isWithinPickupRadius
                          ? `ĐỐI CHIẾU GPS (Cách ${distanceToPickupMeters}m)`
                          : 'ĐÃ ĐẾN — Bắt Đầu Giao Hàng ➔'}
                      </button>
                    </>
                  )}

                  {/* GIAI ĐOẠN 2: ĐANG GIAO HÀNG */}
                  {tripStage === 2 && (
                    <>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 700, textTransform: 'uppercase' }}>
                          GIAI ĐOẠN 2 / 2 • AI OPTIMIZED ROUTE
                        </span>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: 6, fontWeight: 700 }}>
                          Đang giao hàng tới người nhận
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 6, background: 'var(--bg-panel-sub)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                          🏁 <strong>Địa chỉ giao:</strong> {order.dropoffAddress}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="step-action-button step-action-button--green"
                        onClick={handleOpenProofModal}
                      >
                        GIAO HÀNG — Xác Nhận Hoàn Thành ✓
                      </button>
                    </>
                  )}

                  {/* GIAI ĐOẠN 3: HOÀN TẤT CHUYẾN XE */}
                  {tripStage === 3 && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <HiOutlineCheckCircle style={{ fontSize: '3.5rem', color: 'var(--accent-green)', margin: '0 auto' }} />
                      <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginTop: 10, fontWeight: 700 }}>
                        CHUYẾN XE ĐÃ HOÀN TẤT!
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0 1.25rem 0' }}>
                        Đơn hàng đã được xác nhận giao thành công. Doanh thu đã được ghi nhận vào ví tài xế.
                      </p>
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ width: '100%', padding: '0.85rem', background: 'var(--gradient-blue)' }}
                        onClick={() => navigate('/driver/dispatch')}
                      >
                        Tiếp Tục Nhận Đơn Real-Time 🚀
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Khách Hàng */}
                <div className="driver-card">
                  <div className="driver-avatar" style={{ borderColor: 'var(--accent-green)' }}>
                    {order.customer?.fullName
                      ? order.customer.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'KH'}
                  </div>
                  <div className="driver-info">
                    <div className="driver-name">{order.customer?.fullName || 'Khách Hàng SmartFleet'}</div>
                    <div className="order-code">{`#ORD-${order.id.slice(-8).toUpperCase()}`}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Cước phí: <strong>{Number(order.totalFare).toLocaleString('vi-VN')} đ</strong>
                    </div>
                  </div>
                  <div className="driver-actions">
                    <button
                      type="button"
                      className="quick-action-btn"
                      onClick={() => toast.info(`Gọi tới khách hàng ${order.customer?.phoneNumber || '0908.123.456'}...`, 'Gọi điện')}
                      title="Gọi cho khách hàng"
                    >
                      <HiOutlinePhone />
                    </button>
                    <button
                      type="button"
                      className="quick-action-btn"
                      onClick={() => toast.info('Mở chat nhắn tin trực tiếp với khách hàng...', 'Nhắn tin')}
                      title="Nhắn tin với khách hàng"
                    >
                      <HiOutlineChatAlt />
                    </button>
                  </div>
                </div>

                {/* Báo Sự Cố */}
                <button type="button" className="btn-incident" onClick={() => setShowIncidentModal(true)}>
                  ⚠️ Báo Sự Cố Khẩn Cấp
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL TẢI ẢNH XÁC NHẬN GIAO HÀNG (PROOF OF DELIVERY) ─── */}
      {showProofModal && (
        <div className="modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal__header">
              <h2 className="modal__title" style={{ fontFamily: 'var(--font-heading)', color: 'var(--accent-green)' }}>
                📸 Xác Nhận Giao Hàng Thành Công
              </h2>
              <button className="toast-card__close" onClick={() => setShowProofModal(false)}>
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Vui lòng chụp hoặc chọn ảnh hóa đơn / hàng hóa đã bàn giao làm bằng chứng giao hàng:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="doc-preview-area" style={{ height: 200 }}>
                {proofImage ? (
                  <div className="doc-image-wrapper">
                    <img src={proofImage} alt="Ảnh xác nhận giao hàng" className="doc-img-preview" />
                  </div>
                ) : (
                  <div className="doc-empty-placeholder">
                    <HiOutlineUpload size={36} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Kéo thả hoặc bấm để chọn ảnh chụp giao hàng
                    </span>
                  </div>
                )}
              </div>

              <label className="btn btn--secondary file-input-label">
                <HiOutlineUpload /> {proofImage ? 'Thay Đổi Ảnh Xác Nhận' : 'Tải Lên Ảnh Xác Nhận Giao Hàng'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofImageUpload}
                  style={{ display: 'none' }}
                />
              </label>

              <div className="input-group">
                <label className="input-group__label">Ghi chú giao hàng (không bắt buộc):</label>
                <textarea
                  className="location-input"
                  rows={2}
                  placeholder="Ghi chú người nhận, mã vận đơn..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 1, background: 'var(--gradient-blue)' }}
                  disabled={completingDelivery}
                  onClick={handleConfirmDelivery}
                >
                  {completingDelivery ? 'Đang hoàn tất...' : 'Xác Nhận Hoàn Thành Giao Hàng'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowProofModal(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL BÁO SỰ CỐ ───────────────────────────── */}
      {showIncidentModal && (
        <div className="modal-overlay" onClick={() => setShowIncidentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
            <div className="modal__header">
              <h2 className="modal__title" style={{ fontFamily: 'var(--font-heading)', color: 'var(--accent-red)' }}>
                ⚠️ Báo Sự Cố Khẩn Cấp
              </h2>
              <button className="toast-card__close" onClick={() => setShowIncidentModal(false)}>
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Chọn nhanh sự cố đang gặp phải để gửi cảnh báo tới Admin Dashboard điều hành:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-group__label">Loại sự cố:</label>
                <select
                  className="location-input"
                  value={selectedIncident}
                  onChange={(e) => setSelectedIncident(e.target.value)}
                >
                  {INCIDENTS.map((inc) => (
                    <option key={inc} value={inc}>
                      {inc}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--danger"
                  style={{ flex: 1, background: 'var(--accent-red)' }}
                  onClick={handleSendIncident}
                >
                  Gửi Cảnh Báo Ngay
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowIncidentModal(false)}
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

export default ActiveTripPage;
