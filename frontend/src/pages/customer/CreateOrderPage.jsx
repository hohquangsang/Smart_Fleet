import { useState } from 'react';
import api from '../../services/api';
import '../../styles/dashboard.css';

const CreateOrderPage = () => {
  const [form, setForm] = useState({
    pickupAddress: '', pickupLat: '', pickupLng: '',
    dropoffAddress: '', dropoffLat: '', dropoffLng: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key, val) => setForm({ ...form, [key]: val });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        ...form,
        pickupLat: parseFloat(form.pickupLat),
        pickupLng: parseFloat(form.pickupLng),
        dropoffLat: parseFloat(form.dropoffLat),
        dropoffLng: parseFloat(form.dropoffLng),
      };
      const { data } = await api.post('/orders', payload);
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">Create New Order</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-xl)' }}>
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__subtitle">Order Details</div>
          </div>

          {error && <div className="auth-card__error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
            <div className="input-group">
              <label className="input-group__label">Pickup Address</label>
              <input className="input" placeholder="123 Street, District, City" value={form.pickupAddress} onChange={(e) => update('pickupAddress', e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)' }}>
              <div className="input-group">
                <label className="input-group__label">Pickup Latitude</label>
                <input className="input" type="number" step="any" placeholder="10.762" value={form.pickupLat} onChange={(e) => update('pickupLat', e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-group__label">Pickup Longitude</label>
                <input className="input" type="number" step="any" placeholder="106.660" value={form.pickupLng} onChange={(e) => update('pickupLng', e.target.value)} required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-group__label">Dropoff Address</label>
              <input className="input" placeholder="456 Avenue, District, City" value={form.dropoffAddress} onChange={(e) => update('dropoffAddress', e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-sm)' }}>
              <div className="input-group">
                <label className="input-group__label">Dropoff Latitude</label>
                <input className="input" type="number" step="any" placeholder="10.803" value={form.dropoffLat} onChange={(e) => update('dropoffLat', e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-group__label">Dropoff Longitude</label>
                <input className="input" type="number" step="any" placeholder="106.714" value={form.dropoffLng} onChange={(e) => update('dropoffLng', e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? <><span className="spinner" /> Calculating...</> : '📦 Create Order'}
            </button>
          </form>
        </div>

        {result && (
          <div className="chart-card animate-fade-in">
            <div className="chart-card__header">
              <div className="chart-card__subtitle">Order Confirmed ✅</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Distance</span>
                <span style={{ fontWeight: 700 }}>{result.route.distanceKm} km</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Base ETA</span>
                <span style={{ fontWeight: 700 }}>{result.route.baseEtaMin} min</span>
              </div>
              {result.route.aiEtaMin && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <span style={{ color: 'var(--accent-purple)' }}>🧠 AI ETA</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>{result.route.aiEtaMin} min</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
                <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--accent-blue)' }}>Total Fare</span>
                <span style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--accent-blue)' }}>{result.fare.totalFare.toLocaleString('vi-VN')}₫</span>
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
                {result.route.cached ? '⚡ Route served from cache' : '🗺️ Route calculated from OpenRouteService'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateOrderPage;
