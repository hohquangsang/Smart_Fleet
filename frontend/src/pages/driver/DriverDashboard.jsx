import { useState, useEffect, useCallback, useContext } from 'react';
import { HiOutlineTruck, HiOutlineStatusOnline, HiOutlineStatusOffline } from 'react-icons/hi';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import { SocketContext } from '../../contexts/SocketContext';
import api from '../../services/api';

const DriverDashboard = () => {
  const socket = useContext(SocketContext);
  const [driver, setDriver] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/drivers/me');
        setDriver(data.data.driver);
        setIsOnline(data.data.driver.isActive);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const toggleOnline = useCallback(() => {
    if (!socket) return;

    if (isOnline) {
      socket.emit('go-offline');
      setIsOnline(false);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          socket.emit('go-online', { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsOnline(true);
        },
        (err) => alert('Location access required to go online')
      );
    }
  }, [socket, isOnline]);

  // Listen for status changes
  useEffect(() => {
    if (!socket) return;
    socket.on('status-changed', ({ status }) => setIsOnline(status === 'online'));
    socket.on('order-confirmed', ({ order }) => setCurrentOrder(order));
    return () => { socket.off('status-changed'); socket.off('order-confirmed'); };
  }, [socket]);

  if (loading) return <div className="dashboard"><div className="spinner spinner--lg" style={{margin:'2rem auto'}}/></div>;

  const isPending = driver?.approvalStatus === 'PENDING';
  const isRejected = driver?.approvalStatus === 'REJECTED';

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">Driver Dashboard</h2>

      {isPending && (
        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: 'var(--accent-yellow)', marginBottom: '1.5rem' }}>
          ⏳ Your account is pending admin approval. You cannot go online yet.
        </div>
      )}

      {isRejected && (
        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-red)', marginBottom: '1.5rem' }}>
          ❌ Your account has been rejected. Please contact support.
        </div>
      )}

      <div className="stats-grid">
        <StatCard
          label="Status"
          value={isOnline ? 'Online' : 'Offline'}
          icon={isOnline ? <HiOutlineStatusOnline /> : <HiOutlineStatusOffline />}
          accentColor={isOnline ? 'var(--accent-green)' : 'var(--text-muted)'}
        />
        <StatCard
          label="Vehicle"
          value={driver?.vehicleType || '—'}
          icon={<HiOutlineTruck />}
          trendText={driver?.licensePlate}
          accentColor="var(--accent-blue)"
        />
        <StatCard label="Rating" value={`⭐ ${Number(driver?.rating || 5).toFixed(1)}`} accentColor="var(--accent-yellow)" />
        <StatCard label="Approval" value={driver?.approvalStatus} accentColor={isPending ? 'var(--accent-yellow)' : isRejected ? 'var(--accent-red)' : 'var(--accent-green)'} />
      </div>

      {!isPending && !isRejected && (
        <div style={{ marginTop: '1.5rem' }}>
          <button className={`btn ${isOnline ? 'btn--danger' : 'btn--success'} btn--lg`} onClick={toggleOnline}
            style={{ minWidth: 200 }}>
            {isOnline ? '🔴 Go Offline' : '🟢 Go Online'}
          </button>
        </div>
      )}

      {currentOrder && (
        <div className="chart-card animate-fade-in" style={{ marginTop: '1.5rem' }}>
          <div className="chart-card__subtitle">Current Order</div>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Pickup:</strong> {currentOrder.pickupAddress}</p>
            <p><strong>Dropoff:</strong> {currentOrder.dropoffAddress}</p>
            <p><strong>Fare:</strong> {Number(currentOrder.totalFare).toLocaleString('vi-VN')}₫</p>
            <StatusBadge status={currentOrder.status} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
