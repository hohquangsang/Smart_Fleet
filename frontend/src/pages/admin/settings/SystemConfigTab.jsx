import { useState } from 'react';
import {
  HiOutlineGlobe,
  HiOutlineBell,
  HiOutlineDocumentText,
  HiOutlineDeviceMobile,
  HiOutlineSave,
  HiOutlineChevronDown,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineExclamation,
  HiOutlineInformationCircle,
  HiOutlinePlus,
  HiOutlineTrash,
} from 'react-icons/hi';
import useToast from '../../../hooks/useToast';

/* ─── Section ids ─────────────────────────────────── */
const SECTIONS = [
  { id: 'general',       label: 'Cài Đặt Chung',         icon: <HiOutlineGlobe />,        color: '#3b82f6' },
  { id: 'notifications', label: 'Cấu Hình Thông Báo',    icon: <HiOutlineBell />,         color: '#f59e0b' },
  { id: 'content',       label: 'Quản Lý Nội Dung Tĩnh', icon: <HiOutlineDocumentText />, color: '#10b981' },
  { id: 'appversion',    label: 'Quản Lý Phiên Bản App', icon: <HiOutlineDeviceMobile />, color: '#8b5cf6' },
];

/* ─── Notification events ────────────────────────── */
const NOTIFY_EVENTS = [
  { key: 'order_created',   label: 'Đơn hàng mới',           desc: 'Khi khách hàng tạo đơn hàng mới' },
  { key: 'driver_assigned', label: 'Gán tài xế',             desc: 'Khi tài xế được gán vào đơn hàng' },
  { key: 'order_completed', label: 'Đơn hoàn thành',         desc: 'Khi đơn hàng được giao thành công' },
  { key: 'order_cancelled', label: 'Đơn bị hủy',             desc: 'Khi đơn hàng bị hủy bởi khách hoặc hệ thống' },
  { key: 'driver_register', label: 'Tài xế đăng ký mới',    desc: 'Khi tài xế nộp hồ sơ chờ phê duyệt' },
  { key: 'payment_success', label: 'Thanh toán thành công',  desc: 'Khi giao dịch thanh toán được xác nhận' },
  { key: 'system_alert',    label: 'Cảnh báo hệ thống',      desc: 'Sự cố, lỗi nghiêm trọng từ hệ thống' },
];

const NOTIFY_CHANNELS = ['push', 'sms', 'email'];
const CHANNEL_LABELS = { push: '📲 Push', sms: '💬 SMS', email: '📧 Email' };

/* ─── Static content types ───────────────────────── */
const CONTENT_TYPES = [
  { key: 'terms',    label: 'Điều Khoản Sử Dụng',  icon: '📜' },
  { key: 'privacy',  label: 'Chính Sách Bảo Mật',   icon: '🔒' },
  { key: 'faq',      label: 'Câu Hỏi Thường Gặp',   icon: '❓' },
];

/* ─── Initial state ──────────────────────────────── */
const initialNotifyMatrix = Object.fromEntries(
  NOTIFY_EVENTS.map(({ key }) => [
    key,
    { push: true, sms: false, email: true },
  ])
);

const initialContent = {
  terms:   'Bằng cách sử dụng dịch vụ SmartFleet, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản và điều kiện sau đây...',
  privacy: 'Chúng tôi cam kết bảo vệ quyền riêng tư của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn...',
  faq:     'Q: Làm thế nào để đặt xe?\nA: Mở ứng dụng, chọn điểm đón và điểm đến, sau đó xác nhận đặt xe.\n\nQ: Làm thế nào để liên hệ hỗ trợ?\nA: Gọi hotline 1800-xxxx hoặc gửi email support@smartfleet.vn',
};

const initialVersions = [
  { id: 1, platform: 'iOS',     version: '2.4.1', minVersion: '2.0.0', forceUpdate: false, maintenance: false, note: 'Cải thiện hiệu suất tìm tài xế' },
  { id: 2, platform: 'Android', version: '2.4.1', minVersion: '2.1.0', forceUpdate: true,  maintenance: false, note: 'Bắt buộc cập nhật: Vá lỗi bảo mật nghiêm trọng' },
];

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
const SaveBar = ({ onSave, saving }) => (
  <div className="syscfg-save-bar">
    <span className="syscfg-save-bar__hint">
      <HiOutlineInformationCircle /> Thay đổi chưa được lưu sẽ bị mất khi rời trang
    </span>
    <button
      id="syscfg-save-btn"
      className="settings-btn settings-btn--primary"
      onClick={onSave}
      disabled={saving}
    >
      {saving ? <div className="settings-spinner" /> : <HiOutlineSave />}
      {saving ? 'Đang lưu...' : 'Lưu tất cả'}
    </button>
  </div>
);

