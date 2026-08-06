import { useState, useEffect } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../services/api';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 15 };
        if (statusFilter) params.status = statusFilter;
        const { data } = await api.get('/admin/orders', { params });
        setOrders(data.data.orders);
        setTotal(data.data.total);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [page, statusFilter]);

  const formatDate = (date) => new Date(date).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-xl)' }}>
        <h2 className="dashboard__title" style={{ margin: 0 }}>Order & Dispatch</h2>
        <div className="chart-card__toggle">
          {['', 'PENDING', 'MATCHED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].map((s) => (
            <button key={s} className={`chart-card__toggle-btn ${statusFilter === s ? 'chart-card__toggle-btn--active' : ''}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Pickup</th>
              <th>Dropoff</th>
              <th>Distance</th>
              <th>Fare</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No orders found</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td><code style={{ fontSize: 'var(--fs-xs)' }}>{order.id.slice(0, 8)}...</code></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.customer?.fullName}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.pickupAddress}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.dropoffAddress}</td>
                  <td>{Number(order.distanceKm).toFixed(1)} km</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{Number(order.totalFare).toLocaleString('vi-VN')}₫</td>
                  <td>{order.driver?.user?.fullName || '—'}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{formatDate(order.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 15 && (
          <div className="pagination">
            <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / 15)}</span>
            <button className="pagination__btn" disabled={page * 15 >= total} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
