import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phoneNumber: '',
    role: 'CUSTOMER', vehicleType: '', licensePlate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register(form);
      switch (user.role) {
        case 'DRIVER': navigate('/driver'); break;
        case 'CUSTOMER': navigate('/customer'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (key, val) => setForm({ ...form, [key]: val });

  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-card__logo">
          <div style={{
            width: 48, height: 48, borderRadius: '12px', margin: '0 auto',
            background: 'var(--gradient-blue)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem',
          }}>
            SF
          </div>
        </div>

        <h1 className="auth-card__title">Create Account</h1>
        <p className="auth-card__subtitle">Join SmartFleet as a Customer or Driver</p>

        {error && <div className="auth-card__error">{error}</div>}

        <form className="auth-card__form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-group__label">Full Name</label>
            <input className="input" placeholder="Your full name" value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-group__label">Email</label>
            <input type="email" className="input" placeholder="you@example.com"
              value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-group__label">Phone Number</label>
            <input className="input" placeholder="0901234567" value={form.phoneNumber}
              onChange={(e) => update('phoneNumber', e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-group__label">Password</label>
            <input type="password" className="input" placeholder="Min 6 characters"
              value={form.password} onChange={(e) => update('password', e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-group__label">Role</label>
            <select className="input" value={form.role} onChange={(e) => update('role', e.target.value)}>
              <option value="CUSTOMER">Customer</option>
              <option value="DRIVER">Driver</option>
            </select>
          </div>

          {form.role === 'DRIVER' && (
            <>
              <div className="input-group">
                <label className="input-group__label">Vehicle Type</label>
                <select className="input" value={form.vehicleType} onChange={(e) => update('vehicleType', e.target.value)} required>
                  <option value="">Select vehicle</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-group__label">License Plate</label>
                <input className="input" placeholder="51A-12345" value={form.licensePlate}
                  onChange={(e) => update('licensePlate', e.target.value)} required />
              </div>
              <div style={{
                padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem',
                background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
                color: 'var(--accent-yellow)',
              }}>
                ⚠️ Driver accounts require admin approval before you can go online.
              </div>
            </>
          )}

          <button type="submit" className="btn btn--primary btn--lg" disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-card__footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
