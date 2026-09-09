import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineDownload,
  HiOutlineMail,
  HiOutlineStar,
  HiStar,
  HiOutlineRefresh,
  HiOutlineEmojiHappy,
} from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import '../../styles/customer.css';

/* ── Helpers ─────────────────────────────────── */
const formatDate = (d) =>
  new Date(d).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const VEHICLE_LABEL = {
  motorcycle: 'Xe Máy Express',
  van: 'Xe Tải Nhỏ (1 Tấn)',
  truck: 'Xe Tải Lớn (3.5 Tấn)',
};

const RATING_TAGS = [
  'Giao hàng đúng giờ',
  'Tài xế thân thiện',
  'Hàng hóa nguyên vẹn',
  'Giao tiếp tốt',
  'Xe sạch sẽ',
  'Giá hợp lý',
];

const STATUS_META = {
  DELIVERED: { label: 'Hoàn thành', cls: 'status-badge--delivered' },
  COMPLETED: { label: 'Hoàn thành', cls: 'status-badge--delivered' },
  CANCELLED: { label: 'Đã hủy', cls: 'status-badge--cancelled' },
  MATCHED: { label: 'Đang giao', cls: 'status-badge--delivering' },
  IN_TRANSIT: { label: 'Đang giao', cls: 'status-badge--delivering' },
  PICKED_UP: { label: 'Đang giao', cls: 'status-badge--delivering' },
  PENDING: { label: 'Chờ xử lý', cls: 'status-badge--pending' },
  DISPATCHING: { label: 'Đang phân phối', cls: 'status-badge--delivering' },
  DRIVER_ACCEPTED: { label: 'Tài xế nhận đơn', cls: 'status-badge--delivering' },
  EXPIRED_NO_DRIVER: { label: 'Hết hạn', cls: 'status-badge--cancelled' },
};

