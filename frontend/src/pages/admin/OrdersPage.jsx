import { useState, useEffect, useContext } from 'react';
import {
  HiOutlineClipboardList,
  HiOutlineSearch,
  HiOutlineCheckCircle,
  HiOutlineLightningBolt,
  HiOutlineX,
  HiOutlineTruck,
  HiOutlineClock,
} from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';
import '../../styles/admin.css';

const STATUS_LABELS = {
  PENDING: { label: 'Chờ duyệt', color: '#F5A623', bg: 'rgba(245,166,35,0.12)' },
  DISPATCHING: { label: 'Đang phân phối', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  DRIVER_ACCEPTED: { label: 'Tài xế đã nhận', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  MATCHED: { label: 'Đã khớp tài xế', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  IN_TRANSIT: { label: 'Đang giao', color: '#33D69F', bg: 'rgba(51,214,159,0.12)' },
  DELIVERED: { label: 'Đã giao', color: '#33D69F', bg: 'rgba(51,214,159,0.15)' },
  CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  EXPIRED_NO_DRIVER: { label: 'Hết hạn', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

const AdminOrdersPage = () => {
  const toast = useToast();
  const socket = useContext(SocketContext);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(null); // orderId đang xử lý
  const [selectedOrder, setSelectedOrder] = useState(null); // chi tiết modal

  // ─── Fetch danh sách đơn từ API ────────────────────────────
  const fetchOrders = async () => {
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const { data } = await api.get('/admin/orders', { params });
      setOrders(data.data?.orders || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Socket: nhận đơn mới real-time ────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (orderData) => {
      console.log('📋 [Admin] admin:new-order-request received:', orderData);
      toast.info(
        `Đơn mới từ ${orderData.customerName || 'Khách hàng'} — ${orderData.totalFare?.toLocaleString('vi-VN') || '?'}đ`,
        '📦 Đơn hàng mới'
      );
      // Thêm đơn mới vào đầu danh sách
      setOrders((prev) => [
        {
          id: orderData.orderId,
          status: 'PENDING',
          customer: { fullName: orderData.customerName },
          pickupAddress: orderData.pickupAddress,
          dropoffAddress: orderData.dropoffAddress,
          totalFare: orderData.totalFare,
          vehicleType: orderData.vehicleType,
          createdAt: orderData.createdAt,
        },
        ...prev.filter((o) => o.id !== orderData.orderId),
      ]);
    };

    const handleDriverAccepted = (data) => {
      console.log('🤝 [Admin] admin:driver-accepted received:', data);
      const driverInfo = data.driverInfo || data.driver;
      toast.success(
        `Tài xế ${driverInfo?.name || '?'} (${driverInfo?.licensePlate || ''}) đã nhận đơn ${data.orderId?.slice(-8).toUpperCase()} — ĐANG GIAO`,
        'Tài xế nhận đơn'
      );
      // Cập nhật status đơn hàng trong list thành IN_TRANSIT
      setOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId ? { ...o, status: 'IN_TRANSIT', driver: driverInfo } : o
        )
      );
    };

    const handleOrderStatusUpdate = (data) => {
      console.log('🔄 [Admin] admin:order-status-update received:', data);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId ? { ...o, status: data.status, ...(data.driver ? { driver: data.driver } : {}) } : o
        )
      );
    };

    socket.on('admin:new-order-request', handleNewOrder);
    socket.on('admin:driver-accepted', handleDriverAccepted);
    socket.on('admin:order-status-update', handleOrderStatusUpdate);

    return () => {
      socket.off('admin:new-order-request', handleNewOrder);
      socket.off('admin:driver-accepted', handleDriverAccepted);
      socket.off('admin:order-status-update', handleOrderStatusUpdate);
    };
  }, [socket, toast]);

  // ─── Dispatch đơn hàng đến drivers ─────────────────────────
  const handleDispatch = async (orderId) => {
    setProcessing(orderId);
    try {
      await api.post(`/orders/${orderId}/dispatch`);
      toast.success('Đã phân phối đơn đến tài xế online! Đang đợi tài xế nhận...', 'Dispatch thành công');
      // Cập nhật status local ngay
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'DISPATCHING' } : o))
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Dispatch thất bại';
      toast.error(msg, 'Lỗi dispatch');
    } finally {
      setProcessing(null);
    }
  };

  // ─── Confirm match (admin xác nhận sau khi driver nhận) ────
  const handleConfirmMatch = async (orderId) => {
    setProcessing(orderId);
    try {
      await api.post(`/orders/${orderId}/confirm-match`);
      toast.success('Đã xác nhận khớp tài xế! Đơn hàng chuyển sang MATCHED.', 'Confirm Match');
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'MATCHED' } : o))
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Confirm match thất bại';
      toast.error(msg, 'Lỗi');
    } finally {
      setProcessing(null);
    }
  };

  // ─── Filter + Search ────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchSearch =
      !searchTerm ||
      o.pickupAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.dropoffAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="admin-container">
      <div className="admin-header-bar">
        <div>
          <h1 className="admin-title">Quản Lý Đơn Hàng</h1>
          <p className="admin-subtitle">
            Real-time via Socket.IO · Admin dispatch & confirm match
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={fetchOrders}
          style={{
            background: 'var(--accent-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <HiOutlineClipboardList /> Tải lại
        </button>
      </div>

      {/* ─── FILTER + SEARCH ────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <HiOutlineSearch
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Tìm kiếm địa chỉ, khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            style={{
              width: '100%',
              paddingLeft: 36,
              padding: '9px 12px 9px 36px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            padding: '9px 14px',
            fontSize: '0.9rem',
          }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="DISPATCHING">Đang phân phối</option>
          <option value="DRIVER_ACCEPTED">Tài xế đã nhận</option>
          <option value="MATCHED">Đã khớp</option>
          <option value="IN_TRANSIT">Đang giao</option>
          <option value="DELIVERED">Đã giao</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* ─── DANH SÁCH ĐƠN HÀNG ──────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
          Đang tải dữ liệu...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            padding: '3rem',
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            border: '1px solid var(--border-primary)',
          }}
        >
          <HiOutlineClipboardList style={{ fontSize: '2.5rem', marginBottom: 8 }} />
          <div>Chưa có đơn hàng nào</div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Đơn mới sẽ hiện tự động qua Socket.IO
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredOrders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' };
            const isProcessing = processing === order.id;

            return (
              <div
                key={order.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 12,
                  padding: '1.2rem 1.4rem',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Status badge */}
                <div
                  style={{
                    minWidth: 120,
                    background: statusInfo.bg,
                    color: statusInfo.color,
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    border: `1px solid ${statusInfo.color}30`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {statusInfo.label}
                </div>

                {/* Thông tin đơn */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-blue)', fontSize: '0.85rem' }}>
                      #{order.id?.slice(-8).toUpperCase() || '?'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <HiOutlineClock style={{ verticalAlign: 'middle' }} />
                      {' '}
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                      {order.totalFare ? `${Number(order.totalFare).toLocaleString('vi-VN')}đ` : '—'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <strong>KH:</strong> {order.customer?.fullName || '—'}
                    {order.driver?.name && (
                      <span style={{ marginLeft: 12 }}>
                        <HiOutlineTruck style={{ verticalAlign: 'middle' }} />{' '}
                        <strong>TX:</strong> {order.driver.name} · {order.driver.licensePlate || ''}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    📍 <span style={{ color: 'var(--accent-green)' }}>{order.pickupAddress || '—'}</span>
                    {' → '}
                    🏁 <span style={{ color: 'var(--accent-blue)' }}>{order.dropoffAddress || '—'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                  {/* PENDING → Dispatch */}
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleDispatch(order.id)}
                      disabled={isProcessing}
                      style={{
                        background: 'var(--accent-blue)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        opacity: isProcessing ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <HiOutlineLightningBolt />
                      {isProcessing ? 'Đang gửi...' : 'Dispatch'}
                    </button>
                  )}

                  {/* DRIVER_ACCEPTED → Confirm Match */}
                  {order.status === 'DRIVER_ACCEPTED' && (
                    <button
                      type="button"
                      onClick={() => handleConfirmMatch(order.id)}
                      disabled={isProcessing}
                      style={{
                        background: '#8B5CF6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        opacity: isProcessing ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <HiOutlineCheckCircle />
                      {isProcessing ? 'Đang xác nhận...' : 'Confirm Match'}
                    </button>
                  )}

                  {/* View detail */}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL CHI TIẾT ─────────────────────────── */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 14,
              padding: '2rem',
              width: 480,
              maxWidth: '95vw',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                Chi tiết đơn #{selectedOrder.id?.slice(-8).toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}
              >
                <HiOutlineX />
              </button>
            </div>

            <pre style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(selectedOrder, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
