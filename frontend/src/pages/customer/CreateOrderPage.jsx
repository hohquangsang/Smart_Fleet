import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineLocationMarker, HiOutlineTruck, HiOutlineClock, HiOutlineInformationCircle, HiOutlinePaperAirplane, HiOutlineCheck } from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import '../../styles/customer.css';

const PRESET_ADDRESSES = [
  { label: 'Nhà', address: '123 Nguyễn Trãi, Q.5, TP.HCM', lat: 10.7548, lng: 106.6712 },
  { label: 'Công ty', address: '45 Lê Duẩn, Q.1, TP.HCM', lat: 10.7801, lng: 106.7003 },
  { label: 'Kho bãi', address: '12 An Dương Vương, Q.8, TP.HCM', lat: 10.7289, lng: 106.6341 },
];

const VEHICLES = [
  {
    id: 'bike',
    name: 'Xe Máy',
    type: 'motorcycle',
    capacity: 'Tối đa 30 kg',
    basePrice: 25000,
    etaText: 'Dự kiến giao trong 18 phút — đã tính mật độ giao thông',
    icon: '🛵',
  },
  {
    id: 'van',
    name: 'Xe Tải Nhỏ',
    type: 'van',
    capacity: 'Tối đa 1.000 kg',
    basePrice: 145000,
    etaText: 'Dự kiến giao trong 25 phút — đã tính mật độ giao thông',
    icon: '🚐',
  },
  {
    id: 'truck',
    name: 'Xe Tải Lớn',
    type: 'truck',
    capacity: 'Tối đa 3.500 kg',
    basePrice: 380000,
    etaText: 'Dự kiến giao trong 35 phút — đã tính mật độ giao thông',
    icon: '🚛',
  },
];

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [pickupAddress, setPickupAddress] = useState('123 Nguyễn Trãi, Q.5, TP.HCM');
  const [pickupLat, setPickupLat] = useState(10.7548);
  const [pickupLng, setPickupLng] = useState(106.6712);

  const [dropoffAddress, setDropoffAddress] = useState('45 Lê Duẩn, Q.1, TP.HCM');
  const [dropoffLat, setDropoffLat] = useState(10.7801);
  const [dropoffLng, setDropoffLng] = useState(106.7003);

  const [selectedVehicle, setSelectedVehicle] = useState('van');
  const [showFareModal, setShowFareModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculated distance & ETA
  const distanceKm = 8.5;
  const activeVehicleObj = VEHICLES.find((v) => v.id === selectedVehicle) || VEHICLES[1];
  const calculatedFare = activeVehicleObj.basePrice + Math.round(distanceKm * 12000);

  // Use current geo location
  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickupLat(pos.coords.latitude);
          setPickupLng(pos.coords.longitude);
          setPickupAddress(`Vị trí hiện tại (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          toast.success('Đã lấy vị trí hiện tại thành công', 'Định vị GPS');
        },
        () => {
          toast.error('Không thể lấy vị trí hiện tại của thiết bị', 'Lỗi vị trí');
        }
      );
    } else {
      toast.error('Trình duyệt không hỗ trợ định vị GPS', 'Lỗi vị trí');
    }
  };

  // Submit new order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        pickupAddress,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropoffAddress,
        dropoffLat: parseFloat(dropoffLat),
        dropoffLng: parseFloat(dropoffLng),
      };

      const { data } = await api.post('/orders', payload);
      const newOrder = data.data;

      toast.success('Khởi tạo đơn hàng thành công! Đang điều phối tài xế...', 'Đặt đơn thành công');
      setTimeout(() => {
        navigate(`/customer/tracking?orderId=${newOrder.id}`);
      }, 600);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.';
      toast.error(msg, 'Lỗi đặt đơn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-container">
      <div className="customer-title-bar">
        <div>
          <h1 className="page-heading">Đặt đơn & Tính cước SmartFleet</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Hệ thống điều phối vận tải thông minh tính toán cước phí và tuyến đường tối ưu theo thời gian thực
          </p>
        </div>
      </div>

      <div className="order-split-layout">
        {/* ─── BÊN TRÁI: FORM ĐẶT ĐƠN ───────────────── */}
        <div className="order-form-panel">
          {/* Inputs Điểm lấy & giao */}
          <div className="location-input-group">
            <div className="location-field">
              <span className="location-dot location-dot--pickup" />
              <div className="location-input-wrapper">
                <input
                  type="text"
                  className="location-input"
                  placeholder="Nhập địa điểm lấy hàng..."
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                />
              </div>
              <button
                type="button"
                className="btn-location-geo"
                onClick={handleUseCurrentLocation}
                title="Dùng vị trí GPS hiện tại"
              >
                <HiOutlineLocationMarker /> GPS hiện tại
              </button>
            </div>

            <div className="location-field">
              <span className="location-dot location-dot--dropoff" />
              <div className="location-input-wrapper">
                <input
                  type="text"
                  className="location-input"
                  placeholder="Nhập địa điểm giao hàng..."
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Saved Address Chips */}
            <div className="saved-chips-row">
              <span className="saved-chip-label">Địa chỉ đã lưu:</span>
              {PRESET_ADDRESSES.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="address-chip"
                  onClick={() => {
                    setDropoffAddress(preset.address);
                    setDropoffLat(preset.lat);
                    setDropoffLng(preset.lng);
                  }}
                >
                  <HiOutlineLocationMarker style={{ color: 'var(--accent-blue)' }} /> {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách Loại Xe */}
          <div className="vehicle-selector">
            <h3 className="vehicle-selector-heading">Chọn loại phương tiện</h3>
            {VEHICLES.map((veh) => {
              const isSelected = selectedVehicle === veh.id;
              const fare = veh.basePrice + Math.round(distanceKm * 12000);

              return (
                <div
                  key={veh.id}
                  className={`vehicle-card ${isSelected ? 'vehicle-card--selected' : ''}`}
                  onClick={() => setSelectedVehicle(veh.id)}
                >
                  <div className="vehicle-card__icon">{veh.icon}</div>
                  <div className="vehicle-card__info">
                    <div className="vehicle-card__name">{veh.name}</div>
                    <div className="vehicle-card__capacity">{veh.capacity}</div>
                    <div className="ai-eta-badge" style={{ marginTop: '6px' }}>
                      ⚡ {veh.etaText}
                    </div>
                  </div>
                  <div className="vehicle-card__right">
                    <div className="vehicle-card__price">{fare.toLocaleString('vi-VN')} đ</div>
                    {isSelected && (
                      <span style={{ color: 'var(--accent-blue)', fontSize: '0.75rem', fontWeight: 600 }}>
                        ✓ Đã chọn
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breakdown Link */}
          <button
            type="button"
            className="fare-breakdown-link"
            onClick={() => setShowFareModal(true)}
          >
            <HiOutlineInformationCircle style={{ display: 'inline', marginRight: 4 }} />
            Xem chi tiết cước phí & phụ phí
          </button>

          {/* Submit CTA Button */}
          <button
            type="button"
            className="btn-submit-order"
            disabled={loading}
            onClick={handleCreateOrder}
          >
            {loading ? <span className="auth-spinner" /> : '🚀 Tạo Đơn Giao Hàng Ngay'}
          </button>
        </div>

        {/* ─── BÊN PHẢI: BẢN ĐỒ TỰ ĐỘNG VẼ ROUTE LINE ─── */}
        <div className="order-map-wrapper">
          {/* Floating Chip overlay */}
          <div className="map-floating-chip">
            <div className="map-chip-item">
              <span>Khoảng cách:</span>
              <span className="map-chip-val">{distanceKm} km</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--border-primary)' }} />
            <div className="map-chip-item">
              <span>AI ETA:</span>
              <span className="map-chip-val" style={{ color: 'var(--accent-green)' }}>18 Phút</span>
            </div>
          </div>

          {/* Interactive Vector Map Route Simulation */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid slice"
            style={{ background: '#0A0D13' }}
          >
            {/* Grid Pattern */}
            <defs>
              <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(38, 46, 60, 0.4)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridPattern)" />

            {/* Simulated Road network lines */}
            <path d="M 50,150 L 750,150 M 50,300 L 750,300 M 50,450 L 750,450" stroke="rgba(38, 46, 60, 0.6)" strokeWidth="3" />
            <path d="M 200,50 L 200,550 M 450,50 L 450,550 M 650,50 L 650,550" stroke="rgba(38, 46, 60, 0.6)" strokeWidth="3" />

            {/* Accent Route Line connecting Pickup and Dropoff */}
            <path
              d="M 180,380 C 260,320 320,240 420,240 S 540,160 620,180"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="6"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' }}
            />

            {/* Animated Pulses on Route Line */}
            <path
              d="M 180,380 C 260,320 320,240 420,240 S 540,160 620,180"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeDasharray="12 24"
              strokeLinecap="round"
            >
              <animate attributeName="stroke-dashoffset" from="36" to="0" dur="1.5s" repeatCount="indefinite" />
            </path>

            {/* Pickup Pin Marker (Green #33D69F) */}
            <g transform="translate(180, 380)">
              <circle r="22" fill="rgba(51, 214, 159, 0.2)" />
              <circle r="12" fill="#33D69F" />
              <circle r="5" fill="#FFFFFF" />
              <rect x="-60" y="-42" width="120" height="24" rx="6" fill="#10141D" stroke="#33D69F" strokeWidth="1" />
              <text x="0" y="-26" textAnchor="middle" fill="#33D69F" fontSize="11" fontWeight="600" fontFamily="Inter">
                📍 LẤY HÀNG (Q.5)
              </text>
            </g>

            {/* Dropoff Pin Marker (Blue #3B82F6) */}
            <g transform="translate(620, 180)">
              <circle r="22" fill="rgba(59, 130, 246, 0.2)" />
              <circle r="12" fill="#3B82F6" />
              <circle r="5" fill="#FFFFFF" />
              <rect x="-60" y="-42" width="120" height="24" rx="6" fill="#10141D" stroke="#3B82F6" strokeWidth="1" />
              <text x="0" y="-26" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="600" fontFamily="Inter">
                🎯 GIAO HÀNG (Q.1)
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* ─── MODAL BREAKDOWN CƯỚC PHÍ ─────────────────── */}
      {showFareModal && (
        <div className="modal-overlay" onClick={() => setShowFareModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
            <div className="modal__header">
              <h2 className="modal__title" style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                Chi Tiết Cước Phí
              </h2>
              <button className="toast-card__close" onClick={() => setShowFareModal(false)}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cước cơ bản ({activeVehicleObj.name}):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {activeVehicleObj.basePrice.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cước theo khoảng cách ({distanceKm} km x 12.000đ):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {(distanceKm * 12000).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Phụ phí giờ cao điểm / Mật độ:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-green)' }}>
                  0 đ (Ưu đãi)
                </span>
              </div>

              <div
                style={{
                  height: 1,
                  background: 'var(--border-primary)',
                  margin: '8px 0',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Tổng cộng cước phí:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  {calculatedFare.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--primary"
              style={{ width: '100%', marginTop: '1.5rem', background: 'var(--gradient-blue)' }}
              onClick={() => setShowFareModal(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrderPage;
