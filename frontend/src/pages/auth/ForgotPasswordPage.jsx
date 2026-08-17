import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPasswordApi, verifyOtpApi, resetPasswordApi } from '../../services/api';
import useToast from '../../hooks/useToast';
import DispatchMap from '../../components/auth/DispatchMap';
import '../../styles/auth.css';
import '../../styles/forgot-password.css';

/* ─── Telemetry ticker ─────────────────────────── */
const useTelemetry = () => {
  const [data, setData] = useState({ speed: 67, eta: 14, fleet: 23 });
  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => ({
        speed: Math.max(30, Math.min(120, prev.speed + Math.floor(Math.random() * 7 - 3))),
        eta:   Math.max(3,  Math.min(30,  prev.eta   + (Math.random() > 0.5 ? -1 : 1))),
        fleet: Math.max(15, Math.min(40,  prev.fleet  + (Math.random() > 0.7 ? 1 : Math.random() < 0.3 ? -1 : 0))),
      }));
    }, 2500);
    return () => clearInterval(id);
  }, []);
  return data;
};

/* ─── Parse API error ──────────────────────────── */
const parseApiError = (err, fallback) => {
  const errData = err.response?.data?.error;
  if (!errData) return fallback;
  if (errData.details && Array.isArray(errData.details) && errData.details.length > 0)
    return errData.details.map((d) => d.message).join('. ');
  if (typeof errData.message === 'string') return errData.message;
  return fallback;
};

/* ─── Countdown hook ───────────────────────────── */
const useCountdown = (initial) => {
  const [remaining, setRemaining] = useState(initial);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  const reset = () => setRemaining(initial);
  return { remaining, reset };
};

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* ─── Step Indicator ───────────────────────────── */
const STEP_LABELS = ['Nhập Email', 'Xác nhận OTP', 'Mật khẩu mới'];

const StepIndicator = ({ step }) => (
  <div className="fp-stepper">
    {STEP_LABELS.map((label, i) => {
      const idx    = i + 1;
      const done   = idx < step;
      const active = idx === step;
      return (
        <div key={idx} className="fp-stepper__item">
          {/* connector trước (không show cho step đầu) */}
          <div className={`fp-stepper__line fp-stepper__line--before ${done || active ? 'fp-stepper__line--lit' : ''} ${idx === 1 ? 'fp-stepper__line--invisible' : ''}`} />
          <div className={`fp-stepper__bubble ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}>
            {done
              ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <span>{idx}</span>
            }
          </div>
          {/* connector sau (không show cho step cuối) */}
          <div className={`fp-stepper__line fp-stepper__line--after ${done ? 'fp-stepper__line--lit' : ''} ${idx === STEP_LABELS.length ? 'fp-stepper__line--invisible' : ''}`} />
          <span className={`fp-stepper__label ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}>{label}</span>
        </div>
      );
    })}
  </div>
);

