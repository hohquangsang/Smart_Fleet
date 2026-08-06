import { useEffect, useState } from 'react';
import useSocket from '../../hooks/useSocket';

const LiveFleetPage = () => {
  const [fleetLocations, setFleetLocations] = useState({});

  useSocket('fleet-location-update', (data) => {
    setFleetLocations((prev) => ({
      ...prev,
      [data.driverId]: data,
    }));
  });

  const driversList = Object.values(fleetLocations);

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-xl)' }}>
        <h2 className="dashboard__title" style={{ margin: 0 }}>Live Fleet Monitor</h2>
        <span className="status-badge status-badge--online">
          <span className="status-badge__dot" />
          {driversList.length} Drivers Broadcasting
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-lg)' }}>
        {/* Real-time map placeholder card */}
        <div className="chart-card" style={{ height: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px border var(--border-primary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>Live GPS Fleet Radar</div>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center', maxWidth: 400 }}>
            WebSocket connections active. Receiving driver coordinates in real-time.
          </p>
        </div>

        {/* Live Driver Feed List */}
        <div className="chart-card" style={{ height: 500, overflowY: 'auto' }}>
          <div className="chart-card__header">
            <div className="chart-card__subtitle">Active Drivers ({driversList.length})</div>
          </div>
          {driversList.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Waiting for driver telemetry...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
              {driversList.map((d) => (
                <div key={d.driverId} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: 'var(--fs-sm)' }}>
                    Driver ID: {d.driverId.slice(0, 8)}...
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                    📍 Lat: {d.lat.toFixed(4)}, Lng: {d.lng.toFixed(4)}
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Speed: {d.speed || 0} km/h | Heading: {d.heading || 0}°
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveFleetPage;
