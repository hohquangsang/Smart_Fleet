import { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineStar, HiOutlineCheckCircle, HiOutlineTrendingUp, HiOutlineCalendar } from 'react-icons/hi';
import api from '../../services/api';
import '../../styles/driver.css';

const EarningsProfilePage = () => {
  const [activeTab, setActiveTab] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');
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
    return (
      h.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.time.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.route.toLowerCase().includes(searchTerm.toLowerCase())
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
            {(earningsData.totalEarnings || 0).toLocaleString('vi-VN')} đ
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 2 }}>
            ▲ Dữ liệu thực từ đơn đã hoàn thành
          </span>
        </div>

        <div className="stat-overview-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            SỐ CHUYẾN HOÀN THÀNH
          </span>
          <div className="stat-overview-val">{earningsData.tripsCount || 0} Chuyến</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Tỷ lệ hoàn thành: {earningsData.completeRate || 100}%
          </span>
        </div>

        <div className="stat-overview-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            THƯỞNG HIỆU SUẤT
          </span>
          <div className="stat-overview-val" style={{ color: 'var(--accent-green)' }}>
            {(earningsData.bonusAmount || 0).toLocaleString('vi-VN')} đ
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 2 }}>
            ★ Phụ phí & thưởng hiệu suất
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
                      minHeight: bar.base > 0 ? 10 : 0,
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
            })
          )}
        </div>
      </div>

      {/* ─── 3 THẺ CHỈ SỐ TÀI XẾ GAUGE ──────────────────── */}
      <div className="gauges-grid">
        <div className="gauge-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              ĐIỂM ĐÁNH GIÁ
            </span>
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              TỶ LỆ NHẬN ĐƠN
            </span>
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              TỶ LỆ HOÀN THÀNH
            </span>
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
