import { useState, useEffect, useCallback, useContext } from 'react';
import { SocketContext } from '../../contexts/SocketContext';

const AvailableOrders = () => {
  const socket = useContext(SocketContext);
  const [orders, setOrders] = useState([]);

  const handleNewOrder = useCallback((order) => {
    setOrders((prev) => {
      if (prev.find((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });
  }, []);

  const handleAccept = useCallback((orderId) => {
    if (!socket) return;
    socket.emit('accept-order', { orderId });

    // Listen for result
    socket.once('order-confirmed', ({ orderId: id }) => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      alert('✅ Order accepted successfully!');
    });

    socket.once('order-taken', ({ message }) => {
      alert(`❌ ${message}`);
    });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new-order', handleNewOrder);
    return () => socket.off('new-order', handleNewOrder);
  }, [socket, handleNewOrder]);

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">Available Orders</h2>

      {orders.length === 0 ? (
        <div className="chart-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-lg)' }}>
            Waiting for new orders...
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: '0.5rem' }}>
            Make sure you are online to receive dispatched orders
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--sp-lg)' }}>
          {orders.map((order) => (
            <div key={order.id} className="chart-card animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {order.distanceKm} km • ETA {order.aiEtaMin || order.baseEtaMin} min
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>📍 {order.pickupAddress}</div>
                  <div style={{ fontWeight: 600 }}>📦 {order.dropoffAddress}</div>
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                    Customer: {order.customer?.fullName}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--accent-green)' }}>
                    {Number(order.totalFare).toLocaleString('vi-VN')}₫
                  </div>
                  <button className="btn btn--success" style={{ marginTop: '0.75rem' }}
                    onClick={() => handleAccept(order.id)}>
                    ✅ Accept Order
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableOrders;
