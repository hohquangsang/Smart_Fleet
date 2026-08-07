import { useState } from 'react';
import { HiOutlineSearch, HiOutlineStar, HiOutlineCheckCircle, HiOutlineTrendingUp, HiOutlineCalendar } from 'react-icons/hi';
import '../../styles/driver.css';

const DATA_BY_TAB = {
  day: {
    totalEarnings: '850.000',
    tripsCount: 12,
    bonusAmount: '130.000',
    bars: [
      { label: '08:00', base: 120, bonus: 30 },
      { label: '10:00', base: 180, bonus: 40 },
      { label: '12:00', base: 140, bonus: 20 },
      { label: '14:00', base: 160, bonus: 20 },
      { label: '16:00', base: 120, bonus: 20 },
    ],
  },
  week: {
    totalEarnings: '5.420.000',
    tripsCount: 68,
    bonusAmount: '820.000',
    bars: [
      { label: 'T2', base: 650, bonus: 120 },
      { label: 'T3', base: 720, bonus: 140 },
      { label: 'T4', base: 800, bonus: 150 },
      { label: 'T5', base: 690, bonus: 110 },
      { label: 'T6', base: 910, bonus: 180 },
      { label: 'T7', base: 450, bonus: 80 },
      { label: 'CN', base: 380, bonus: 40 },
    ],
  },
  month: {
    totalEarnings: '22.850.000',
    tripsCount: 284,
    bonusAmount: '3.400.000',
    bars: [
      { label: 'Tuần 1', base: 4800, bonus: 700 },
      { label: 'Tuần 2', base: 5200, bonus: 850 },
      { label: 'Tuần 3', base: 4900, bonus: 750 },
      { label: 'Tuần 4', base: 4550, bonus: 1100 },
    ],
  },
};

const HISTORY = [
  { code: '#ORD-99120', time: 'Hôm nay, 11:30', route: '123 Nguyễn Trãi, Q.5 ➔ 45 Lê Duẩn, Q.1', fare: '185.000 đ' },
  { code: '#ORD-98841', time: 'Hôm nay, 09:15', route: '88 Nguyễn Huệ, Q.1 ➔ 12 An Dương Vương, Q.8', fare: '120.000 đ' },
  { code: '#ORD-97510', time: 'Hôm qua, 16:40', route: '450 Điện Biên Phủ ➔ 99 Cộng Hòa', fare: '240.000 đ' },
  { code: '#ORD-96102', time: 'Hôm qua, 14:10', route: '12 Tân Kỳ Tân Quý ➔ 88 Võ Văn Kiệt', fare: '165.000 đ' },
  { code: '#ORD-95022', time: '05/08/2026', route: '55 Lê Văn Sỹ ➔ 12 Tân Bình', fare: '140.000 đ' },
];