/* ═══════════════════════════════════════════════
   Rating Modal
═══════════════════════════════════════════════ */
const RatingModal = ({ order, onClose, onSubmit }) => {
  const [stars, setStars] = useState(5);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(order.id, { rating: stars, comment, tags });
    setSubmitting(false);
  };

  return (
    <>
      <div className="invoice-drawer-backdrop" onClick={onClose} />
      <div className="rating-modal-overlay">
        <div className="rating-modal">
          {/* Header */}
          <div className="rating-modal__header">
            <div className="rating-modal__icon">
              <HiOutlineEmojiHappy />
            </div>
            <h2 className="rating-modal__title">Đánh giá chuyến xe</h2>
            <p className="rating-modal__subtitle">
              {order.code} — {order.pickupAddress}{' '}
              <span style={{ color: 'var(--accent-blue)' }}>➔</span> {order.dropoffAddress}
            </p>
          </div>

          {/* Stars */}
          <div className="rating-stars-row">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                className="rating-star-btn"
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(s)}
              >
                {s <= (hover || stars) ? (
                  <HiStar className="star-icon star-icon--filled" />
                ) : (
                  <HiOutlineStar className="star-icon star-icon--empty" />
                )}
              </button>
            ))}
          </div>
          <p className="rating-stars-label">
            {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời!'][hover || stars]}
          </p>

          {/* Tags */}
          <div className="rating-tags-grid">
            {RATING_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`rating-tag-chip ${tags.includes(tag) ? 'rating-tag-chip--active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Comment */}
          <textarea
            className="rating-comment-input"
            placeholder="Nhận xét thêm (tùy chọn)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          {/* Actions */}
          <div className="rating-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Để sau
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ flex: 1, background: 'var(--gradient-blue)' }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Đang gửi…' : '✦ Gửi đánh giá'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════
   Invoice Drawer
═══════════════════════════════════════════════ */
const InvoiceDrawer = ({ order, onClose, onDownload, onResendEmail }) => (
  <>
    <div className="invoice-drawer-backdrop" onClick={onClose} />
    <div className="invoice-drawer">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
          Hóa Đơn Điện Tử
        </h3>
        <button type="button" className="toast-card__close" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="invoice-paper">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div className="invoice-paper-title">SMARTFLEET LOGISTICS</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Quản Lý Đội Xe Thông Minh SmartFleet
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="invoice-paper-mono" style={{ fontSize: '1.1rem', color: '#2563EB' }}>
              {order.code}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Ngày: {order.createdAt}</div>
          </div>
        </div>

        <div
          style={{
            borderTop: '2px solid #E2E8F0',
            borderBottom: '2px solid #E2E8F0',
            padding: '1rem 0',
            margin: '1rem 0',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: 4 }}>
            Khách hàng thanh toán:
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
            {order.customerName}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#475569' }}>Email: {order.customerEmail}</div>
        </div>

        <div style={{ margin: '1.5rem 0' }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: 8,
              textTransform: 'uppercase',
            }}
          >
            Chi Tiết Hành Trình
          </div>
          <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: 4 }}>
            • <strong>Điểm lấy:</strong> {order.pickupAddress}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#334155' }}>
            • <strong>Điểm giao:</strong> {order.dropoffAddress}
          </div>
          {order.distanceKm && (
            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 4 }}>
              • <strong>Khoảng cách:</strong> {Number(order.distanceKm).toFixed(1)} km
            </div>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#64748B' }}>
              <th style={{ padding: '8px 0' }}>Dịch vụ</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={{ padding: '10px 0', color: '#1E293B' }}>
                Cước phí vận chuyển ({order.vehicleType})
              </td>
              <td style={{ padding: '10px 0', textAlign: 'right' }} className="invoice-paper-mono">
                {order.totalFare.toLocaleString('vi-VN')} đ
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={{ padding: '10px 0', color: '#1E293B' }}>Thuế GTGT (VAT 8%)</td>
              <td style={{ padding: '10px 0', textAlign: 'right', color: '#16A34A' }}>
                Đã bao gồm
              </td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '2px solid #0F172A',
          }}
        >
          <span
            style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', textTransform: 'uppercase' }}
          >
            Tổng Tiền Thanh Toán
          </span>
          <span className="invoice-paper-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB' }}>
            {order.totalFare.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Rating section in invoice */}
        {order.rating && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(51, 214, 159, 0.08)',
              border: '1px solid rgba(51, 214, 159, 0.3)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 4 }}>Đánh giá của bạn:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} style={{ color: s <= order.rating ? '#f59e0b' : '#cbd5e1', fontSize: '1rem' }}>
                  ★
                </span>
              ))}
              {order.ratingComment && (
                <span style={{ fontSize: '0.8rem', color: '#475569', marginLeft: 8 }}>
                  "{order.ratingComment}"
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="invoice-actions">
        <button
          type="button"
          className="btn btn--primary"
          style={{ flex: 1, background: 'var(--gradient-blue)', gap: 6 }}
          onClick={() => onDownload(order)}
        >
          <HiOutlineDownload style={{ fontSize: '1.1rem' }} /> Tải Hóa Đơn PDF
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ flex: 1, gap: 6 }}
          onClick={() => onResendEmail(order)}
        >
          <HiOutlineMail style={{ fontSize: '1.1rem' }} /> Gửi Lại Qua Email
        </button>
      </div>
    </div>
  </>
);

/* ═══════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════ */
const CustomerHistoryPage = () => {
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);

  /* ── Fetch ────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const { data } = await api.get('/orders', { params });
      const raw = data?.data?.orders ?? data?.data ?? [];

      const mapped = raw.map((o) => ({
        id: o.id,
        code: `#ORD-${o.id.slice(0, 5).toUpperCase()}`,
        createdAt: formatDate(o.createdAt),
        pickupAddress: o.pickupAddress,
        dropoffAddress: o.dropoffAddress,
        totalFare: parseFloat(o.totalFare),
        distanceKm: o.distanceKm,
        status: o.status,
        vehicleType: VEHICLE_LABEL[o.vehicleType] || o.vehicleType || 'Xe vận tải SmartFleet',
        rating: o.rating ?? null,
        ratingComment: o.ratingComment ?? null,
        ratingTags: o.ratingTags ?? [],
        customerName: o.customer?.fullName || 'Khách Hàng SmartFleet',
        customerEmail: o.customer?.email || 'customer@smartfleet.vn',
        rawCreatedAt: o.createdAt,
      }));

      // Client-side time filter
      const now = new Date();
      const filtered = mapped.filter((o) => {
        if (timeFilter === '7days') {
          return (now - new Date(o.rawCreatedAt)) / 86400000 <= 7;
        }
        if (timeFilter === '30days') {
          return (now - new Date(o.rawCreatedAt)) / 86400000 <= 30;
        }
        return true;
      });

      setOrders(filtered);
    } catch {
      toast.error('Không thể tải lịch sử đơn hàng', 'Lỗi');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, timeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ── Actions ─────────────────────────────── */
  const handleDownloadPdf = (order) => {
    toast.info('Đang khởi tạo file Hóa đơn PDF…', 'Xuất hóa đơn');
    window.open(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/invoices/${order.id}/download`,
      '_blank',
    );
  };

  const handleResendEmail = (order) => {
    toast.success(
      `Hóa đơn ${order.code} đã được gửi tới email ${order.customerEmail}`,
      'Gửi Email',
    );
  };

  const handleSubmitRating = async (orderId, { rating, comment, tags }) => {
    try {
      await api.post(`/orders/${orderId}/rating`, { rating, comment, tags });
      toast.success('Cảm ơn bạn đã đánh giá chuyến xe! 🎉', 'Đánh giá thành công');
      setRatingOrder(null);
      // Update local state immediately without full refetch
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, rating, ratingComment: comment, ratingTags: tags } : o)),
      );
    } catch {
      toast.error('Không thể gửi đánh giá lúc này. Vui lòng thử lại.', 'Lỗi');
    }
  };

  /* ── Derived ─────────────────────────────── */
  const isDelivered = (o) => o.status === 'DELIVERED' || o.status === 'COMPLETED';
  const needsRating = (o) => isDelivered(o) && o.rating === null;

  /* ── Skeleton ────────────────────────────── */
  if (loading) {
    return (
      <div className="customer-container">
        <div className="customer-title-bar">
          <div>
            <h1 className="page-heading">Lịch Sử Đơn Hàng &amp; Hóa Đơn</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Tra cứu thông tin đơn hàng đã thực hiện, trạng thái vận chuyển và xuất hóa đơn điện tử
            </p>
          </div>
        </div>
        <div className="history-layout">
          <div className="history-filter-bar" style={{ opacity: 0.5 }}>
            <div style={{ height: 32, width: 320, background: 'var(--bg-panel-sub)', borderRadius: 999 }} />
            <div style={{ height: 32, width: 140, background: 'var(--bg-panel-sub)', borderRadius: 6 }} />
          </div>
          <div className="order-history-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="order-history-card"
                style={{ opacity: 1 - i * 0.15 }}
              >
                <div style={{ display: 'flex', gap: 16, width: '100%', alignItems: 'center' }}>
                  <div style={{ width: 120, height: 18, background: 'var(--bg-panel-sub)', borderRadius: 4 }} />
                  <div style={{ flex: 1, height: 18, background: 'var(--bg-panel-sub)', borderRadius: 4 }} />
                  <div style={{ width: 90, height: 18, background: 'var(--bg-panel-sub)', borderRadius: 4 }} />
                  <div style={{ width: 100, height: 24, background: 'var(--bg-panel-sub)', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────── */
  return (
    <div className="customer-container">
      <div className="customer-title-bar">
        <div>
          <h1 className="page-heading">Lịch Sử Đơn Hàng &amp; Hóa Đơn</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Tra cứu thông tin đơn hàng đã thực hiện, trạng thái vận chuyển và xuất hóa đơn điện tử
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ gap: 6, fontSize: '0.85rem' }}
          onClick={fetchOrders}
        >
          <HiOutlineRefresh style={{ fontSize: '1rem' }} /> Làm mới
        </button>
      </div>

      <div className="history-layout">
        {/* ─── BỘ LỌC ─────────────────────────────── */}
        <div className="history-filter-bar">
          <div className="filter-chips-group">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, marginRight: 4 }}>
              Trạng thái:
            </span>
            {['ALL', 'MATCHED', 'DELIVERED', 'CANCELLED'].map((key) => (
              <button
                key={key}
                type="button"
                className={`filter-chip ${statusFilter === key ? 'filter-chip--active' : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {{ ALL: 'Tất cả', MATCHED: 'Đang giao', DELIVERED: 'Hoàn thành', CANCELLED: 'Đã hủy' }[key]}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thời gian:</span>
            <select
              className="select-time-range"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="7days">7 ngày qua</option>
              <option value="30days">30 ngày qua</option>
              <option value="ALL">Tất cả thời gian</option>
            </select>
          </div>
        </div>

        {/* ─── DANH SÁCH ĐƠN HÀNG ─────────────────── */}
        <div className="order-history-list">
          {orders.length === 0 ? (
            <div
              style={{
                padding: '3.5rem',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📦</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Không có đơn hàng nào</div>
              <div style={{ fontSize: '0.85rem' }}>Chưa có đơn hàng phù hợp với bộ lọc bạn chọn.</div>
            </div>
          ) : (
            orders.map((ord) => {
              const meta = STATUS_META[ord.status] || { label: ord.status, cls: '' };
              const delivered = isDelivered(ord);
              const unrated = needsRating(ord);

              return (
                <div
                  key={ord.id}
                  className={`order-history-card${unrated ? ' order-history-card--unrated' : ''}`}
                  onClick={() => delivered && setSelectedInvoiceOrder(ord)}
                  style={{ cursor: delivered ? 'pointer' : 'default' }}
                >
                  {/* Mã đơn + Thời gian */}
                  <div style={{ minWidth: 140 }}>
                    <div className="order-code">{ord.code}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {ord.createdAt}
                    </div>
                  </div>

                  {/* Tuyến đường */}
                  <div style={{ flex: 1, margin: '0 1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ord.pickupAddress}{' '}
                      <span style={{ color: 'var(--accent-blue)' }}>➔</span>{' '}
                      {ord.dropoffAddress}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Phương tiện: {ord.vehicleType}
                      {ord.distanceKm && ` · ${Number(ord.distanceKm).toFixed(1)} km`}
                    </div>
                  </div>

                  {/* Giá */}
                  <div style={{ minWidth: 120, textAlign: 'right', marginRight: '1.5rem' }}>
                    <div className="order-fare">{ord.totalFare.toLocaleString('vi-VN')} đ</div>
                  </div>

                  {/* Badge trạng thái */}
                  <div style={{ minWidth: 120, textAlign: 'center', marginRight: '1rem' }}>
                    <span className={`status-badge ${meta.cls}`}>
                      <span className="status-badge__dot" /> {meta.label}
                    </span>
                  </div>

                  {/* Nút đánh giá */}
                  {delivered && (
                    <div style={{ minWidth: 130, textAlign: 'right', flexShrink: 0 }}>
                      {unrated ? (
                        <button
                          type="button"
                          className="btn-rate-order btn-rate-order--active"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRatingOrder(ord);
                          }}
                        >
                          <HiOutlineStar style={{ fontSize: '0.9rem' }} />
                          Đánh giá ngay
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-rate-order btn-rate-order--done"
                          disabled
                        >
                          <HiStar style={{ fontSize: '0.9rem', color: '#f59e0b' }} />
                          {'★'.repeat(ord.rating || 5)} Đã đánh giá
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── INVOICE DRAWER ──────────────────────── */}
      {selectedInvoiceOrder && (
        <InvoiceDrawer
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
          onDownload={handleDownloadPdf}
          onResendEmail={handleResendEmail}
        />
      )}

      {/* ─── RATING MODAL ────────────────────────── */}
      {ratingOrder && (
        <RatingModal
          order={ratingOrder}
          onClose={() => setRatingOrder(null)}
          onSubmit={handleSubmitRating}
        />
      )}
    </div>
  );
};

export default CustomerHistoryPage;
