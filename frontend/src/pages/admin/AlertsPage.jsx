import StatusBadge from '../../components/common/StatusBadge';

const AlertsPage = () => {
  const alerts = [
    { id: 1, alert: 'Delay on Route 4', detail: 'ETA slipped by 32 min due to traffic jam', vehicle: 'North Loop - TRK-184', time: '08:42 AM', level: 'critical' },
    { id: 2, alert: 'Low fuel threshold', detail: '18% fuel remaining - refuel recommended', vehicle: 'South Yard - TRK-202', time: '08:37 AM', level: 'warning' },
    { id: 3, alert: 'Route deviation detected', detail: 'Vehicle 12 km off assigned corridor', vehicle: 'East Corridor - TRK-091', time: '08:18 AM', level: 'warning' },
    { id: 4, alert: 'Driver Unresponsive', detail: 'No GPS ping received for 5 minutes', vehicle: 'Central Station - MTR-012', time: '07:55 AM', level: 'critical' },
  ];

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">System Alerts & Notifications</h2>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Alert Summary</th>
              <th>Vehicle / Location</th>
              <th>Time</th>
              <th>Severity Level</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.alert}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{item.detail}</div>
                </td>
                <td>{item.vehicle}</td>
                <td>{item.time}</td>
                <td><StatusBadge status={item.level} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlertsPage;
