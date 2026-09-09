import { useState, useEffect } from 'react';
import {
  HiOutlineSearch,
  HiOutlineStar,
  HiStar,
  HiOutlineTrendingUp,
  HiOutlineX,
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineChatAlt2,
  HiOutlineCheckCircle,
  HiOutlineEmojiSad,
} from 'react-icons/hi';
import api from '../../services/api';
import '../../styles/driver.css';

/* ─── Helpers ─────────────────────────────── */
const STATUS_META = {
  DELIVERED: { label: 'Hoàn thành', color: 'var(--accent-green)' },
  COMPLETED: { label: 'Hoàn thành', color: 'var(--accent-green)' },
  CANCELLED: { label: 'Đã hủy', color: 'var(--accent-red)' },
  IN_TRANSIT: { label: 'Đang giao', color: 'var(--accent-blue)' },
  MATCHED: { label: 'Đã ghép', color: 'var(--accent-blue)' },
  PENDING: { label: 'Chờ xử lý', color: '#f59e0b' },
};

const STAR_LABEL = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];

/* ═══════════════════════════════════════════
   Trip Detail Modal
═══════════════════════════════════════════ */
const TripDetailModal = ({ trip, onClose }) => {
  const hasRating = trip.rating !== null && trip.rating !== undefined;
  const isCompleted = trip.status === 'DELIVERED' || trip.status === 'COMPLETED';
  const statusMeta = STATUS_META[trip.status] || { label: trip.status, color: 'var(--text-muted)' };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 13, 19, 0.72)',
          backdropFilter: 'blur(5px)',
          zIndex: 2000,
        }}
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 18,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          zIndex: 2001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'tripModalIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-primary)',
            background: 'var(--bg-panel-sub)',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Chi tiết chuyến xe
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-blue)', marginTop: 2 }}>
              {trip.code}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--bg-panel-floating)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease',
            }}
          >
            <HiOutlineX />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '70vh' }}>

          {/* Status + Time */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <HiOutlineClock style={{ color: 'var(--text-muted)', fontSize: '1rem' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{trip.time}</span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 700,
                background: `${statusMeta.color}18`,
                border: `1px solid ${statusMeta.color}50`,
                color: statusMeta.color,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusMeta.color, display: 'inline-block' }} />
              {statusMeta.label}
            </span>
          </div>

          {/* Route */}
          <div
            style={{
              background: 'var(--bg-panel-sub)',
              border: '1px solid var(--border-primary)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px rgba(51,214,159,0.5)', flexShrink: 0, marginTop: 4 }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Điểm lấy hàng</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{trip.pickupAddress}</div>
              </div>
            </div>
            <div style={{ borderLeft: '2px dashed var(--border-primary)', height: 12, marginLeft: 4 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 8px rgba(59,130,246,0.5)', flexShrink: 0, marginTop: 4 }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Điểm giao hàng</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{trip.dropoffAddress}</div>
              </div>
            </div>
          </div>

          {/* Fare + Distance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div
              style={{
                background: 'rgba(59,130,246,0.07)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 10,
                padding: '0.9rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Thu nhập</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-blue)' }}>
                {trip.fare}
              </div>
            </div>
            <div
              style={{
                background: 'rgba(51,214,159,0.07)',
                border: '1px solid rgba(51,214,159,0.2)',
                borderRadius: 10,
                padding: '0.9rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Khoảng cách</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-green)' }}>
                {trip.distanceKm != null ? `${Number(trip.distanceKm).toFixed(1)} km` : '—'}
              </div>
            </div>
          </div>

          {/* Customer Rating Section */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              <HiOutlineStar style={{ color: '#f59e0b', fontSize: '1rem' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Đánh giá từ khách hàng
              </span>
            </div>

            {!isCompleted ? (
              /* Not a completed trip — no rating possible */
              <div
                style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'var(--bg-panel-sub)',
                  borderRadius: 10,
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                Chuyến xe này chưa hoàn thành, chưa có đánh giá.
              </div>
            ) : hasRating ? (
              /* Has rating */
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(251,191,36,0.04) 100%)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 12,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Stars row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((s) =>
                      s <= trip.rating ? (
                        <HiStar key={s} style={{ fontSize: '1.5rem', color: '#f59e0b', filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' }} />
                      ) : (
                        <HiOutlineStar key={s} style={{ fontSize: '1.5rem', color: 'var(--border-primary)' }} />
                      )
                    )}
                  </div>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
                      {trip.rating}/5
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                      — {STAR_LABEL[trip.rating] || ''}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {trip.ratingTags && trip.ratingTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {trip.ratingTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '4px 12px',
                          background: 'rgba(245,158,11,0.1)',
                          border: '1px solid rgba(245,158,11,0.3)',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#fbbf24',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comment */}
                {trip.ratingComment && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '0.75rem 1rem',
                      background: 'rgba(0,0,0,0.15)',
                      borderRadius: 8,
                    }}
                  >
                    <HiOutlineChatAlt2 style={{ color: '#f59e0b', fontSize: '1rem', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                      "{trip.ratingComment}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Completed but no rating yet */
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'var(--bg-panel-sub)',
                  borderRadius: 10,
                  border: '1px dashed var(--border-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <HiOutlineCheckCircle style={{ fontSize: '2rem', color: 'var(--accent-green)' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Chuyến xe đã hoàn thành
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Khách hàng chưa gửi đánh giá cho chuyến này.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════
   Main Page
═══════════════════════════════════════════ */
const EarningsProfilePage = () => {
  const [activeTab, setActiveTab] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    tripsCount: 0,
    bonusAmount: 0,
    baseEarnings: 0,
    rating: 5.0,
    acceptRate: 100,
    completeRate: 100,
    bars: [],
    history: [],
  });

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const { data } = await api.get('/drivers/earnings', { params: { period: activeTab } });
        if (data?.data) {
          setEarningsData(data.data);
        }
      } catch {
        // Default clean state
      }
    };
    fetchEarnings();
  }, [activeTab]);

  const filteredHistory = (earningsData.history || []).filter((h) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      h.code.toLowerCase().includes(q) ||
      h.time.toLowerCase().includes(q) ||
      h.route.toLowerCase().includes(q)
    );
  });

  const isCompleted = (status) => status === 'DELIVERED' || status === 'COMPLETED';

  return (
    <div className="driver-container">
      {/* ─── TABS THỜI GIAN ──────────────────────── */}
      <div className="earnings-tabs-bar">
        <div>
          <h1 className="driver-title">Thống Kê Thu Nhập &amp; Hiệu Suất</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Phân tích chi tiết cước phí, các khoản tiền thưởng và chỉ số vận hành cá nhân
          </p>
        </div>
        <div className="tab-pill-group">
          {['day', 'week', 'month'].map((t) => (
            <button
              key={t}
              type="button"
              className={`tab-pill ${activeTab === t ? 'tab-pill--active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {{ day: 'Ngày', week: 'Tuần', month: 'Tháng' }[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3 THẺ TỔNG QUAN ─────────────────────── */}
      <div className="earnings-overview-cards">
        <div className="stat-overview-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TỔNG THU NHẬP</span>
          <div className="stat-overview-val" style={{ color: 'var(--accent-blue)' }}>
            {(earningsData.totalEarnings || 0).toLocaleString('vi-VN')} đ
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 2 }}>
            ▲ Dữ liệu thực từ đơn đã hoàn thành
          </span>
        </div>
        <div className="stat-overview-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SỐ CHUYẾN HOÀN THÀNH</span>
          <div className="stat-overview-val">{earningsData.tripsCount || 0} Chuyến</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Tỷ lệ hoàn thành: {earningsData.completeRate || 100}%
          </span>
        </div>
        <div className="stat-overview-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>THƯỞNG HIỆU SUẤT</span>
          <div className="stat-overview-val" style={{ color: 'var(--accent-green)' }}>
            {(earningsData.bonusAmount || 0).toLocaleString('vi-VN')} đ
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 2 }}>
            ★ Phụ phí &amp; thưởng hiệu suất
          </span>
        </div>
      </div>

      {/* ─── BIỂU ĐỒ CỘT ────────────────────────── */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.1rem' }}>
            Biểu Đồ Biến Động Thu Nhập
          </h3>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, background: 'var(--accent-blue)', borderRadius: 2 }} />
              Cước cơ bản
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, background: 'var(--accent-green)', borderRadius: 2 }} />
              Thưởng hiệu suất
            </span>
          </div>
        </div>
        <div style={{ height: 220, display: 'flex', alignItems: 'flex-end', gap: 20, padding: '1rem 0' }}>
          {(earningsData.bars || []).length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
              Chưa có dữ liệu biến động thu nhập trong chu kỳ này
            </div>
          ) : (
            earningsData.bars.map((bar, idx) => {
              const maxVal = Math.max(1, ...earningsData.bars.map((b) => (b.base || 0) + (b.bonus || 0)));
              const basePct = ((bar.base || 0) / maxVal) * 100;
              const bonusPct = ((bar.bonus || 0) / maxVal) * 100;
              return (
                <div
                  key={idx}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 42,
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: 'var(--bg-panel-sub)',
                      minHeight: bar.base > 0 ? 10 : 0,
                    }}
                  >
                    <div style={{ height: `${basePct}%`, background: 'var(--accent-blue)', transition: 'height 0.4s' }} />
                    <div style={{ height: `${bonusPct}%`, background: 'var(--accent-green)', transition: 'height 0.4s' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{bar.label}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── GAUGES ──────────────────────────────── */}
      <div className="gauges-grid">
        <div className="gauge-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ĐIỂM ĐÁNH GIÁ</span>
            <span style={{ color: '#F5A623', fontWeight: 700, fontSize: '1.1rem' }}>
              ★ {(earningsData.driver?.rating || 5.0).toFixed(1)} / 5.0
            </span>
          </div>
          <div className="gauge-bar-track">
            <div className="gauge-bar-fill" style={{ width: `${((earningsData.driver?.rating || 5.0) / 5) * 100}%`, background: '#F5A623' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đánh giá trung bình từ khách hàng</span>
        </div>
        <div className="gauge-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TỶ LỆ NHẬN ĐƠN</span>
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '1.1rem' }}>
              {earningsData.acceptRate || 100}%
            </span>
          </div>
          <div className="gauge-bar-track">
            <div className="gauge-bar-fill" style={{ width: `${earningsData.acceptRate || 100}%`, background: 'var(--accent-blue)' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tỷ lệ chấp nhận đơn hàng</span>
        </div>
        <div className="gauge-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TỶ LỆ HOÀN THÀNH</span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '1.1rem' }}>
              {earningsData.completeRate || 100}%
            </span>
          </div>
          <div className="gauge-bar-track">
            <div className="gauge-bar-fill" style={{ width: `${earningsData.completeRate || 100}%`, background: 'var(--accent-green)' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tỷ lệ giao hàng thành công</span>
        </div>
      </div>

      {/* ─── LỊCH SỬ CÁC CHUYẾN XE ──────────────── */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 14,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.1rem' }}>
              Lịch Sử Các Chuyến Xe
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Nhấn vào chuyến để xem chi tiết &amp; đánh giá từ khách hàng
            </p>
          </div>
          <div className="topbar__search" style={{ width: 300 }}>
            <HiOutlineSearch className="topbar__search-icon" />
            <input
              type="text"
              className="input"
              placeholder="Tìm theo mã đơn hoặc ngày..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredHistory.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                background: 'var(--bg-panel-sub)',
                borderRadius: 10,
                border: '1px solid var(--border-primary)',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
              <div>Không có chuyến xe nào phù hợp</div>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const completed = isCompleted(item.status);
              const hasRating = item.rating !== null && item.rating !== undefined;
              const sm = STATUS_META[item.status] || { label: item.status, color: 'var(--text-muted)' };

              return (
                <div
                  key={item.id || item.code}
                  onClick={() => setSelectedTrip(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1.25rem',
                    background: 'var(--bg-panel-sub)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                    e.currentTarget.style.background = 'var(--bg-panel-floating)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                    e.currentTarget.style.background = 'var(--bg-panel-sub)';
                  }}
                >
                  {/* Code + Time */}
                  <div style={{ minWidth: 130, flexShrink: 0 }}>
                    <span className="order-code">{item.code}</span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.time}</div>
                  </div>

                  {/* Route */}
                  <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.route}
                  </div>

                  {/* Fare */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--accent-green)', flexShrink: 0, minWidth: 110, textAlign: 'right' }}>
                    {item.fare}
                  </div>

                  {/* Status badge */}
                  <div style={{ flexShrink: 0, minWidth: 100, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: `${sm.color}18`,
                      border: `1px solid ${sm.color}40`,
                      color: sm.color,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sm.color, display: 'inline-block' }} />
                      {sm.label}
                    </span>
                  </div>

                  {/* Rating indicator */}
                  <div style={{ flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
                    {completed ? (
                      hasRating ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: '#f59e0b', fontWeight: 700 }}>
                          <HiStar style={{ fontSize: '0.9rem' }} />
                          {item.rating}/5
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Chưa đánh giá
                        </span>
                      )
                    ) : null}
                  </div>

                  {/* Arrow hint */}
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>›</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── TRIP DETAIL MODAL ───────────────────── */}
      {selectedTrip && (
        <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}
    </div>
  );
};

export default EarningsProfilePage;
