import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import DispatchMap from '../../components/auth/DispatchMap';
import '../../styles/auth.css';

/* ─── Telemetry ticker — randomly drifts values ───── */
const useTelemetry = () => {
  const [data, setData] = useState({ speed: 67, eta: 14, fleet: 23 });

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => ({
        speed: Math.max(30, Math.min(120, prev.speed + Math.floor(Math.random() * 7 - 3))),
        eta: Math.max(3, Math.min(30, prev.eta + (Math.random() > 0.5 ? -1 : 1))),
        fleet: Math.max(15, Math.min(40, prev.fleet + (Math.random() > 0.7 ? 1 : Math.random() < 0.3 ? -1 : 0))),
      }));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return data;
};

/** Parse error from API response */
const parseApiError = (err, fallback) => {
  const errData = err.response?.data?.error;
  if (!errData) return fallback;

  if (errData.details && Array.isArray(errData.details) && errData.details.length > 0) {
    return errData.details.map((d) => d.message).join('. ');
  }

  const msg = errData.message;
  if (typeof msg === 'string') {
    if (msg.startsWith('[')) {
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => item.message).join('. ');
        }
      } catch {
        // ignore JSON parse error
      }
    }
    return msg;
  }

  return fallback;
};

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const toast = useToast();

  // Determine initial tab from route
  const [activeTab, setActiveTab] = useState(
    location.pathname === '/register' ? 'register' : 'login'
  );
  const [formKey, setFormKey] = useState(0); // For re-triggering animation

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  // Register state
  const [regForm, setRegForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: 'CUSTOMER',
    vehicleType: 'motorcycle',
    licensePlate: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const telemetry = useTelemetry();

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setFormKey((k) => k + 1);
    // Update URL without full navigation
    window.history.replaceState(null, '', tab === 'login' ? '/login' : '/register');
  };

  /* ── Login handler ─────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      toast.success(`Chào mừng ${user.fullName || 'bạn'} trở lại SmartFleet!`, 'Đăng nhập thành công');
      setTimeout(() => {
        switch (user.role) {
          case 'ADMIN': navigate('/admin'); break;
          case 'DRIVER': navigate('/driver'); break;
          case 'CUSTOMER': navigate('/customer'); break;
          default: navigate('/');
        }
      }, 400);
    } catch (err) {
      const errorMsg = parseApiError(err, 'Đăng nhập không thành công');
      setError(errorMsg);
      toast.error(errorMsg, 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  /* ── Register handler ──────── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(regForm);
      if (user.role === 'DRIVER') {
        toast.warning('Tài khoản tài xế đã được tạo. Đang chờ Quản trị viên duyệt!', 'Đăng ký tài xế');
      } else {
        toast.success('Đăng ký tài khoản Khách hàng thành công!', 'Tạo tài khoản');
      }
      setTimeout(() => {
        switch (user.role) {
          case 'DRIVER': navigate('/driver'); break;
          case 'CUSTOMER': navigate('/customer'); break;
          default: navigate('/');
        }
      }, 500);
    } catch (err) {
      const errorMsg = parseApiError(err, 'Đăng ký không thành công');
      setError(errorMsg);
      toast.error(errorMsg, 'Lỗi đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const updateReg = (key, val) => setRegForm({ ...regForm, [key]: val });

  return (
    <div className="auth-shell">
      {/* ─── Mobile Strip ─────────────────────── */}
      <div className="auth-mobile-strip">
        <div className="auth-mobile-strip__brand">
          <div className="auth-mobile-strip__icon">SF</div>
          <span className="auth-mobile-strip__name">SMARTFLEET</span>
        </div>
        <div className="dispatch-badge" style={{ margin: 0 }}>
          <span className="dispatch-badge__dot" />
          LIVE
        </div>
      </div>

      {/* ─── Left Column: Dispatch Panel ─────── */}
      <div className="auth-dispatch">
        {/* Badge */}
        <div className="dispatch-badge">
          <span className="dispatch-badge__dot" />
          LIVE DISPATCH
        </div>

        {/* Map */}
        <div className="dispatch-map">
          <DispatchMap />
        </div>

        {/* Telemetry Gauges */}
        <div className="dispatch-telemetry">
          <div className="telemetry-card">
            <span className="telemetry-card__label">Speed</span>
            <span className="telemetry-card__value">
              {telemetry.speed}
              <span className="telemetry-card__unit">km/h</span>
            </span>
          </div>
          <div className="telemetry-card">
            <span className="telemetry-card__label">ETA</span>
            <span className="telemetry-card__value">
              {telemetry.eta}
              <span className="telemetry-card__unit">min</span>
            </span>
          </div>
          <div className="telemetry-card telemetry-card--online">
            <span className="telemetry-card__label">Fleet Online</span>
            <span className="telemetry-card__value">
              {telemetry.fleet}
              <span className="telemetry-card__unit">vehicles</span>
            </span>
          </div>
        </div>

        {/* Branding */}
        <div className="dispatch-branding">
          <div className="dispatch-branding__icon">SF</div>
          <div>
            <div className="dispatch-branding__text">SMARTFLEET</div>
            <div className="dispatch-branding__sub">Hệ thống quản lý đội xe thông minh</div>
          </div>
        </div>
      </div>

      {/* ─── Right Column: Form ──────────────── */}
      <div className="auth-form-panel">
        {/* Tabs */}
        <div className="auth-tabs">
          <button
            id="tab-login"
            className={`auth-tab ${activeTab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => switchTab('login')}
            type="button"
          >
            Đăng nhập
          </button>
          <button
            id="tab-register"
            className={`auth-tab ${activeTab === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => switchTab('register')}
            type="button"
          >
            Đăng ký
          </button>
        </div>

        {/* ── Login Form ─────────────────────── */}
        {activeTab === 'login' && (
          <div className="auth-form-enter" key={`login-${formKey}`}>
            <div className="auth-form-header">
              <h1 className="auth-form-header__title">Chào mừng trở lại</h1>
              <p className="auth-form-header__subtitle">
                Đăng nhập vào hệ thống SmartFleet để quản lý đội xe của bạn
              </p>
            </div>

            {error && (
              <div className="auth-error">
                <span>⚠</span> {error}
              </div>
            )}

            <form className="auth-form" onSubmit={handleLogin}>
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  className="auth-field__input"
                  type="email"
                  placeholder="you@company.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label className="auth-field__label" htmlFor="login-password">Mật khẩu</label>
                <input
                  id="login-password"
                  className="auth-field__input"
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                id="btn-login"
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading ? <span className="auth-spinner" /> : 'Đăng nhập'}
              </button>
            </form>

            <div className="auth-footer">
              Chưa có tài khoản?{' '}
              <button type="button" className="auth-footer__link" onClick={() => switchTab('register')}>
                Đăng ký ngay
              </button>
            </div>
          </div>
        )}

        {/* ── Register Form ──────────────────── */}
        {activeTab === 'register' && (
          <div className="auth-form-enter" key={`register-${formKey}`}>
            <div className="auth-form-header">
              <h1 className="auth-form-header__title">Tạo tài khoản mới</h1>
              <p className="auth-form-header__subtitle">
                Đăng ký SmartFleet với vai trò Khách hàng hoặc Tài xế
              </p>
            </div>

            {error && (
              <div className="auth-error">
                <span>⚠</span> {error}
              </div>
            )}

            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="reg-fullname">Họ và tên</label>
                <input
                  id="reg-fullname"
                  className="auth-field__input"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={regForm.fullName}
                  onChange={(e) => updateReg('fullName', e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="auth-field">
                <label className="auth-field__label" htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  className="auth-field__input"
                  type="email"
                  placeholder="you@company.com"
                  value={regForm.email}
                  onChange={(e) => updateReg('email', e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* 2-column: Phone + Role */}
              <div className="auth-field-row">
                <div className="auth-field">
                  <label className="auth-field__label" htmlFor="reg-phone">Số điện thoại</label>
                  <input
                    id="reg-phone"
                    className="auth-field__input"
                    type="tel"
                    placeholder="0901 234 567"
                    value={regForm.phoneNumber}
                    onChange={(e) => updateReg('phoneNumber', e.target.value)}
                    required
                    autoComplete="tel"
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-field__label" htmlFor="reg-role">Vai trò</label>
                  <select
                    id="reg-role"
                    className="auth-field__select"
                    value={regForm.role}
                    onChange={(e) => updateReg('role', e.target.value)}
                  >
                    <option value="CUSTOMER">Khách hàng</option>
                    <option value="DRIVER">Tài xế</option>
                  </select>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-field__label" htmlFor="reg-password">Mật khẩu</label>
                <input
                  id="reg-password"
                  className="auth-field__input"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={regForm.password}
                  onChange={(e) => updateReg('password', e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* Driver-specific fields */}
              {regForm.role === 'DRIVER' && (
                <>
                  <div className="auth-field-row">
                    <div className="auth-field">
                      <label className="auth-field__label" htmlFor="reg-vehicle">Loại phương tiện</label>
                      <select
                        id="reg-vehicle"
                        className="auth-field__select"
                        value={regForm.vehicleType}
                        onChange={(e) => updateReg('vehicleType', e.target.value)}
                        required
                      >
                        {/* <option value="">Chọn loại xe</option> */}
                        <option value="motorcycle">Xe máy</option>
                        <option value="car_4">Ô tô 4 chỗ</option>
                        <option value="car_7">Ô tô 7 chỗ</option>
                      </select>
                    </div>
                    <div className="auth-field">
                      <label className="auth-field__label" htmlFor="reg-plate">Biển số xe</label>
                      <input
                        id="reg-plate"
                        className="auth-field__input"
                        type="text"
                        placeholder="51A-12345"
                        value={regForm.licensePlate}
                        onChange={(e) => updateReg('licensePlate', e.target.value)}
                        required
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="auth-driver-notice">
                    ⚠️ Tài khoản tài xế cần được quản trị viên phê duyệt trước khi có thể bắt đầu nhận đơn.
                  </div>
                </>
              )}

              <button
                id="btn-register"
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading ? <span className="auth-spinner" /> : 'Tạo tài khoản'}
              </button>
            </form>

            <div className="auth-footer">
              Đã có tài khoản?{' '}
              <button type="button" className="auth-footer__link" onClick={() => switchTab('login')}>
                Đăng nhập
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