const EarningsProfilePage = () => {
  const [activeTab, setActiveTab] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');

  const currentData = DATA_BY_TAB[activeTab];

  const filteredHistory = HISTORY.filter((h) => {
    if (!searchTerm) return true;
    return (
      h.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.time.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="driver-container">
      {/* ─── TABS THỜI GIAN NGÀY / TUẦN / THÁNG ────────── */}
      <div className="earnings-tabs-bar">
        <div>
          <h1 className="driver-title">Thống Kê Thu Nhập & Hiệu Suất</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Phân tích chi tiết cước phí, các khoản tiền thưởng và chỉ số vận hành cá nhân
          </p>
        </div>

        <div className="tab-pill-group">
          <button
            type="button"
            className={`tab-pill ${activeTab === 'day' ? 'tab-pill--active' : ''}`}
            onClick={() => setActiveTab('day')}
          >
            Ngày
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'week' ? 'tab-pill--active' : ''}`}
            onClick={() => setActiveTab('week')}
          >
            Tuần
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'month' ? 'tab-pill--active' : ''}`}
            onClick={() => setActiveTab('month')}
          >
            Tháng
          </button>
        </div>
      </div>

      {/* ─── 3 THẺ TỔNG QUAN ──────────────────────────── */}
      <div className="earnings-overview-cards">
        <div className="stat-overview-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            TỔNG THU NHẬP
          </span>
          <div className="stat-overview-val" style={{ color: 'var(--accent-blue)' }}>
            {currentData.totalEarnings} đ
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 2 }}>
            ▲ Tăng trưởng tốt trong chu kỳ
          </span>
        </div>

        <div className="stat-overview-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            SỐ CHUYẾN HOÀN THÀNH
          </span>
          <div className="stat-overview-val">{currentData.tripsCount} Chuyến</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Tỷ lệ hủy chuyến: 0.8%
          </span>
        </div>

        <div className="stat-overview-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            THƯỞNG HIỆU SUẤT
          </span>
          <div className="stat-overview-val" style={{ color: 'var(--accent-green)' }}>
            {currentData.bonusAmount} đ
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 2 }}>
            ★ Thưởng hoàn thành đúng ETA
          </span>
        </div>
      </div>

      {/* ─── BIỂU ĐỒ CỘT THU NHẬP THEO THỜI GIAN ───────── */}
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

        {/* Custom Stacked Bar Chart */}
        <div style={{ height: 220, display: 'flex', alignItems: 'flex-end', gap: 20, padding: '1rem 0' }}>
          {currentData.bars.map((bar, idx) => {
            const totalHeight = bar.base + bar.bonus;
            const maxVal = Math.max(...currentData.bars.map((b) => b.base + b.bonus));
            const basePct = (bar.base / maxVal) * 100;
            const bonusPct = (bar.bonus / maxVal) * 100;

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
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
                  }}
                >
                  <div style={{ height: `${basePct}%`, background: 'var(--accent-blue)', transition: 'height 0.4s' }} />
                  <div style={{ height: `${bonusPct}%`, background: 'var(--accent-green)', transition: 'height 0.4s' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 3 THẺ CHỈ SỐ TÀI XẾ GAUGE ──────────────────── */}
      <div className="gauges-grid">
        {/* Điểm đánh giá (★ 4.9/5, màu cam #F5A623) */}
        <div className="gauge-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              ĐIỂM ĐÁNH GIÁ
            </span>
            <span style={{ color: '#F5A623', fontWeight: 700, fontSize: '1.1rem' }}>★ 4.9 / 5.0</span>
          </div>
          <div className="gauge-bar-track">
            <div className="gauge-bar-fill" style={{ width: '98%', background: '#F5A623' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dựa trên 128 đánh giá từ khách hàng</span>
        </div>

        {/* Tỷ lệ nhận đơn (%) */}
        <div className="gauge-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              TỶ LỆ NHẬN ĐƠN
            </span>
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '1.1rem' }}>96%</span>
          </div>
          <div className="gauge-bar-track">
            <div className="gauge-bar-fill" style={{ width: '96%', background: 'var(--accent-blue)' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã phản hồi 68/70 đơn hàng</span>
        </div>

        {/* Tỷ lệ hoàn thành (%, màu xanh lá #33D69F) */}
        <div className="gauge-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              TỶ LỆ HOÀN THÀNH
            </span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '1.1rem' }}>99%</span>
          </div>
          <div className="gauge-bar-track">
            <div className="gauge-bar-fill" style={{ width: '99%', background: 'var(--accent-green)' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chỉ 1 đơn bị hủy bất khả kháng</span>
        </div>
      </div>

      {/* ─── DANH SÁCH LỊCH SỬ CHUYẾN XE ───────────────── */}
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
          <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.1rem' }}>
            Lịch Sử Các Chuyến Xe
          </h3>
          <div className="topbar__search" style={{ width: 280 }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredHistory.map((item) => (
            <div
              key={item.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                background: 'var(--bg-panel-sub)',
                border: '1px solid var(--border-primary)',
                borderRadius: 10,
              }}
            >
              <div>
                <span className="order-code">{item.code}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.time}</div>
              </div>

              <div style={{ flex: 1, margin: '0 1.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                {item.route}
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-green)' }}>
                {item.fare}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EarningsProfilePage;