/* ════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════ */
const SystemConfigTab = () => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState({ general: true, notifications: true, content: true, appversion: true });

  /* ── 1. General ── */
  const [general, setGeneral] = useState({
    currency: 'VND',
    language: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
  });

  /* ── 2. Notification matrix ── */
  const [notifyMatrix, setNotifyMatrix] = useState(initialNotifyMatrix);

  /* ── 3. Static content ── */
  const [content, setContent] = useState(initialContent);
  const [editingContent, setEditingContent] = useState(null); // key or null
  const [editDraft, setEditDraft] = useState('');

  /* ── 4. App versions ── */
  const [versions, setVersions] = useState(initialVersions);

  /* ── Helpers ── */
  const toggle = (id) => setOpenSections((p) => ({ ...p, [id]: !p[id] }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success('Đã lưu tất cả cấu hình hệ thống', 'Thành công');
  };

  const startEditContent = (key) => {
    setEditingContent(key);
    setEditDraft(content[key]);
  };

  const saveContent = () => {
    setContent((p) => ({ ...p, [editingContent]: editDraft }));
    setEditingContent(null);
  };

  const toggleVersionField = (id, field) => {
    setVersions((p) =>
      p.map((v) => (v.id === id ? { ...v, [field]: !v[field] } : v))
    );
  };

  const updateVersion = (id, field, value) => {
    setVersions((p) =>
      p.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const addVersion = () => {
    setVersions((p) => [
      ...p,
      {
        id: Date.now(),
        platform: 'iOS',
        version: '',
        minVersion: '',
        forceUpdate: false,
        maintenance: false,
        note: '',
      },
    ]);
  };

  const removeVersion = (id) => setVersions((p) => p.filter((v) => v.id !== id));

  /* ════════════════════════════════
     Render
     ════════════════════════════════ */
  return (
    <div className="syscfg-root">
      {/* ── Page heading ── */}
      <div className="syscfg-page-header">
        <div>
          <h2 className="syscfg-page-title">Quản Trị Hệ Thống</h2>
          <p className="syscfg-page-sub">Cấu hình hệ thống, thông báo, nội dung và phiên bản ứng dụng</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 1 — Cài Đặt Chung
         ══════════════════════════════════════════════ */}
      <div className="settings-card">
        <SectionHeader
          icon={<HiOutlineGlobe />}
          label="Cài Đặt Chung"
          desc="Đơn vị tiền tệ, ngôn ngữ và múi giờ mặc định"
          color="#3b82f6"
          open={openSections.general}
          onToggle={() => toggle('general')}
        />

        {openSections.general && (
          <>
            <div className="settings-card__divider" />
            <div className="syscfg-general-grid">
              {/* Currency */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="cfg-currency">
                  💰 Đơn Vị Tiền Tệ
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
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="THB">THB — Thai Baht (฿)</option>
                </select>
                <span className="settings-field__hint">Áp dụng cho toàn bộ báo cáo và hiển thị giá</span>
              </div>

              {/* Language */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="cfg-language">
                  🌐 Ngôn Ngữ Hệ Thống
                </label>
                <select
                  id="cfg-language"
                  className="settings-input"
                  value={general.language}
                  onChange={(e) => setGeneral((p) => ({ ...p, language: e.target.value }))}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                  <option value="th">ภาษาไทย</option>
                </select>
                <span className="settings-field__hint">Ngôn ngữ mặc định của giao diện admin</span>
              </div>

              {/* Timezone */}
              <div className="settings-field">
                <label className="settings-field__label" htmlFor="cfg-tz">
                  🕐 Múi Giờ
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
                  <option value="UTC">UTC — GMT+0</option>
                </select>
                <span className="settings-field__hint">Dùng để tính toán thời gian đơn hàng, báo cáo</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 2 — Cấu Hình Thông Báo
         ══════════════════════════════════════════════ */}
      <div className="settings-card">
        <SectionHeader
          icon={<HiOutlineBell />}
          label="Cấu Hình Thông Báo"
          desc="Bật/tắt kênh Push / SMS / Email theo từng sự kiện"
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
                    <th className="syscfg-notify-table__event-col">Sự Kiện</th>
                    {NOTIFY_CHANNELS.map((ch) => (
                      <th key={ch} className="syscfg-notify-table__ch-col">
                        {CHANNEL_LABELS[ch]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NOTIFY_EVENTS.map(({ key, label, desc }) => (
                    <tr key={key} className="syscfg-notify-row">
                      <td className="syscfg-notify-table__event-cell">
                        <div className="syscfg-notify-event-label">{label}</div>
                        <div className="syscfg-notify-event-desc">{desc}</div>
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
          SECTION 3 — Quản Lý Nội Dung Tĩnh
         ══════════════════════════════════════════════ */}
      <div className="settings-card">
        <SectionHeader
          icon={<HiOutlineDocumentText />}
          label="Quản Lý Nội Dung Tĩnh"
          desc="Điều khoản, chính sách bảo mật và câu hỏi thường gặp"
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
                        <HiOutlinePencil /> Chỉnh sửa
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="settings-btn settings-btn--primary settings-btn--sm"
                          onClick={saveContent}
                        >
                          <HiOutlineCheck /> Lưu
                        </button>
                        <button
                          className="settings-btn settings-btn--ghost settings-btn--sm"
                          onClick={() => setEditingContent(null)}
                        >
                          <HiOutlineX /> Hủy
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
                    <div className="syscfg-content-preview">
                      {content[key]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 4 — Quản Lý Phiên Bản App
         ══════════════════════════════════════════════ */}
      <div className="settings-card">
        <SectionHeader
          icon={<HiOutlineDeviceMobile />}
          label="Quản Lý Phiên Bản App"
          desc="Kiểm soát buộc cập nhật và thông báo bảo trì"
          color="#8b5cf6"
          open={openSections.appversion}
          onToggle={() => toggle('appversion')}
        />

        {openSections.appversion && (
          <>
            <div className="settings-card__divider" />
            <div className="syscfg-version-list">
              {versions.map((v) => (
                <div key={v.id} className={`syscfg-version-card ${v.maintenance ? 'syscfg-version-card--maintenance' : ''} ${v.forceUpdate ? 'syscfg-version-card--force' : ''}`}>
                  {/* Platform Badge + controls */}
                  <div className="syscfg-version-card__top">
                    <span className={`syscfg-platform-badge syscfg-platform-badge--${v.platform.toLowerCase()}`}>
                      {v.platform === 'iOS' ? '🍎' : '🤖'} {v.platform}
                    </span>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                      {v.forceUpdate && (
                        <span className="syscfg-status-chip syscfg-status-chip--danger">
                          <HiOutlineExclamation /> Buộc cập nhật
                        </span>
                      )}
                      {v.maintenance && (
                        <span className="syscfg-status-chip syscfg-status-chip--warning">
                          🔧 Bảo trì
                        </span>
                      )}
                    </div>
                    <button
                      className="settings-btn settings-btn--danger settings-btn--sm"
                      onClick={() => removeVersion(v.id)}
                      title="Xóa"
                    >
                      <HiOutlineTrash />
                    </button>
                  </div>

                  <div className="syscfg-version-fields">
                    <div className="settings-field">
                      <label className="settings-field__label">Phiên bản hiện tại</label>
                      <input
                        className="settings-input"
                        value={v.version}
                        onChange={(e) => updateVersion(v.id, 'version', e.target.value)}
                        placeholder="2.4.1"
                      />
                    </div>
                    <div className="settings-field">
                      <label className="settings-field__label">Phiên bản tối thiểu</label>
                      <input
                        className="settings-input"
                        value={v.minVersion}
                        onChange={(e) => updateVersion(v.id, 'minVersion', e.target.value)}
                        placeholder="2.0.0"
                      />
                    </div>
                    <div className="settings-field" style={{ gridColumn: '1 / -1' }}>
                      <label className="settings-field__label">Ghi chú / Thông báo bảo trì</label>
                      <input
                        className="settings-input"
                        value={v.note}
                        onChange={(e) => updateVersion(v.id, 'note', e.target.value)}
                        placeholder="Mô tả nội dung cập nhật hoặc thông báo bảo trì..."
                      />
                    </div>
                  </div>

                  <div className="syscfg-version-toggles">
                    <div className="toggle-row">
                      <div className="toggle-row__info">
                        <div className="toggle-row__label">🔴 Buộc cập nhật</div>
                        <div className="toggle-row__desc">Người dùng phải cập nhật mới dùng được ứng dụng</div>
                      </div>
                      <Toggle
                        id={`force-${v.id}`}
                        checked={v.forceUpdate}
                        onChange={() => toggleVersionField(v.id, 'forceUpdate')}
                      />
                    </div>
                    <div className="toggle-row">
                      <div className="toggle-row__info">
                        <div className="toggle-row__label">🔧 Chế độ bảo trì</div>
                        <div className="toggle-row__desc">Hiển thị trang thông báo bảo trì trên ứng dụng</div>
                      </div>
                      <Toggle
                        id={`maint-${v.id}`}
                        checked={v.maintenance}
                        onChange={() => toggleVersionField(v.id, 'maintenance')}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                id="syscfg-add-version-btn"
                className="syscfg-add-version-btn"
                onClick={addVersion}
              >
                <HiOutlinePlus /> Thêm nền tảng
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Save Bar ── */}
      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
};

export default SystemConfigTab;
