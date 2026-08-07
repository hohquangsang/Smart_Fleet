import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePhone, HiOutlineChatAlt, HiOutlineExclamation, HiOutlineCheckCircle, HiOutlineX } from 'react-icons/hi';
import useToast from '../../hooks/useToast';
import '../../styles/driver.css';

const INCIDENTS = [
  'Kẹt xe nghiêm trọng / Tắc đường',
  'Xe gặp sự cố hỏng hóc / Thủng lốp',
  'Khách hàng không bắt máy / Không liên lạc được',
  'Địa chỉ nhận hàng bị đóng cửa',
  'Sự cố khác',
];

const ActiveTripPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Trip stage: 1 = Heading to Pickup, 2 = Delivering, 3 = Completed
  const [tripStage, setTripStage] = useState(1);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(INCIDENTS[0]);

  // Stage button handler
  const handleNextStage = () => {
    if (tripStage === 1) {
      setTripStage(2);
      toast.success('Đã đến điểm lấy hàng! Đã cập nhật tuyến đường giao hàng tối ưu do AI sắp xếp.', 'Cập nhật lộ trình');
    } else if (tripStage === 2) {
      setTripStage(3);
      toast.success('ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG! Hóa đơn tự động đang được khởi tạo.', 'Hoàn tất chuyến');
    }
  };

  // Report Incident action
  const handleSendIncident = () => {
    toast.error(`Đã gửi cảnh báo khẩn cấp: "${selectedIncident}" tới Admin Dashboard!`, 'Cảnh báo sự cố');
    setShowIncidentModal(false);
  };

  return (
    <div className="driver-container">
      <div className="driver-header-bar">
        <div>
          <h1 className="driver-title">Đang Thực Hiện Chuyến Hàng</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Mã đơn: <span className="order-code">#ORD-99120</span> • Tuyến tối ưu được giám sát tự động bởi AI
          </p>
        </div>
      </div>

      <div className="active-trip-layout">
        {/* ─── BẢN ĐỒ CHIẾM PHẦN CHÍNH ────────────────── */}
        <div className="order-map-wrapper" style={{ minHeight: 560 }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid slice"
            style={{ background: '#0A0D13' }}
          >
            <defs>
              <pattern id="tripGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(38, 46, 60, 0.4)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tripGrid)" />

            <path d="M 50,220 L 750,220 M 50,420 L 750,420" stroke="rgba(38, 46, 60, 0.6)" strokeWidth="4" />
            <path d="M 240,50 L 240,550 M 580,50 L 580,550" stroke="rgba(38, 46, 60, 0.6)" strokeWidth="4" />

            {/* Dynamic Route Line depending on Stage */}
            {tripStage === 1 && (
              <path
                d="M 120,420 L 240,220"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="6"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }}
              />
            )}

            {tripStage >= 2 && (
              <>
                <path d="M 120,420 L 240,220" fill="none" stroke="#33D69F" strokeWidth="6" strokeLinecap="round" />
                <path
                  d="M 240,220 C 380,180 460,320 580,220"
                  fill="none"
                  stroke="#33D69F"
                  strokeWidth="6"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(51, 214, 159, 0.6))' }}
                />
              </>
            )}

            {/* Vehicle Position Marker */}
            <g transform={tripStage === 1 ? 'translate(180, 320)' : 'translate(410, 235)'}>
              <circle r="22" fill="rgba(59, 130, 246, 0.3)">
                <animate attributeName="r" values="18;26;18" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle r="12" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
            </g>

            {/* Waypoints */}
            <g transform="translate(240, 220)">
              <circle r="10" fill="#33D69F" />
              <text x="0" y="24" textAnchor="middle" fill="#33D69F" fontSize="11" fontWeight="600" fontFamily="Inter">
                ĐIỂM LẤY HÀNG
              </text>
            </g>

            <g transform="translate(580, 220)">
              <circle r="10" fill="#3B82F6" />
              <text x="0" y="24" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="600" fontFamily="Inter">
                ĐIỂM GIAO HÀNG
              </text>
            </g>
          </svg>
        </div>

        {/* ─── CỘT ĐIỀU HÀNH & BẢNG TIẾN ĐỘ ───────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card Hướng Dẫn Theo Từng Bước (One-tap progress) */}
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
            {tripStage === 1 && (
              <>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    GIAI ĐOẠN 1 / 2
                  </span>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: 4 }}>
                    Đang đến điểm lấy hàng
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Địa chỉ: <strong>123 Nguyễn Trãi, Q.5, TP.HCM</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="step-action-button step-action-button--blue"
                  onClick={handleNextStage}
                >
                  Đã Đến Điểm Lấy Hàng ➔
                </button>
              </>
            )}

            {tripStage === 2 && (
              <>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase' }}>
                    GIAI ĐOẠN 2 / 2 • AI OPTIMIZED ROUTE
                  </span>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: 4 }}>
                    Đang giao hàng — tuyến tối ưu do AI sắp xếp
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Địa chỉ: <strong>45 Lê Duẩn, Q.1, TP.HCM</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="step-action-button step-action-button--green"
                  onClick={handleNextStage}
                >
                  Đã Giao Thành Công ✓
                </button>
              </>
            )}

            {tripStage === 3 && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <HiOutlineCheckCircle style={{ fontSize: '3.5rem', color: 'var(--accent-green)', margin: '0 auto' }} />
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginTop: 10 }}>
                  ĐƠN HÀNG ĐÃ HOÀN TẤT!
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0 1.25rem 0' }}>
                  Đơn đã hoàn tất, hóa đơn đang được hệ thống tạo tự động và gửi cho khách hàng.
                </p>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ width: '100%', padding: '0.85rem', background: 'var(--gradient-blue)' }}
                  onClick={() => navigate('/driver')}
                >
                  Quay Về Trang Tổng Quan
                </button>
              </div>
            )}
          </div>

          {/* Card Khách Hàng Nhỏ */}
          <div className="driver-card">
            <div className="driver-avatar" style={{ borderColor: 'var(--accent-green)' }}>
              SK
            </div>
            <div className="driver-info">
              <div className="driver-name">Hồ Hữu Quang Sang</div>
              <div className="order-code">#ORD-99120</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Thanh toán: Tiền mặt (185.000 đ)
              </div>
            </div>
            <div className="driver-actions">
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => toast.info('Gọi tới khách hàng 0958.758.052', 'Gọi thoại')}
              >
                <HiOutlinePhone />
              </button>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => toast.info('Mở chat nhắn tin với khách hàng', 'Chat')}
              >
                <HiOutlineChatAlt />
              </button>
            </div>
          </div>

          {/* Khối Phím Tắt Phụ Trợ */}
          <button type="button" className="btn-incident" onClick={() => setShowIncidentModal(true)}>
            ⚠️ Báo Sự Cố Khẩn Cấp
          </button>
        </div>
      </div>

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
