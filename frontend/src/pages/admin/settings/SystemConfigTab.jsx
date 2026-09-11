import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineGlobe,
  HiOutlineBell,
  HiOutlineDocumentText,
  HiOutlineShieldExclamation,
  HiOutlineSave,
  HiOutlineChevronDown,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineInformationCircle,
} from 'react-icons/hi';
import useToast from '../../../hooks/useToast';
import { settingsApi } from '../../../services/settings.service';

/* ─── Notification channels (non-translatable keys) ─────────── */
const NOTIFY_CHANNELS = ['push', 'sms', 'email'];
const CHANNEL_LABELS = { push: '📲 Push', sms: '💬 SMS', email: '📧 Email' };

/* ─── Initial state ──────────────────────────────────────────── */
const NOTIFY_EVENT_KEYS = [
  'order_created',
  'driver_assigned',
  'order_completed',
  'order_cancelled',
  'driver_register',
  'payment_success',
  'system_alert',
];

const initialNotifyMatrix = Object.fromEntries(
  NOTIFY_EVENT_KEYS.map((key) => [key, { push: true, sms: false, email: true }])
);

const initialContent = {
  terms: 'Bằng cách sử dụng dịch vụ SmartFleet, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản và điều kiện sau đây...',
  privacy: 'Chúng tôi cam kết bảo vệ quyền riêng tư của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn...',
  faq: 'Q: Làm thế nào để đặt xe?\nA: Mở ứng dụng, chọn điểm đón và điểm đến, sau đó xác nhận đặt xe.\n\nQ: Làm thế nào để liên hệ hỗ trợ?\nA: Gọi hotline 1800-xxxx hoặc gửi email support@smartfleet.vn',
};

/* ════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════ */

/* ── Toggle Switch ───────────────────────────────── */
const Toggle = ({ checked, onChange, id }) => (
  <div className="syscfg-toggle-wrap">
    <label className="toggle-switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-switch__slider" />
    </label>
  </div>
);

/* ── Section Header ──────────────────────────────── */
const SectionHeader = ({ icon, label, desc, color, open, onToggle }) => (
  <button
    className="syscfg-section-header"
    onClick={onToggle}
    style={{ '--section-color': color }}
  >
    <span className="syscfg-section-header__icon" style={{ background: `${color}1a`, color }}>
      {icon}
    </span>
    <div className="syscfg-section-header__text">
      <span className="syscfg-section-header__label">{label}</span>
      {desc && <span className="syscfg-section-header__desc">{desc}</span>}
    </div>
    <HiOutlineChevronDown
      className="syscfg-section-header__chevron"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    />
  </button>
);

/* ── Save bar ────────────────────────────────────── */
const SaveBar = ({ onSave, saving, t }) => (
  <div className="syscfg-save-bar">
    <span className="syscfg-save-bar__hint">
      <HiOutlineInformationCircle /> {t('systemConfig.save_hint')}
    </span>
    <button
      id="syscfg-save-btn"
      className="settings-btn settings-btn--primary"
      onClick={onSave}
      disabled={saving}
    >
      {saving ? <div className="settings-spinner" /> : <HiOutlineSave />}
      {saving ? t('systemConfig.saving') : t('systemConfig.save_all')}
    </button>
  </div>
);

