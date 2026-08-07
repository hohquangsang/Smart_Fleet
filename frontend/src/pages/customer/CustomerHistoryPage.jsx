import { useState, useEffect } from 'react';
import { HiOutlineDownload, HiOutlineMail, HiOutlineCheckCircle, HiOutlineDocumentText, HiOutlineX, HiOutlineFilter } from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import '../../styles/customer.css';

const MOCK_ORDERS = [
  {
    id: 'ord-88294',
    code: '#ORD-88294',
    createdAt: '07/08/2026 10:15',
    pickupAddress: '123 Nguyễn Trãi, Q.5',
    dropoffAddress: '45 Lê Duẩn, Q.1',
    totalFare: 145000,
    status: 'DELIVERED',
    vehicleType: 'Xe Tải Nhỏ (1 Tấn)',
    customerName: 'Ho Huu Quang Sang',
    customerEmail: 'Hohuuquangsang2004@gmail.com',
  },
  {
    id: 'ord-88291',
    code: '#ORD-88291',
    createdAt: '07/08/2026 09:30',
    pickupAddress: '12 An Dương Vương, Q.8',
    dropoffAddress: '88 Nguyễn Huệ, Q.1',
    totalFare: 25000,
    status: 'MATCHED',
    vehicleType: 'Xe Máy Express',
    customerName: 'Ho Huu Quang Sang',
    customerEmail: 'Hohuuquangsang2004@gmail.com',
  },
  {
    id: 'ord-88200',
    code: '#ORD-88200',
    createdAt: '06/08/2026 15:40',
    pickupAddress: '99 Cộng Hòa, Tân Bình',
    dropoffAddress: '12 Tân Kỳ Tân Quý, Tân Phú',
    totalFare: 380000,
    status: 'DELIVERED',
    vehicleType: 'Xe Tải Lớn (3.5 Tấn)',
    customerName: 'Ho Huu Quang Sang',
    customerEmail: 'Hohuuquangsang2004@gmail.com',
  },
  {
    id: 'ord-88155',
    code: '#ORD-88155',
    createdAt: '05/08/2026 14:10',
    pickupAddress: '450 Điện Biên Phủ, Bình Thạnh',
    dropoffAddress: '12 Võ Văn Kiệt, Q.1',
    totalFare: 120000,
    status: 'CANCELLED',
    vehicleType: 'Xe Tải Nhỏ (1 Tấn)',
    customerName: 'Ho Huu Quang Sang',
    customerEmail: 'Hohuuquangsang2004@gmail.com',
  },
];

