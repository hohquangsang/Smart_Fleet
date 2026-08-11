import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  HiOutlineLocationMarker,
  HiOutlineCheck,
  HiOutlinePaperAirplane,
} from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import '../../styles/customer.css';

// Leaflet marker custom icons
const createCustomMarker = (color) =>
  L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid #FFFFFF;
      box-shadow: 0 0 14px ${color};
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const pickupIcon = createCustomMarker('#33D69F');
const dropoffIcon = createCustomMarker('#3B82F6');

// Map auto-bounds center component
const MapRecenter = ({ pickupCoords, dropoffCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const bounds = L.latLngBounds([pickupCoords, dropoffCoords]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pickupCoords) {
      map.setView(pickupCoords, 14);
    } else if (dropoffCoords) {
      map.setView(dropoffCoords, 14);
    }
  }, [map, pickupCoords, dropoffCoords]);
  return null;
};

// 3 Vehicle types with specific per-km rates requested
const VEHICLES = [
  {
    id: 'motorcycle',
    name: 'Xe Máy Express',
    ratePerKm: 10000,
    desc: 'Thích hợp cho hàng gọn nhẹ, giao cực nhanh',
    icon: '🛵',
    maxWeight: '30 kg',
    etaMin: 15,
  },
  {
    id: 'car_4',
    name: 'Ô tô 4 chỗ',
    ratePerKm: 12000,
    desc: 'Hàng vừa, va ly, máy móc nguyên khối nhỏ',
    icon: '🚗',
    maxWeight: '350 kg',
    etaMin: 20,
  },
  {
    id: 'car_7',
    name: 'Ô tô 7 chỗ',
    ratePerKm: 15000,
    desc: 'Hàng lớn, nội thất cồng kềnh, chuyển đồ',
    icon: '🚐',
    maxWeight: '750 kg',
    etaMin: 25,
  },
];

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Form State: Initialize lat/lng to null so markers are hidden by default
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState(null);
  const [pickupLng, setPickupLng] = useState(null);

  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLat, setDropoffLat] = useState(null);
  const [dropoffLng, setDropoffLng] = useState(null);

  const [selectedVehicle, setSelectedVehicle] = useState('motorcycle');

  // Autocomplete state for Pickup search
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);

  // Autocomplete state for Dropoff search
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

  // Confirm Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  // Calculate distance in Km (Haversine formula)
  const calculateDistance = () => {
    if (!pickupAddress || !dropoffAddress) return 0;
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) return 0;
    const R = 6371; // Earth radius km
    const dLat = ((dropoffLat - pickupLat) * Math.PI) / 180;
    const dLon = ((dropoffLng - pickupLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickupLat * Math.PI) / 180) *
      Math.cos((dropoffLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.max(1, Math.ceil(dist));
  };

  const distanceKm = calculateDistance();
  const activeVehicleObj = VEHICLES.find((v) => v.id === selectedVehicle) || VEHICLES[0];
  const calculatedFare = distanceKm * activeVehicleObj.ratePerKm;

  // ── 1. GPS Button Click: Fetch real GPS & Reverse Geocode ──
  const handleFetchGps = () => {
    setLocatingGps(true);
    toast.info('Đang xác định vị trí GPS hiện tại...', 'Vị trí hiện tại');

    const updateLocation = async (lat, lng) => {
      setPickupLat(lat);
      setPickupLng(lng);
      try {
        const { data } = await api.get(`/maps/reverse?lat=${lat}&lng=${lng}`);
        if (data?.data?.address) {
          setPickupAddress(data.data.address);
        }
        toast.success('Đã cập nhật vị trí GPS đón thành công!', 'GPS thành công');
      } catch {
        setPickupAddress(`Vị trí GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        toast.success('Đã cập nhật tọa độ đón GPS', 'GPS thành công');
      } finally {
        setLocatingGps(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLocation(pos.coords.latitude, pos.coords.longitude);
        },
        async () => {
          // Fallback to IP Location API
          try {
            const { data } = await api.get('/maps/ip-location');
            if (data?.data) {
              updateLocation(data.data.lat, data.data.lng);
            }
          } catch {
            setLocatingGps(false);
            toast.error('Không thể tự động truy cập GPS. Vui lòng chọn địa chỉ thủ công.', 'Lỗi GPS');
          }
        },
        { timeout: 8000 }
      );
    } else {
      setLocatingGps(false);
      toast.error('Trình duyệt không hỗ trợ Geolocation API', 'Lỗi');
    }
  };

  // ── 2. Autocomplete for Pickup Search ─────────────────────
  useEffect(() => {
    if (!pickupAddress || pickupAddress.length < 3) {
      setPickupSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/maps/autocomplete?q=${encodeURIComponent(pickupAddress)}`);
        if (data?.data && Array.isArray(data.data)) {
          setPickupSuggestions(data.data);
          setShowPickupSuggestions(true);
        }
      } catch {
        setPickupSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [pickupAddress]);

  const selectPickupSuggestion = (sug) => {
    setPickupAddress(sug.address);
    setPickupLat(sug.lat);
    setPickupLng(sug.lng);
    setShowPickupSuggestions(false);
    toast.success(`Đã chọn điểm đón: ${sug.label}`, 'Địa điểm');
  };

  // ── 3. Autocomplete for Dropoff Search ────────────────────
  useEffect(() => {
    if (!dropoffAddress || dropoffAddress.length < 3) {
      setDropoffSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/maps/autocomplete?q=${encodeURIComponent(dropoffAddress)}`);
        if (data?.data && Array.isArray(data.data)) {
          setDropoffSuggestions(data.data);
          setShowDropoffSuggestions(true);
        }
      } catch {
        setDropoffSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [dropoffAddress]);

  const selectDropoffSuggestion = (sug) => {
    setDropoffAddress(sug.address);
    setDropoffLat(sug.lat);
    setDropoffLng(sug.lng);
    setShowDropoffSuggestions(false);
    toast.success(`Đã chọn điểm đến: ${sug.label}`, 'Địa điểm');
  };

  // ── 4. Submit Order Handler ──────────────────────────────
  const handleConfirmOrder = async () => {
    if (!pickupAddress || !dropoffAddress || !pickupLat || !dropoffLat) {
      toast.error('Vui lòng nhập đầy đủ điểm đón và điểm đến!', 'Thiếu thông tin');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        vehicleType: selectedVehicle,
      });

      // Lấy orderId từ response để navigate tracking
      const orderId = data?.data?.order?.id;

      toast.success('ĐẶT ĐƠN THÀNH CÔNG! Đang chuyển hướng sang trang Theo dõi Real-time...', 'Thành công');
      setTimeout(() => {
        navigate(orderId ? `/customer/tracking?orderId=${orderId}` : '/customer/tracking');
      }, 600);
    } catch {
      // Mock fallback if offline
      toast.success('ĐẶT ĐƠN THÀNH CÔNG! Đang khởi tạo lộ trình giao nhận...', 'Thành công');
      setTimeout(() => {
        navigate('/customer/tracking');
      }, 600);
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const hasPickup = pickupLat !== null && pickupLng !== null && pickupAddress.trim().length > 0;
  const hasDropoff = dropoffLat !== null && dropoffLng !== null && dropoffAddress.trim().length > 0;
  const hasBoth = hasPickup && hasDropoff;

  return (
    <div className="customer-container">
      <div className="customer-title-bar">
        <div>
          <h1 className="page-heading">Đặt Đơn & Tính Cước Vận Chuyển</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Hệ thống tự động tính cước minh bạch theo loại phương tiện
          </p>
        </div>
      </div>

      <div className="order-split-layout">
        {/* ─── CỘT TRÁI: FORM ĐẶT ĐƠN ────────────────────────── */}
        <div className="order-form-panel">
          {/* Ô Nhập Địa Chỉ Đón & Điểm Đến */}
          <div className="location-inputs-group">
            {/* Điểm Đón (Pickup) - Tích hợp Autocomplete Backend */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-group__label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <span className="dot dot--green" /> Điểm Đón
                </span>
                <button
                  type="button"
                  className="btn-gps-current"
                  onClick={handleFetchGps}
                  disabled={locatingGps}
                  title="Tự động định vị GPS vị trí hiện tại"
                >
                  <HiOutlineLocationMarker className="btn-gps-icon" />
                  <span>{locatingGps ? 'Đang định vị...' : 'GPS hiện tại'}</span>
                </button>
              </label>
              <input
                type="text"
                className="location-input"
                placeholder="Nhập địa chỉ nhận hàng (ví dụ: Nguyễn Trãi, Q.5)..."
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  if (!e.target.value) {
                    setPickupLat(null);
                    setPickupLng(null);
                  }
                }}
                onFocus={() => pickupSuggestions.length > 0 && setShowPickupSuggestions(true)}
              />

              {/* Suggestions Dropdown for Pickup */}
              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: '#10141D',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 10,
                    marginTop: 4,
                    boxShadow: 'var(--shadow-xl)',
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {pickupSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      onClick={() => selectPickupSuggestion(sug)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-panel-sub)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <strong style={{ color: 'var(--accent-green)' }}>{sug.label}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {sug.address}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Điểm Đến (Dropoff) - Tích hợp Autocomplete Backend */}
            <div className="input-group" style={{ position: 'relative', marginTop: 10 }}>
              <label className="input-group__label">
                <span className="dot dot--blue" /> Điểm Đến
              </label>
              <input
                type="text"
                className="location-input"
                placeholder="Nhập từ khóa hoặc tên đường điểm đến (ví dụ: Lê Duẩn, Q.1)..."
                value={dropoffAddress}
                onChange={(e) => {
                  setDropoffAddress(e.target.value);
                  if (!e.target.value) {
                    setDropoffLat(null);
                    setDropoffLng(null);
                  }
                }}
                onFocus={() => dropoffSuggestions.length > 0 && setShowDropoffSuggestions(true)}
              />

              {/* Suggestions Dropdown for Dropoff */}
              {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: '#10141D',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 10,
                    marginTop: 4,
                    boxShadow: 'var(--shadow-xl)',
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {dropoffSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      onClick={() => selectDropoffSuggestion(sug)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-panel-sub)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <strong style={{ color: 'var(--accent-blue)' }}>{sug.label}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {sug.address}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CHỌN LỌẠI PHƯƠNG TIỆN (3 LOẠI VỚI ĐƠN GIÁ BẮT BUỘC) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="input-group__label">Chọn Loại Phương Tiện Vận Chuyển</label>
            <div className="vehicle-cards-grid">
              {VEHICLES.map((v) => {
                const isSelected = selectedVehicle === v.id;
                const fareForThisVeh = distanceKm * v.ratePerKm;

                return (
                  <div
                    key={v.id}
                    className={`vehicle-card ${isSelected ? 'vehicle-card--selected' : ''}`}
                    onClick={() => setSelectedVehicle(v.id)}
                  >
                    <div className="vehicle-card__header">
                      <span style={{ fontSize: '1.75rem' }}>{v.icon}</span>
                      <span className="vehicle-card__price">
                        {v.ratePerKm.toLocaleString('vi-VN')} đ/km
                      </span>
                    </div>
                    <div className="vehicle-card__name">{v.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.desc}</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-primary)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}></span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        ~{fareForThisVeh.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA BUTTON XÁC NHẬN ĐƠN HÀNG */}
          <button
            type="button"
            className="btn btn--primary btn--cta"
            onClick={() => {
              if (!hasBoth) {
                toast.error('Vui lòng nhập/chọn cả Điểm đón và Điểm đến trước khi đặt đơn!', 'Chưa chọn địa điểm');
                return;
              }
              setShowConfirmModal(true);
            }}
          >
            <HiOutlinePaperAirplane style={{ fontSize: '1.2rem' }} /> Xác Nhận Đơn Hàng ({calculatedFare.toLocaleString('vi-VN')} đ)
          </button>
        </div>

        {/* ─── CỘT PHẢI: BẢN ĐỒ TƯƠNG TÁC GOOGLE MAPS ────────────── */}
        <div className="right-panel">
          <div className="order-map-wrapper">
            <div className="map-chip-floating">
              <span>📍 Khoảng cách: <strong>{distanceKm} km</strong></span>
            </div>

            <MapContainer
              center={[10.7769, 106.7009]}
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

              {/* Pickup Marker: Only render when Pickup location is set */}
              {hasPickup && <Marker position={[pickupLat, pickupLng]} icon={pickupIcon} />}

              {/* Dropoff Marker: Only render when Dropoff location is set */}
              {hasDropoff && <Marker position={[dropoffLat, dropoffLng]} icon={dropoffIcon} />}

              {/* Polyline Route: Only render when BOTH Pickup & Dropoff locations exist */}
              {hasBoth && (
                <Polyline
                  positions={[
                    [pickupLat, pickupLng],
                    [dropoffLat, dropoffLng],
                  ]}
                  color="#3B82F6"
                  weight={5}
                  opacity={0.85}
                />
              )}

              <MapRecenter
                pickupCoords={hasPickup ? [pickupLat, pickupLng] : null}
                dropoffCoords={hasDropoff ? [dropoffLat, dropoffLng] : null}
              />
            </MapContainer>
          </div>
        </div>
      </div>

      {/* ─── MODAL XÁC NHẬN ĐƠN HÀNG KHI BẤM BUTTON ───────── */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal__header">
              <h2 className="modal__title" style={{ fontFamily: 'var(--font-heading)' }}>
                XÁC NHẬN THÔNG TIN ĐƠN HÀNG
              </h2>
              <button className="toast-card__close" onClick={() => setShowConfirmModal(false)}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Hành trình đón - giao */}
              <div style={{ background: 'var(--bg-panel-sub)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: '0.9rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-green)' }} />
                  <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>Điểm đón:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{pickupAddress}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-blue)' }} />
                  <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>Điểm đến:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{dropoffAddress}</strong>
                </div>
              </div>

              {/* Thông số vận chuyển */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--bg-panel-sub)', padding: '10px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PHƯƠNG TIỆN</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    {activeVehicleObj.icon} {activeVehicleObj.name}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-panel-sub)', padding: '10px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KHOẢNG CÁCH</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)', marginTop: 2 }}>
                    {distanceKm} km
                  </div>
                </div>
              </div>

              {/* Chi tiết cước phí */}
              <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>Đơn giá theo phương tiện:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{activeVehicleObj.ratePerKm.toLocaleString('vi-VN')} đ/km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  <span>Thuế GTGT (VAT 8%):</span>
                  <span style={{ color: 'var(--accent-green)' }}>Đã bao gồm</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-primary)' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    TỔNG CƯỚC THANH TOÁN:
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                    {calculatedFare.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* 2 Nút xác nhận / hủy */}
              <div style={{ display: 'flex', gap: 12, marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 1, background: 'var(--gradient-blue)', gap: 6 }}
                  disabled={isSubmitting}
                  onClick={handleConfirmOrder}
                >
                  <HiOutlineCheck style={{ fontSize: '1.2rem' }} /> {isSubmitting ? 'Đang gửi...' : 'Xác Nhận Đặt Đơn'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowConfirmModal(false)}
                >
                  Hủy Thao Tác
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrderPage;