/* ─── OTP Grid ─────────────────────────────────── */
const OtpGrid = ({ value, onChange, disabled }) => {
  const refs   = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const set = (idx, char) => {
    const next = [...digits]; next[idx] = char;
    onChange(next.join(''));
    if (char && idx < 5) refs.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits]; next[idx - 1] = '';
      onChange(next.join('')); refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus();
  };

  const onPaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(p.padEnd(6, '').slice(0, 6));
    refs.current[Math.min(p.length, 5)]?.focus();
  };

  return (
    <div className="fp-otp-grid">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          id={`otp-${i}`}
          className={`fp-otp-cell${d ? ' is-filled' : ''}`}
          type="text" inputMode="numeric" maxLength={1}
          value={d} disabled={disabled}
          onChange={(e) => set(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          autoComplete="one-time-code"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
};

/* ─── Password Strength ────────────────────────── */
const PwStrength = ({ value }) => {
  if (!value) return null;
  let s = 0;
  if (value.length >= 6)         s++;
  if (value.length >= 10)        s++;
  if (/[A-Z]/.test(value))      s++;
  if (/[0-9]/.test(value))      s++;
  if (/[^A-Za-z0-9]/.test(value)) s++;
  const META = [,'Rất yếu','Yếu','Trung bình','Mạnh','Rất mạnh'];
  const COLORS = [,'#ef4444','#f97316','#eab308','#22c55e','#10b981'];
  const idx = Math.min(s, 5);
  return (
    <div className="fp-pw-strength">
      <div className="fp-pw-strength__bars">
        {[1,2,3,4,5].map((n) => (
          <div key={n} className="fp-pw-strength__bar"
            style={{ background: n <= s ? COLORS[idx] : 'var(--auth-border)' }} />
        ))}
      </div>
      <span style={{ color: COLORS[idx], fontSize: '0.72rem', fontWeight: 600, minWidth: 56, textAlign: 'right' }}>
        {META[idx]}
      </span>
    </div>
  );
};

/* ─── Eye Toggle Icon ──────────────────────────── */
const EyeIcon = ({ open }) => open
  ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20C7 20 2.73 16.39 1 12c.69-1.76 1.81-3.31 3.19-4.54M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.61 11 8-.82 2.05-2.21 3.84-3.99 5.01M16.24 16.24L7.76 7.76" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M1 12C2.73 7.61 7 4 12 4c5 0 9.27 3.61 11 8-1.73 4.39-6 8-11 8-5 0-9.27-3.61-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>;

/* ─── Reusable PwField ─────────────────────────── */
const PwField = ({ id, label, value, onChange, show, onToggle, placeholder }) => (
  <div className="auth-field">
    <label className="auth-field__label" htmlFor={id}>{label}</label>
    <div className="fp-pw-wrap">
      <input
        id={id} className="auth-field__input"
        type={show ? 'text' : 'password'}
        placeholder={placeholder} value={value}
        onChange={onChange} required
        autoComplete="new-password"
        style={{ paddingRight: '2.8rem' }}
      />
      <button type="button" className="fp-pw-toggle" onClick={onToggle} tabIndex={-1}>
        <EyeIcon open={show} />
      </button>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
const ForgotPasswordPage = () => {
  const navigate  = useNavigate();
  const toast     = useToast();
  const telemetry = useTelemetry();

  const [step, setStep]       = useState(1);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const [email, setEmail]             = useState('');
  const [otp, setOtp]                 = useState('');
  const [resetToken, setResetToken]   = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { remaining, reset: resetTimer } = useCountdown(60);
  const canResend = remaining === 0;

  const go = (n) => { setStep(n); setError(''); setFormKey((k) => k + 1); };

  /* Step 1 */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await forgotPasswordApi(email);
      toast.success('Mã OTP đã được gửi!', 'Kiểm tra hộp thư');
      resetTimer(); go(2);
    } catch (err) {
      const msg = parseApiError(err, 'Không thể gửi OTP. Thử lại sau.');
      setError(msg);
    } finally { setLoading(false); }
  };

  /* Resend */
  const handleResend = async () => {
    if (!canResend || loading) return;
    setError(''); setLoading(true);
    try {
      await forgotPasswordApi(email);
      setOtp(''); resetTimer();
      toast.success('Đã gửi lại mã OTP mới!');
    } catch (err) {
      const details = err.response?.data?.error?.details;
      setError(details?.cooldownSeconds
        ? `Vui lòng chờ ${details.cooldownSeconds}s trước khi gửi lại.`
        : parseApiError(err, 'Không thể gửi lại. Thử lại sau.'));
    } finally { setLoading(false); }
  };

  /* Step 2 */
  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Nhập đủ 6 chữ số OTP.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await verifyOtpApi(email, otp);
      setResetToken(res.data.data.resetToken);
      toast.success('OTP hợp lệ!');
      go(3);
    } catch (err) {
      setError(parseApiError(err, 'OTP không đúng hoặc đã hết hạn.'));
    } finally { setLoading(false); }
  };

  /* Step 3 */
  const handleReset = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (newPw.length < 6)    { setError('Mật khẩu phải từ 6 ký tự trở lên.'); return; }
    setError(''); setLoading(true);
    try {
      await resetPasswordApi(email, resetToken, newPw, confirmPw);
      setDone(true);
      toast.success('Mật khẩu đã được cập nhật!', 'Thành công');
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      setError(parseApiError(err, 'Không thể đặt lại mật khẩu. Thử lại từ đầu.'));
    } finally { setLoading(false); }
  };

  const pwMatch     = confirmPw && newPw === confirmPw;
  const pwMismatch  = confirmPw && newPw !== confirmPw;

  return (
    <div className="auth-shell">
      {/* Mobile strip */}
      <div className="auth-mobile-strip">
        <div className="auth-mobile-strip__brand">
          <div className="auth-mobile-strip__icon">SF</div>
          <span className="auth-mobile-strip__name">SMARTFLEET</span>
        </div>
        <div className="dispatch-badge" style={{ margin: 0 }}>
          <span className="dispatch-badge__dot" /> LIVE
        </div>
      </div>

      {/* Left panel */}
      <div className="auth-dispatch">
        <div className="dispatch-badge"><span className="dispatch-badge__dot" /> LIVE DISPATCH</div>
        <div className="dispatch-map"><DispatchMap /></div>
        <div className="dispatch-telemetry">
          <div className="telemetry-card">
            <span className="telemetry-card__label">Speed</span>
            <span className="telemetry-card__value">{telemetry.speed}<span className="telemetry-card__unit">km/h</span></span>
          </div>
          <div className="telemetry-card">
            <span className="telemetry-card__label">ETA</span>
            <span className="telemetry-card__value">{telemetry.eta}<span className="telemetry-card__unit">min</span></span>
          </div>
          <div className="telemetry-card telemetry-card--online">
            <span className="telemetry-card__label">Fleet Online</span>
            <span className="telemetry-card__value">{telemetry.fleet}<span className="telemetry-card__unit">vehicles</span></span>
          </div>
        </div>
        <div className="dispatch-branding">
          <div className="dispatch-branding__icon">SF</div>
          <div>
            <div className="dispatch-branding__text">SMARTFLEET</div>
            <div className="dispatch-branding__sub">Hệ thống quản lý đội xe thông minh</div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-form-panel fp-panel">

        {/* Back link */}
        <button id="btn-back" type="button" className="fp-back" onClick={() => navigate('/login')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9 11.5L5 7.5L9 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Quay lại đăng nhập
        </button>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {/* ── STEP 1 ───────────────────────────── */}
        {step === 1 && (
          <div className="fp-card auth-form-enter" key={`s1-${formKey}`}>
            <div className="fp-card__head">
              <div className="fp-dot fp-dot--blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M2 9l10 6 10-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="fp-card__title">Quên mật khẩu?</h1>
              <p className="fp-card__sub">Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để xác minh.</p>
            </div>

            {error && <div className="fp-alert fp-alert--err"><span>!</span>{error}</div>}

            <form className="auth-form" onSubmit={handleSendOtp}>
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="fp-email">Địa chỉ Email</label>
                <input
                  id="fp-email" className="auth-field__input"
                  type="email" placeholder="example@gmail.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" autoFocus
                />
              </div>
              <button id="btn-send-otp" type="submit" className="auth-submit" disabled={loading || !email}>
                {loading ? <span className="auth-spinner" /> : 'Gửi mã OTP'}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2 ───────────────────────────── */}
        {step === 2 && (
          <div className="fp-card auth-form-enter" key={`s2-${formKey}`}>
            <div className="fp-card__head">
              <div className="fp-dot fp-dot--amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                </svg>
              </div>
              <h1 className="fp-card__title">Nhập mã OTP</h1>
              <p className="fp-card__sub">
                Mã 6 chữ số đã được gửi đến&nbsp;
                <strong className="fp-email-chip">{email}</strong>
              </p>
            </div>

            {/* Timer row */}
            <div className="fp-timer-row">
              <div className={`fp-timer ${canResend ? 'fp-timer--exp' : ''}`}>
                {canResend
                  ? <><span className="fp-timer__dot" />Mã đã hết hạn</>
                  : <><span className="fp-timer__dot" />Hết hạn sau <strong>{fmt(remaining)}</strong></>}
              </div>
              <button
                id="btn-resend" type="button" className="fp-resend"
                onClick={handleResend}
                disabled={!canResend || loading}
              >
                {loading ? '...' : 'Gửi lại'}
              </button>
            </div>

            {error && <div className="fp-alert fp-alert--err"><span>!</span>{error}</div>}

            <form className="auth-form" onSubmit={handleVerify}>
              <div className="auth-field" style={{ alignItems: 'center' }}>
                <OtpGrid value={otp} onChange={setOtp} disabled={loading} />
              </div>
              <button id="btn-verify" type="submit" className="auth-submit" disabled={loading || otp.length !== 6}>
                {loading ? <span className="auth-spinner" /> : 'Xác nhận OTP'}
              </button>
            </form>

            <button type="button" className="fp-link-btn" onClick={() => go(1)}>
              Dùng email khác?
            </button>
          </div>
        )}

        {/* ── STEP 3 ───────────────────────────── */}
        {step === 3 && (
          <div className="fp-card auth-form-enter" key={`s3-${formKey}`}>

            {/* Success overlay */}
            {done && (
              <div className="fp-success">
                <div className="fp-success__icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M7.5 12l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="fp-success__text">Mật khẩu đã cập nhật!<br/><span>Đang chuyển hướng…</span></p>
              </div>
            )}

            {!done && (
              <>
                <div className="fp-card__head">
                  <div className="fp-dot fp-dot--green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                    </svg>
                  </div>
                  <h1 className="fp-card__title">Mật khẩu mới</h1>
                  <p className="fp-card__sub">Tạo mật khẩu mạnh để bảo vệ tài khoản.</p>
                </div>

                {error && <div className="fp-alert fp-alert--err"><span>!</span>{error}</div>}

                <form className="auth-form" onSubmit={handleReset}>
                  <PwField
                    id="fp-pw" label="Mật khẩu mới"
                    value={newPw} onChange={(e) => setNewPw(e.target.value)}
                    show={showPw} onToggle={() => setShowPw((v) => !v)}
                    placeholder="Tối thiểu 6 ký tự"
                  />
                  <PwStrength value={newPw} />

                  <PwField
                    id="fp-confirm" label="Xác nhận mật khẩu"
                    value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                    show={showConfirm} onToggle={() => setShowConfirm((v) => !v)}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  {pwMismatch && <p className="fp-hint fp-hint--err">Mật khẩu không khớp</p>}
                  {pwMatch    && <p className="fp-hint fp-hint--ok">✓ Mật khẩu khớp</p>}

                  <button
                    id="btn-reset" type="submit"
                    className="auth-submit fp-submit--green"
                    disabled={loading || !newPw || !confirmPw || pwMismatch}
                  >
                    {loading ? <span className="auth-spinner" /> : 'Xác nhận đổi mật khẩu'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
