import { useState, useEffect } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../services/api';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/orders');
        setOrders(data.data.orders);
      } catch (err) {
        console.error('Failed to fetch driver order history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (date) => new Date(date).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">Trip History</h2>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Pickup Address</th>
              <th>Dropoff Address</th>
              <th>Distance</th>
              <th>Earnings</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No completed trips in your history
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td><code style={{ fontSize: 'var(--fs-xs)' }}>{order.id.slice(0, 8)}...</code></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.customer?.fullName}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.pickupAddress}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.dropoffAddress}</td>
                  <td>{Number(order.distanceKm).toFixed(1)} km</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{Number(order.totalFare).toLocaleString('vi-VN')}₫</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{formatDate(order.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;
