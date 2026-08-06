import { useState, useEffect } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../services/api';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/orders');
        setOrders(data.data.orders);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">My Orders</h2>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr><th>Pickup</th><th>Dropoff</th><th>Distance</th><th>Fare</th><th>Driver</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:4}).map((_,i) => <tr key={i}>{Array.from({length:6}).map((_,j) => <td key={j}><div className="skeleton" style={{height:16,width:'80%'}}/></td>)}</tr>)
            : orders.length === 0 ? <tr><td colSpan={6} style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}>No orders yet</td></tr>
            : orders.map(o => (
              <tr key={o.id}>
                <td>{o.pickupAddress}</td>
                <td>{o.dropoffAddress}</td>
                <td>{Number(o.distanceKm).toFixed(1)} km</td>
                <td style={{fontWeight:600,color:'var(--accent-green)'}}>{Number(o.totalFare).toLocaleString('vi-VN')}₫</td>
                <td>{o.driver?.user?.fullName || '—'}</td>
                <td><StatusBadge status={o.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyOrdersPage;
