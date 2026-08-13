import { useState, useEffect, useContext, useCallback } from 'react';
import {
  HiOutlineSearch,
  HiOutlineRefresh,
  HiChevronRight,
  HiChevronLeft,
  HiOutlineX,
  HiOutlineLightningBolt,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import '../../styles/admin.css';

// Helper: Trích xuất 2 chữ cái đầu của tên khách hàng
const getInitials = (name) => {
  if (!name) return 'KH';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper: Định dạng thời gian theo kiểu '14:12 · 13/8' hoặc '14:02 · hôm nay'
const formatOrderTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timePart = `${hours}:${minutes}`;

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) return `${timePart} · hôm nay`;
  if (isYesterday) return `${timePart} · hôm qua`;

  return `${timePart} · ${d.getDate()}/${d.getMonth() + 1}`;
};

// Helper: Lấy thông tin hiển thị trạng thái (màu sắc & label)
const getStatusInfo = (status) => {
  switch (status) {
    case 'DELIVERED':
    case 'COMPLETED':
      return { label: '• Đã giao', className: 'status-pill--green' };
    case 'EXPIRED_NO_DRIVER':
    case 'CANCELLED':
      return { label: '• Hết hạn', className: 'status-pill--gray' };
    case 'IN_TRANSIT':
    case 'PICKED_UP':
      return { label: '• Đang giao', className: 'status-pill--amber' };
    case 'PENDING':
      return { label: '• Chờ duyệt', className: 'status-pill--amber' };
    case 'DISPATCHING':
      return { label: '• Đang xử lý', className: 'status-pill--blue' };
    case 'DRIVER_ACCEPTED':
      return { label: '• TX đã nhận', className: 'status-pill--purple' };
    case 'MATCHED':
      return { label: '• Đã khớp', className: 'status-pill--blue' };
    default:
      return { label: `• ${status || 'Chưa rõ'}`, className: 'status-pill--gray' };
  }
};

