import { useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineSearch,
  HiOutlineRefresh,
  HiChevronRight,
  HiChevronLeft,
  HiOutlineX,
  HiOutlineLightningBolt,
  HiOutlineCheckCircle,
  HiOutlineTrash,
  HiOutlineExclamation,
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
  const { t } = useTranslation();
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

  // Selected orders for deletion
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [ordersToDelete, setOrdersToDelete] = useState([]); // array of order IDs targeted for deletion
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Fetch danh sách đơn từ API ────────────────────────────
  const fetchOrders = useCallback(
    async (targetPage = page, querySearch = searchTerm) => {
      setLoading(true);
      try {
        const params = {
          page: targetPage,
          limit: 10,
        };
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (querySearch && querySearch.trim()) params.search = querySearch.trim();

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

  // Debounced search & refetch khi page, statusFilter, hoặc searchTerm thay đổi
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(page, searchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [page, statusFilter, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Khi tìm kiếm bằng phím Enter, reset về trang 1
  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchOrders(1, searchTerm);
    }
  };

  // Nút xóa từ khóa tìm kiếm
  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
    fetchOrders(1, '');
  };

  // Switch filter tab
  const handleTabChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  // ─── Selection Handlers cho Xóa Hàng Loạt ─────────────────
  const currentPageIds = orders.map((o) => o.id);
  const isAllSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedOrderIds.includes(id));
  const isSomeSelected =
    currentPageIds.some((id) => selectedOrderIds.includes(id)) && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      const combined = new Set([...selectedOrderIds, ...currentPageIds]);
      setSelectedOrderIds(Array.from(combined));
    }
  };

  const handleToggleSelectOrder = (e, orderId) => {
    e.stopPropagation();
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleOpenDeleteModal = (targetIds) => {
    if (!targetIds || targetIds.length === 0) return;
    setOrdersToDelete(targetIds);
  };

  const handleConfirmDelete = async () => {
    if (ordersToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      const { data } = await api.delete('/admin/orders', {
        data: { orderIds: ordersToDelete },
      });
      toast.success(
        data.message || `Đã xóa ${ordersToDelete.length} đơn hàng thành công!`,
        'Xóa đơn hàng'
      );
      // Remove deleted IDs from selection
      setSelectedOrderIds((prev) => prev.filter((id) => !ordersToDelete.includes(id)));
      // Close detail modal if the open order was deleted
      if (selectedOrder && ordersToDelete.includes(selectedOrder.id)) {
        setSelectedOrder(null);
      }
      setOrdersToDelete([]);
      fetchOrders(page, searchTerm);
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi xóa đơn hàng';
      toast.error(msg, 'Thất bại');
    } finally {
      setIsDeleting(false);
    }
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
          <h1 className="admin-title">{t('ordersPage.title')}</h1>
          <p className="admin-subtitle">{t('ordersPage.subtitle')}</p>
        </div>
        <button
          type="button"
          className="orders-reload-btn"
          onClick={() => fetchOrders(page)}
        >
          <HiOutlineRefresh style={{ fontSize: '1.1rem' }} /> {t('ordersPage.btn_reload')}
        </button>
      </div>

      {/* Search Input */}
      <div className="orders-search-wrapper" style={{ position: 'relative' }}>
        <HiOutlineSearch className="orders-search-icon" />
        <input
          type="text"
          className="orders-search-input"
          placeholder={t('ordersPage.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchSubmit}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
            title="Xóa tìm kiếm"
          >
            <HiOutlineX style={{ fontSize: '1.1rem' }} />
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="orders-tab-bar">
        <button
          type="button"
          className={`orders-tab-btn ${statusFilter === 'ALL' ? 'orders-tab-btn--active' : ''}`}
          onClick={() => handleTabChange('ALL')}
        >
          {t('ordersPage.tab_all')} {counts.all}
        </button>
        <button
          type="button"
          className={`orders-tab-btn ${statusFilter === 'PROCESSING' ? 'orders-tab-btn--active' : ''}`}
          onClick={() => handleTabChange('PROCESSING')}
        >
          {t('ordersPage.tab_processing')} {counts.processing}
        </button>
        <button
          type="button"
          className={`orders-tab-btn ${statusFilter === 'DELIVERED' ? 'orders-tab-btn--active' : ''}`}
          onClick={() => handleTabChange('DELIVERED')}
        >
          {t('ordersPage.tab_delivered')} {counts.delivered}
        </button>
        <button
          type="button"
          className={`orders-tab-btn ${statusFilter === 'EXPIRED' ? 'orders-tab-btn--active' : ''}`}
          onClick={() => handleTabChange('EXPIRED')}
        >
          {t('ordersPage.tab_expired')} {counts.expired}
        </button>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="orders-bulk-action-bar">
          <div className="bulk-action-info">
            <span>{selectedOrderIds.length}</span>
            <span>{t('ordersPage.bulk_selected')}</span>
          </div>
          <div className="bulk-action-buttons">
            <button
              type="button"
              className="bulk-action-btn bulk-action-btn--cancel"
              onClick={handleClearSelection}
            >
              {t('ordersPage.bulk_cancel')}
            </button>
            <button
              type="button"
              className="bulk-action-btn bulk-action-btn--delete"
              onClick={() => handleOpenDeleteModal(selectedOrderIds)}
            >
              <HiOutlineTrash style={{ fontSize: '1.1rem' }} /> {t('ordersPage.bulk_delete')} {selectedOrderIds.length} {t('ordersPage.bulk_delete_orders')}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table Container */}
      <div className="orders-table-card">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
            {t('ordersPage.loading')}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
            {t('ordersPage.no_results')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="orders-checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>{t('ordersPage.col_status')}</th>
                  <th>{t('ordersPage.col_customer')}</th>
                  <th>{t('ordersPage.col_route')}</th>
                  <th>{t('ordersPage.col_price')}</th>
                  <th>{t('ordersPage.col_time')}</th>
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
                  const isSelected = selectedOrderIds.includes(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={`orders-table-row ${isSelected ? 'orders-table-row--selected' : ''}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* CHECKBOX */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="orders-checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectOrder(e, order.id)}
                        />
                      </td>

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

                      {/* ACTION / CHEVRON & DELETE */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="orders-row-action-btn orders-row-action-btn--delete"
                          title={t('ordersPage.delete_title')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteModal([order.id]);
                          }}
                        >
                          <HiOutlineTrash />
                        </button>
                        <button
                          type="button"
                          className="orders-row-action-btn"
                          title={t('ordersPage.view_detail')}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <HiChevronRight />
                        </button>
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
            {t('ordersPage.footer_show')} {orders.length} {t('ordersPage.footer_of')} {total} {t('ordersPage.footer_orders')}
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
                  {t('ordersPage.modal_title')} #{selectedOrder.id?.slice(-8).toUpperCase()}
                </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t('ordersPage.modal_subtitle')}</span>
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
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('ordersPage.detail_customer')}</span>
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
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('ordersPage.detail_order_id')}</span>
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
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('ordersPage.detail_driver')}</span>
                <strong style={{ color: selectedOrder.driver ? '#ffffff' : '#94a3b8', fontSize: '0.9rem' }}>
                  {selectedOrder.driver?.user?.fullName ||
                    selectedOrder.driver?.fullName ||
                    selectedOrder.driver?.name ||
                    t('ordersPage.no_driver')}
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
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('ordersPage.detail_vehicle')}</span>
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
                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{t('ordersPage.detail_pickup')}</span>
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
                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{t('ordersPage.detail_dropoff')}</span>
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
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('ordersPage.detail_time')}</span>
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
                onClick={() => handleOpenDeleteModal([selectedOrder.id])}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                title="Xóa đơn hàng này"
              >
                <HiOutlineTrash />
                Xóa đơn
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  flex: selectedOrder.status === 'PENDING' || selectedOrder.status === 'DRIVER_ACCEPTED' ? 0.5 : 1,
                  background: '#252f44',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
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

      {/* Modal xác nhận xóa đơn hàng (đơn lẻ hoặc hàng loạt) */}
      {ordersToDelete.length > 0 && (
        <div className="modal-overlay" onClick={() => !isDeleting && setOrdersToDelete([])}>
          <div className="delete-modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="delete-modal-close"
              disabled={isDeleting}
              onClick={() => setOrdersToDelete([])}
              title="Đóng"
            >
              <HiOutlineX />
            </button>

            <div className="delete-modal-icon-wrapper">
              <HiOutlineTrash />
            </div>

            <h3 className="delete-modal-title">Xác nhận xóa đơn hàng</h3>
            <p className="delete-modal-desc">
              {ordersToDelete.length === 1 ? (
                <>
                  Bạn có chắc chắn muốn xóa đơn hàng <strong>#{ordersToDelete[0].slice(-8).toUpperCase()}</strong> không?
                  <br />
                  Dữ liệu bị xóa sẽ không thể phục hồi.
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn xóa <strong>{ordersToDelete.length} đơn hàng</strong> đã chọn không?
                  <br />
                  Dữ liệu bị xóa sẽ không thể phục hồi.
                </>
              )}
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-btn-cancel"
                disabled={isDeleting}
                onClick={() => setOrdersToDelete([])}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="delete-btn-confirm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? 'Đang xóa...' : `Xác nhận xóa (${ordersToDelete.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