/* ════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════ */
const SystemConfigTab = () => {
  const { t, i18n } = useTranslation();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState({
    general: true, notifications: true, content: true, maintenance: true,
  });

  /* ── 1. General ── */
  const [general, setGeneral] = useState({
    currency: 'VND',
    language: i18n.language || 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
  });
  const [pendingLanguage, setPendingLanguage] = useState(i18n.language || 'vi');

  /* ── 2. Notification matrix ── */
  const [notifyMatrix, setNotifyMatrix] = useState(initialNotifyMatrix);

  /* ── 3. Static content ── */
  const [content, setContent] = useState(initialContent);
  const [editingContent, setEditingContent] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  /* ── 4. Maintenance ── */
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: 'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
  });
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintFetching, setMaintFetching] = useState(true);

  /* ── Fetch maintenance state on mount ── */
  useEffect(() => {
    settingsApi.getMaintenance()
      .then(({ data }) => {
        if (data?.data) {
          setMaintenance({
            enabled: !!data.data.enabled,
            message: data.data.message || 'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
          });
        }
      })
      .catch(() => { })
      .finally(() => setMaintFetching(false));
  }, []);

  /* ── Helpers ── */
  const toggle = (id) => setOpenSections((p) => ({ ...p, [id]: !p[id] }));

  /* ── Save general settings ── */
  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    if (pendingLanguage !== i18n.language) {
      i18n.changeLanguage(pendingLanguage);
      localStorage.setItem('admin_language', pendingLanguage);
      setGeneral((p) => ({ ...p, language: pendingLanguage }));
    }
    setSaving(false);
    toast.success(t('systemConfig.save_success_msg'), t('systemConfig.save_success_title'));
  };

  /* ── Maintenance toggle ── */
  const handleToggleMaintenance = async () => {
    setMaintLoading(true);
    const newEnabled = !maintenance.enabled;
    try {
      const { data } = await settingsApi.setMaintenance(newEnabled, maintenance.message);
      setMaintenance({ enabled: data.data.enabled, message: data.data.message });
      toast.success(
        newEnabled
          ? t('systemConfig.maintenance.enabled_toast')
          : t('systemConfig.maintenance.disabled_toast'),
        t('systemConfig.save_success_title')
      );
    } catch {
      toast.error(t('systemConfig.maintenance.error_toast'), t('common.error'));
    } finally {
      setMaintLoading(false);
    }
  };

  /* ── Save maintenance message (while active) ── */
  const handleSaveMessage = async () => {
    if (!maintenance.enabled) return;
    setMaintLoading(true);
    try {
      const { data } = await settingsApi.setMaintenance(true, maintenance.message);
      setMaintenance((p) => ({ ...p, message: data.data.message }));
      toast.success(t('systemConfig.maintenance.message_saved'), t('systemConfig.save_success_title'));
    } catch {
      toast.error(t('systemConfig.maintenance.error_toast'), t('common.error'));
    } finally {
      setMaintLoading(false);
    }
  };

  const startEditContent = (key) => {
    setEditingContent(key);
    setEditDraft(content[key]);
  };

  const saveContent = () => {
    setContent((p) => ({ ...p, [editingContent]: editDraft }));
    setEditingContent(null);
  };

  /* ── Derived translation for content types ── */
  const CONTENT_TYPES = [
    { key: 'terms', label: t('systemConfig.content.types.terms_label'), icon: '📜' },
    { key: 'privacy', label: t('systemConfig.content.types.privacy_label'), icon: '🔒' },
    { key: 'faq', label: t('systemConfig.content.types.faq_label'), icon: '❓' },
  ];

  /* ════════════════════════════════
     Render
     ════════════════════════════════ */
  return (
    <div className="syscfg-root">
      {/* ── Page heading ── */}
      <div className="syscfg-page-header">
        <div>
          <h2 className="syscfg-page-title">{t('systemConfig.page_title')}</h2>
          <p className="syscfg-page-sub">{t('systemConfig.page_sub')}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 1 — General Settings
         ══════════════════════════════════════════════ */}
      <div className="settings-card">
        <SectionHeader
          icon={<HiOutlineGlobe />}
          label={t('systemConfig.general.label')}
          desc={t('systemConfig.general.desc')}
          color="#3b82f6"
          open={openSections.general}
          onToggle={() => toggle('general')}
        />
        {openSections.general && (
          <>
            <div className="settings-card__divider" />
            <div className="syscfg-general-grid">
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="cfg-currency">
                  {t('systemConfig.general.currency_label')}
                </label>
                <select
                  id="cfg-currency"
                  className="settings-input"
                  value={general.currency}
                  onChange={(e) => setGeneral((p) => ({ ...p, currency: e.target.value }))}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="VND">VND — Việt Nam Đồng (₫)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                </select>
                <span className="settings-field__hint">{t('systemConfig.general.currency_hint')}</span>
              </div>

              <div className="settings-field">
                <label className="settings-field__label" htmlFor="cfg-language">
                  {t('systemConfig.general.language_label')}
                </label>
                <select
                  id="cfg-language"
                  className="settings-input"
                  value={pendingLanguage}
                  onChange={(e) => setPendingLanguage(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="vi">{t('systemConfig.general.lang_vi')}</option>
                  <option value="en">{t('systemConfig.general.lang_en')}</option>
                </select>
                <span className="settings-field__hint">{t('systemConfig.general.language_hint')}</span>
              </div>

              <div className="settings-field">
                <label className="settings-field__label" htmlFor="cfg-tz">
                  {t('systemConfig.general.timezone_label')}
                </label>
                <select
                  id="cfg-tz"
                  className="settings-input"
                  value={general.timezone}
                  onChange={(e) => setGeneral((p) => ({ ...p, timezone: e.target.value }))}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh — GMT+7</option>
                  <option value="Asia/Bangkok">Asia/Bangkok — GMT+7</option>
                  <option value="Asia/Singapore">Asia/Singapore — GMT+8</option>
                </select>
                <span className="settings-field__hint">{t('systemConfig.general.timezone_hint')}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 2 — Notification Config
         ══════════════════════════════════════════════ */}
      <div className="settings-card">
        <SectionHeader
          icon={<HiOutlineBell />}
          label={t('systemConfig.notifications.label')}
          desc={t('systemConfig.notifications.desc')}
          color="#f59e0b"
          open={openSections.notifications}
          onToggle={() => toggle('notifications')}
        />
        {openSections.notifications && (
          <>
            <div className="settings-card__divider" />
            <div className="syscfg-notify-table-wrap">
              <table className="syscfg-notify-table">
                <thead>
                  <tr>
                    <th className="syscfg-notify-table__event-col">{t('systemConfig.notifications.col_event')}</th>
                    {NOTIFY_CHANNELS.map((ch) => (
                      <th key={ch} className="syscfg-notify-table__ch-col">{CHANNEL_LABELS[ch]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NOTIFY_EVENT_KEYS.map((key) => (
                    <tr key={key} className="syscfg-notify-row">
                      <td className="syscfg-notify-table__event-cell">
                        <div className="syscfg-notify-event-label">
                          {t(`systemConfig.notifications.events.${key}_label`)}
                        </div>
                        <div className="syscfg-notify-event-desc">
                          {t(`systemConfig.notifications.events.${key}_desc`)}
                        </div>
                      </td>
                      {NOTIFY_CHANNELS.map((ch) => (
                        <td key={ch} className="syscfg-notify-table__ch-cell">
                          <Toggle
                            id={`notify-${key}-${ch}`}
                            checked={notifyMatrix[key]?.[ch] ?? false}
                            onChange={() =>
                              setNotifyMatrix((p) => ({
                                ...p,
                                [key]: { ...p[key], [ch]: !p[key][ch] },
                              }))
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 3 — Static Content Management
         ══════════════════════════════════════════════ */}
      <div className="settings-card">
        <SectionHeader
          icon={<HiOutlineDocumentText />}
          label={t('systemConfig.content.label')}
          desc={t('systemConfig.content.desc')}
          color="#10b981"
          open={openSections.content}
          onToggle={() => toggle('content')}
        />
        {openSections.content && (
          <>
            <div className="settings-card__divider" />
            <div className="syscfg-content-list">
              {CONTENT_TYPES.map(({ key, label, icon }) => (
                <div key={key} className="syscfg-content-item">
                  <div className="syscfg-content-item__header">
                    <span className="syscfg-content-item__icon">{icon}</span>
                    <span className="syscfg-content-item__label">{label}</span>
                    {editingContent !== key ? (
                      <button
                        className="settings-btn settings-btn--ghost settings-btn--sm"
                        onClick={() => startEditContent(key)}
                      >
                        <HiOutlinePencil /> {t('systemConfig.content.edit_btn')}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="settings-btn settings-btn--primary settings-btn--sm"
                          onClick={saveContent}
                        >
                          <HiOutlineCheck /> {t('systemConfig.content.save_btn')}
                        </button>
                        <button
                          className="settings-btn settings-btn--ghost settings-btn--sm"
                          onClick={() => setEditingContent(null)}
                        >
                          <HiOutlineX /> {t('systemConfig.content.cancel_btn')}
                        </button>
                      </div>
                    )}
                  </div>
                  {editingContent === key ? (
                    <textarea
                      className="syscfg-content-textarea"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={8}
                      autoFocus
                    />
                  ) : (
                    <div className="syscfg-content-preview">{content[key]}</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 4 — Bảo Trì Hệ Thống
         ══════════════════════════════════════════════ */}
      <div className="settings-card">
        <SectionHeader
          icon={<HiOutlineShieldExclamation />}
          label={t('systemConfig.maintenance.label')}
          desc={t('systemConfig.maintenance.desc')}
          color="#ef4444"
          open={openSections.maintenance}
          onToggle={() => toggle('maintenance')}
        />
        {openSections.maintenance && (
          <>
            <div className="settings-card__divider" />
            <div className="syscfg-maintenance-wrap">
              {maintFetching ? (
                <div className="syscfg-maintenance-loading">
                  <div className="settings-spinner" />
                  <span>{t('common.loading')}</span>
                </div>
              ) : (
                <>
                  {/* ── Status Banner ── */}
                  <div
                    className={`syscfg-maintenance-status ${maintenance.enabled
                      ? 'syscfg-maintenance-status--active'
                      : 'syscfg-maintenance-status--off'
                      }`}
                  >
                    <div className="syscfg-maintenance-status__left">
                      <span className="syscfg-maintenance-status__dot" />
                      <div>
                        <div className="syscfg-maintenance-status__title">
                          {maintenance.enabled
                            ? t('systemConfig.maintenance.status_active')
                            : t('systemConfig.maintenance.status_off')}
                        </div>
                        <div className="syscfg-maintenance-status__sub">
                          {maintenance.enabled
                            ? t('systemConfig.maintenance.status_active_sub')
                            : t('systemConfig.maintenance.status_off_sub')}
                        </div>
                      </div>
                    </div>
                    <div className="syscfg-maintenance-status__right">
                      <Toggle
                        id="maintenance-master-toggle"
                        checked={maintenance.enabled}
                        onChange={handleToggleMaintenance}
                      />
                      {maintLoading && (
                        <div className="settings-spinner settings-spinner--sm" />
                      )}
                    </div>
                  </div>

                  {/* ── Warning Alert ── */}
                  {maintenance.enabled && (
                    <div className="syscfg-maintenance-alert">
                      <span className="syscfg-maintenance-alert__icon">⚠️</span>
                      <span>{t('systemConfig.maintenance.warning_text')}</span>
                    </div>
                  )}

                  {/* ── Message Editor ── */}
                  <div className="syscfg-maintenance-msg-section">
                    <label className="settings-field__label" htmlFor="maint-msg">
                      {t('systemConfig.maintenance.message_label')}
                    </label>
                    <textarea
                      id="maint-msg"
                      className="syscfg-content-textarea"
                      value={maintenance.message}
                      onChange={(e) =>
                        setMaintenance((p) => ({ ...p, message: e.target.value }))
                      }
                      rows={3}
                      placeholder={t('systemConfig.maintenance.message_placeholder')}
                    />
                    <span className="settings-field__hint">
                      {t('systemConfig.maintenance.message_hint')}
                    </span>
                    {maintenance.enabled && (
                      <button
                        className="settings-btn settings-btn--primary settings-btn--sm"
                        onClick={handleSaveMessage}
                        disabled={maintLoading}
                        style={{ marginTop: 8, alignSelf: 'flex-start' }}
                      >
                        <HiOutlineCheck /> {t('systemConfig.maintenance.save_message_btn')}
                      </button>
                    )}
                  </div>

                  {/* ── Info Rows ── */}
                  <div className="syscfg-maintenance-info">
                    <div className="syscfg-maintenance-info__row">
                      <span className="syscfg-maintenance-info__icon">🧑‍💼</span>
                      <span>{t('systemConfig.maintenance.info_admin')}</span>
                    </div>
                    <div className="syscfg-maintenance-info__row">
                      <span className="syscfg-maintenance-info__icon">👥</span>
                      <span>{t('systemConfig.maintenance.info_users')}</span>
                    </div>
                    <div className="syscfg-maintenance-info__row">
                      <span className="syscfg-maintenance-info__icon">⚡</span>
                      <span>{t('systemConfig.maintenance.info_realtime')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Save Bar ── */}
      <SaveBar onSave={handleSave} saving={saving} t={t} />
    </div>
  );
};

export default SystemConfigTab;
