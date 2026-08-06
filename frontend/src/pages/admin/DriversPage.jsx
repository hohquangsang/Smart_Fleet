import { useState, useEffect } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../services/api';

const DriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    try {
      const params = filter !== 'ALL' ? { approval: filter } : {};
      const { data } = await api.get('/admin/drivers', { params });
      setDrivers(data.data.drivers);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, [filter]);

  const handleApproval = async (driverId, action) => {
    try {
      await api.patch(`/admin/drivers/${driverId}/approve`, { action });
      fetchDrivers();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const filteredDrivers = drivers;

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-xl)' }}>
        <h2 className="dashboard__title" style={{ margin: 0 }}>Fleet Management</h2>
        <div className="chart-card__toggle">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
            <button key={f} className={`chart-card__toggle-btn ${filter === f ? 'chart-card__toggle-btn--active' : ''}`}
              onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>License Plate</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
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
            ) : filteredDrivers.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No drivers found</td></tr>
            ) : (
              filteredDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{driver.user?.fullName}</td>
                  <td>{driver.user?.email}</td>
                  <td>{driver.user?.phoneNumber}</td>
                  <td style={{ textTransform: 'capitalize' }}>{driver.vehicleType}</td>
                  <td><code style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4 }}>{driver.licensePlate}</code></td>
                  <td>⭐ {Number(driver.rating).toFixed(1)}</td>
                  <td><StatusBadge status={driver.approvalStatus} /></td>
                  <td>
                    {driver.approvalStatus === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn--success btn--sm" onClick={() => handleApproval(driver.id, 'approve')}>
                          Approve
                        </button>
                        <button className="btn btn--danger btn--sm" onClick={() => handleApproval(driver.id, 'reject')}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriversPage;