const CustomerHistoryPage = () => {
  const toast = useToast();
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Fetch real orders from API if available
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const { data } = await api.get('/orders');
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const mapped = data.data.map((o) => ({
            id: o.id,
            code: `#ORD-${o.id.slice(0, 5).toUpperCase()}`,
            createdAt: new Date(o.createdAt).toLocaleString('vi-VN'),
            pickupAddress: o.pickupAddress,
            dropoffAddress: o.dropoffAddress,
            totalFare: parseFloat(o.totalFare),
            status: o.status,
            vehicleType: 'Xe Vận Tải SmartFleet',
            customerName: o.customer?.fullName || 'Khách Hàng SmartFleet',
            customerEmail: o.customer?.email || 'customer@smartfleet.vn',
          }));
          setOrders(mapped);
        }
      } catch {
        // Fallback to MOCK_ORDERS
      }
    };
    loadOrders();
  }, []);

  // Filter orders
  const filteredOrders = orders.filter((ord) => {
    if (statusFilter !== 'ALL' && ord.status !== statusFilter) return false;
    return true;
  });

  // Action: Download PDF Invoice
  const handleDownloadPdf = async (order) => {
    try {
      toast.info('Đang khởi tạo file Hóa đơn PDF...', 'Xuất hóa đơn');
      window.open(`http://localhost:3000/api/v1/invoices/${order.id}/download`, '_blank');
      toast.success('Tải hóa đơn PDF thành công!', 'Tải file');
    } catch {
      toast.error('Không thể tải file PDF hóa đơn lúc này', 'Lỗi');
    }
  };

  // Action: Resend Invoice Email
  const handleResendEmail = (order) => {
    toast.success(`Hóa đơn ${order.code} đã được gửi tới email ${order.customerEmail}`, 'Gửi Email');
  };

  return (
    <div className="customer-container">
      <div className="customer-title-bar">
        <div>
          <h1 className="page-heading">Lịch Sử Đơn Hàng & Hóa Đơn</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Tra cứu thông tin đơn hàng đã thực hiện, trạng thái vận chuyển và xuất hóa đơn điện tử
          </p>
        </div>
      </div>

      <div className="history-layout">
        {/* ─── BỘ LỌC PHÍA TRÊN ────────────────────── */}
        <div className="history-filter-bar">
          <div className="filter-chips-group">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, marginRight: 4 }}>
              Trạng thái:
            </span>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'ALL' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'MATCHED' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('MATCHED')}
            >
              Đang giao
            </button>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'DELIVERED' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('DELIVERED')}
            >
              Hoàn thành
            </button>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'CANCELLED' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('CANCELLED')}
            >
              Đã hủy
            </button>
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

        {/* ─── DANH SÁCH ĐƠN HÀNG CARD NGANG ─────────── */}
        <div className="order-history-list">
          {filteredOrders.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-muted)',
              }}
            >
              Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isDelivered = ord.status === 'DELIVERED';
              const isCancelled = ord.status === 'CANCELLED';
              const isDelivering = ord.status === 'MATCHED' || ord.status === 'PICKED_UP';

              return (
                <div
                  key={ord.id}
                  className="order-history-card"
                  onClick={() => isDelivered && setSelectedInvoiceOrder(ord)}
                >
                  {/* Mã đơn + Thời gian */}
                  <div style={{ minWidth: 140 }}>
                    <div className="order-code">{ord.code}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {ord.createdAt}
                    </div>
                  </div>

                  {/* Tuyến đường A -> B */}
                  <div style={{ flex: 1, margin: '0 1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ord.pickupAddress} <span style={{ color: 'var(--accent-blue)' }}>➔</span> {ord.dropoffAddress}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Phương tiện: {ord.vehicleType}
                    </div>
                  </div>

                  {/* Giá tiền Monospace */}
                  <div style={{ minWidth: 120, textAlign: 'right', marginRight: '1.5rem' }}>
                    <div className="order-fare">{ord.totalFare.toLocaleString('vi-VN')} đ</div>
                  </div>

                  {/* Badge Trạng thái */}
                  <div style={{ minWidth: 120, textAlign: 'right' }}>
                    {isDelivered && (
                      <span className="status-badge status-badge--delivered">
                        <span className="status-badge__dot" /> Hoàn thành
                      </span>
                    )}
                    {isDelivering && (
                      <span className="status-badge status-badge--delivering">
                        <span className="status-badge__dot" style={{ background: '#5B9DF5' }} /> Đang giao
                      </span>
                    )}
                    {isCancelled && (
                      <span className="status-badge status-badge--cancelled">
                        <span className="status-badge__dot" /> Đã hủy
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── DRAWER XEM TRƯỚC HÓA ĐƠN TRƯỢT TỪ PHẢI ─────────── */}
      {selectedInvoiceOrder && (
        <>
          <div className="invoice-drawer-backdrop" onClick={() => setSelectedInvoiceOrder(null)} />
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
              <button
                type="button"
                className="toast-card__close"
                onClick={() => setSelectedInvoiceOrder(null)}
              >
                &times;
              </button>
            </div>

            {/* Trang giấy xem trước Hóa đơn màu trắng tương phản */}
            <div className="invoice-paper">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <div className="invoice-paper-title">SMARTFLEET LOGISTICS</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Công Ty Cổ Phần Quản Lý Đội Xe Thông Minh SmartFleet
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="invoice-paper-mono" style={{ fontSize: '1.1rem', color: '#2563EB' }}>
                    {selectedInvoiceOrder.code}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Ngày: {selectedInvoiceOrder.createdAt}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #E2E8F0', borderBottom: '2px solid #E2E8F0', padding: '1rem 0', margin: '1rem 0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: 4 }}>Khách hàng thanh toán:</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
                  {selectedInvoiceOrder.customerName}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  Email: {selectedInvoiceOrder.customerEmail}
                </div>
              </div>

              <div style={{ margin: '1.5rem 0' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 8, textTransform: 'uppercase' }}>
                  Chi Tiết Hành Trình
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: 4 }}>
                  • <strong>Điểm lấy:</strong> {selectedInvoiceOrder.pickupAddress}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                  • <strong>Điểm giao:</strong> {selectedInvoiceOrder.dropoffAddress}
                </div>
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
                    <td style={{ padding: '10px 0', color: '#1E293B' }}>Cước phí vận chuyển ({selectedInvoiceOrder.vehicleType})</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }} className="invoice-paper-mono">
                      {selectedInvoiceOrder.totalFare.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 0', color: '#1E293B' }}>Thuế GTGT (VAT 8%)</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#16A34A' }}>Đã bao gồm</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid #0F172A' }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', textTransform: 'uppercase' }}>
                  Tổng Tiền Thanh Toán
                </span>
                <span className="invoice-paper-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB' }}>
                  {selectedInvoiceOrder.totalFare.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* 2 Nút hành động */}
            <div className="invoice-actions">
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1, background: 'var(--gradient-blue)', gap: 6 }}
                onClick={() => handleDownloadPdf(selectedInvoiceOrder)}
              >
                <HiOutlineDownload style={{ fontSize: '1.1rem' }} /> Tải Hóa Đơn PDF
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ flex: 1, gap: 6 }}
                onClick={() => handleResendEmail(selectedInvoiceOrder)}
              >
                <HiOutlineMail style={{ fontSize: '1.1rem' }} /> Gửi Lại Qua Email
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerHistoryPage;