const AdminOrdersPage = () => {
  const toast = useToast();
  const socket = useContext(SocketContext);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ all: 0, processing: 0, delivered: 0, expired: 0 });

  const [processing, setProcessing] = useState(null); // orderId đang xử lý
  const [selectedOrder, setSelectedOrder] = useState(null); // modal chi tiết

  // ─── Fetch danh sách đơn từ API ────────────────────────────
  const fetchOrders = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const params = {
          page: targetPage,
          limit: 10,
        };
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (searchTerm.trim()) params.search = searchTerm.trim();

        const { data } = await api.get('/admin/orders', { params });

        if (data.success && data.data) {
          setOrders(data.data.orders || []);
          setTotal(data.data.total || 0);
          setTotalPages(data.data.totalPages || 1);
          if (data.data.counts) {
            setCounts(data.data.counts);
          }
        }
      } catch {
        toast.error('Lỗi khi tải danh sách đơn hàng', 'Thất bại');
      } finally {
        setLoading(false);
      }
    },
    [page, statusFilter, searchTerm, toast]
  );

  useEffect(() => {
    fetchOrders(page);
  }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Khi tìm kiếm, reset về trang 1
  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchOrders(1);
    }
  };

  // Switch filter tab
  const handleTabChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  // ─── Socket: nhận đơn mới & cập nhật trạng thái real-time ──
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (orderData) => {
      console.log('📋 [Admin] Socket order new:', orderData);
      toast.info(
        `Đơn mới từ ${orderData.customerName || 'Khách hàng'} — ${orderData.totalFare?.toLocaleString('vi-VN') || '?'}đ`,
        '📦 Đơn hàng mới'
      );
      fetchOrders(page);
    };

    const handleDriverAccepted = (data) => {
      console.log('🤝 [Admin] Socket driver accepted:', data);
      const driverInfo = data.driverInfo || data.driver;
      toast.success(
        `Tài xế ${driverInfo?.name || '?'} đã nhận đơn ${data.orderId?.slice(-8).toUpperCase()}`,
        'Tài xế nhận đơn'
      );
      fetchOrders(page);
    };

    const handleOrderStatusUpdate = (data) => {
      console.log('🔄 [Admin] Socket status update:', data);
      fetchOrders(page);
    };

    socket.on('admin:new-order-request', handleNewOrder);
    socket.on('admin:driver-accepted', handleDriverAccepted);
    socket.on('admin:order-status-update', handleOrderStatusUpdate);

    return () => {
      socket.off('admin:new-order-request', handleNewOrder);
      socket.off('admin:driver-accepted', handleDriverAccepted);
      socket.off('admin:order-status-update', handleOrderStatusUpdate);
    };
  }, [socket, toast, fetchOrders, page]);

  // ─── Dispatch đơn hàng đến drivers ─────────────────────────
  const handleDispatch = async (orderId) => {
    setProcessing(orderId);
    try {
      await api.post(`/orders/${orderId}/dispatch`);
      toast.success('Đã phân phối đơn đến tài xế online!', 'Dispatch thành công');
      fetchOrders(page);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'DISPATCHING' } : null));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Dispatch thất bại';
      toast.error(msg, 'Lỗi dispatch');
    } finally {
      setProcessing(null);
    }
  };

  // ─── Confirm match ─────────────────────────────────────────
  const handleConfirmMatch = async (orderId) => {
    setProcessing(orderId);
    try {
      await api.post(`/orders/${orderId}/confirm-match`);
      toast.success('Đã xác nhận khớp tài xế!', 'Confirm Match');
      fetchOrders(page);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'MATCHED' } : null));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Confirm match thất bại';
      toast.error(msg, 'Lỗi');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="admin-container admin-orders-container">
      {/* Header Bar */}
      <div className="admin-header-bar">
        <div>
          <h1 className="admin-title">Quản lý đơn hàng</h1>
          <p className="admin-subtitle">
            Real-time qua Socket.IO - Admin dispatch & confirm match
          </p>
        </div>
        <button
          type="button"
          className="orders-reload-btn"
          onClick={() => fetchOrders(page)}
        >
          <HiOutlineRefresh style={{ fontSize: '1.1rem' }} /> Tải lại
        </button>
      </div>

      {/* Search Input */}
      <div className="orders-search-wrapper">
        <HiOutlineSearch className="orders-search-icon" />
        <input
          type="text"
          className="orders-search-input"
          placeholder="Tìm địa chỉ, khách hàng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchSubmit}
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="orders-tab-bar">
        <button
          type="button"
          className={`orders-tab-btn ${statusFilter === 'ALL' ? 'orders-tab-btn--active' : ''}`}
          onClick={() => handleTabChange('ALL')}
        >
          Tất cả {counts.all}
        </button>
        <button
          type="button"
          className={`orders-tab-btn ${statusFilter === 'PROCESSING' ? 'orders-tab-btn--active' : ''}`}
          onClick={() => handleTabChange('PROCESSING')}
        >
          Đang xử lý {counts.processing}
        </button>
        <button
          type="button"
          className={`orders-tab-btn ${statusFilter === 'DELIVERED' ? 'orders-tab-btn--active' : ''}`}
          onClick={() => handleTabChange('DELIVERED')}
        >
          Đã giao {counts.delivered}
        </button>
        <button
          type="button"
          className={`orders-tab-btn ${statusFilter === 'EXPIRED' ? 'orders-tab-btn--active' : ''}`}
          onClick={() => handleTabChange('EXPIRED')}
        >
          Hết hạn {counts.expired}
        </button>
      </div>

      {/* Orders Table Container */}
      <div className="orders-table-card">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
            Đang tải dữ liệu đơn hàng...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
            Không có đơn hàng nào phù hợp với bộ lọc
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th>TRẠNG THÁI</th>
                  <th>KHÁCH HÀNG</th>
                  <th>TUYẾN ĐƯỜNG</th>
                  <th>GIÁ</th>
                  <th>THỜI GIAN</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const customerName =
                    order.customer?.fullName || order.customerName || 'Khách hàng';
                  const initials = getInitials(customerName);
                  const orderCode = `#${order.id?.slice(-8).toUpperCase() || '—'}`;

                  return (
                    <tr
                      key={order.id}
                      className="orders-table-row"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* TRẠNG THÁI */}
                      <td>
                        <span className={`status-pill ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* KHÁCH HÀNG */}
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">{initials}</div>
                          <div className="customer-info">
                            <span className="customer-name">{customerName}</span>
                            <span className="customer-code">{orderCode}</span>
                          </div>
                        </div>
                      </td>

                      {/* TUYẾN ĐƯỜNG */}
                      <td>
                        <div className="route-cell">
                          <span className="route-dot route-dot--green"></span>
                          <span
                            style={{
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                            title={order.pickupAddress}
                          >
                            {order.pickupAddress || '—'}
                          </span>
                          <span className="route-arrow">→</span>
                          <span className="route-dot route-dot--blue"></span>
                          <span
                            style={{
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                            title={order.dropoffAddress}
                          >
                            {order.dropoffAddress || '—'}
                          </span>
                        </div>
                      </td>

                      {/* GIÁ */}
                      <td>
                        <span className="fare-text">
                          {Number(order.totalFare || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </td>

                      {/* THỜI GIAN */}
                      <td>
                        <span className="time-text">
                          {formatOrderTime(order.createdAt)}
                        </span>
                      </td>

                      {/* ACTION / CHEVRON */}
                      <td style={{ textAlign: 'right' }}>
                        <HiChevronRight className="chevron-icon" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Pagination */}
        <div className="orders-table-footer">
          <div className="orders-footer-info">
            Hiển thị {orders.length} trên {total} đơn hàng
          </div>

          <div className="orders-pagination">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <HiChevronLeft />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                type="button"
                className={`pagination-btn ${pNum === page ? 'pagination-btn--active' : ''}`}
                onClick={() => setPage(pNum)}
              >
                {pNum}
              </button>
            ))}

            <button
              type="button"
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <HiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL CHI TIẾT ĐƠN HÀNG ─────────────────────────────── */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: '#111622',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: '1.75rem',
              width: 520,
              maxWidth: '100%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <h3
                  style={{
                    color: '#ffffff',
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: 700,
                  }}
                >
                  Chi Tiết Đơn Hàng #{selectedOrder.id?.slice(-8).toUpperCase()}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Thông tin vận chuyển thực thời trên SmartFleet
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                }}
              >
                <HiOutlineX />
              </button>
            </div>

            {/* 8 thông tin chi tiết */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 1. Khách hàng */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#161c2d',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>👤 Tên khách hàng:</span>
                <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>
                  {selectedOrder.customer?.fullName || selectedOrder.customerName || 'Chưa cập nhật'}
                </strong>
              </div>

              {/* 2. Order ID */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#161c2d',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🆔 OrderID:</span>
                <strong style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {selectedOrder.id}
                </strong>
              </div>

              {/* 3. Tên Tài xế */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#161c2d',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🚚 Tên Tài xế:</span>
                <strong style={{ color: selectedOrder.driver ? '#ffffff' : '#94a3b8', fontSize: '0.9rem' }}>
                  {selectedOrder.driver?.user?.fullName ||
                    selectedOrder.driver?.fullName ||
                    selectedOrder.driver?.name ||
                    'Chưa gán tài xế'}
                </strong>
              </div>

              {/* 4. Phương tiện */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#161c2d',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🛵 Phương tiện:</span>
                <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>
                  {selectedOrder.driver?.vehicleType || selectedOrder.vehicleType || 'Xe Máy Express'}
                </strong>
              </div>

              {/* 5. Điểm đón */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  background: '#161c2d',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>📍 Điểm đón:</span>
                <strong style={{ color: '#10b981', fontSize: '0.88rem' }}>
                  {selectedOrder.pickupAddress || 'Chưa cập nhật'}
                </strong>
              </div>

              {/* 6. Điểm đến */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  background: '#161c2d',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>🏁 Điểm đến:</span>
                <strong style={{ color: '#3b82f6', fontSize: '0.88rem' }}>
                  {selectedOrder.dropoffAddress || 'Chưa cập nhật'}
                </strong>
              </div>

              {/* 7. Thời gian */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#161c2d',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>⏰ Thời gian:</span>
                <strong style={{ color: '#ffffff', fontSize: '0.88rem' }}>
                  {selectedOrder.createdAt
                    ? new Date(selectedOrder.createdAt).toLocaleString('vi-VN')
                    : 'Chưa cập nhật'}
                </strong>
              </div>

              {/* 8. Giá tiền */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>
                  💵 Giá tiền:
                </span>
                <strong style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 800 }}>
                  {selectedOrder.totalFare
                    ? `${Number(selectedOrder.totalFare).toLocaleString('vi-VN')} đ`
                    : '0 đ'}
                </strong>
              </div>
            </div>

            {/* Actions Footer inside modal */}
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: 10 }}>
              {selectedOrder.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => handleDispatch(selectedOrder.id)}
                  disabled={processing === selectedOrder.id}
                  style={{
                    flex: 1,
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <HiOutlineLightningBolt />
                  {processing === selectedOrder.id ? 'Đang gửi...' : 'Dispatch Đơn'}
                </button>
              )}

              {selectedOrder.status === 'DRIVER_ACCEPTED' && (
                <button
                  type="button"
                  onClick={() => handleConfirmMatch(selectedOrder.id)}
                  disabled={processing === selectedOrder.id}
                  style={{
                    flex: 1,
                    background: '#8b5cf6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <HiOutlineCheckCircle />
                  {processing === selectedOrder.id ? 'Đang xác nhận...' : 'Confirm Match'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  flex: selectedOrder.status === 'PENDING' || selectedOrder.status === 'DRIVER_ACCEPTED' ? 0.5 : 1,
                  background: '#252f44',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
