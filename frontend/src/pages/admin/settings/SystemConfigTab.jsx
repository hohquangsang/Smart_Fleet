import { useState, useEffect, useCallback } from 'react';
import { HiOutlineSave, HiOutlineRefresh } from 'react-icons/hi';
import { settingsApi } from '../../../services/settings.service';
import useToast from '../../../hooks/useToast';

const GROUP_META = {
  PRICING: {
    icon: '💰',
    label: 'Cấu Hình Giá Cước',
    desc: 'Điều chỉnh cước phí, phụ phí và hệ số tính giá',
  },
  MATCHING: {
    icon: '🤖',
    label: 'Cấu Hình Matching',
    desc: 'Thông số tìm kiếm và gán tài xế',
  },
  GENERAL: {
    icon: '⚙️',
    label: 'Cài Đặt Chung',
    desc: 'Thông tin hệ thống và chế độ vận hành',
  },
  NOTIFICATIONS: {
    icon: '🔔',
    label: 'Thông Báo',
    desc: 'Bật/tắt các loại thông báo trong hệ thống',
  },
};

const NOTIFICATION_DESCS = {
  NOTIFY_NEW_ORDER:   'Nhận thông báo khi có đơn hàng mới được tạo',
  NOTIFY_NEW_DRIVER:  'Nhận thông báo khi tài xế mới đăng ký chờ duyệt',
  DAILY_REPORT_EMAIL: 'Gửi báo cáo tổng kết qua email mỗi ngày',
  SYSTEM_ALERTS:      'Nhận cảnh báo khi có lỗi hoặc sự cố hệ thống',
};

const SystemConfigTab = () => {
  const toast = useToast();
  const [config, setConfig] = useState({});
  const [localValues, setLocalValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getConfig();
      const grouped = res.data.data.config;
      setConfig(grouped);
      // Flatten for local form state
      const flat = {};
      Object.values(grouped).forEach((items) => {
        items.forEach(({ key, value }) => { flat[key] = value; });
      });
      setLocalValues(flat);
    } catch {
      toast.error('Không thể tải cấu hình', 'Lỗi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleChange = (key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key) => {
    setLocalValues((prev) => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true',
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates = Object.entries(localValues).map(([key, value]) => ({ key, value }));
      await settingsApi.updateConfig(updates);
      toast.success('Cấu hình đã được lưu thành công', 'Thành công');
      await loadConfig();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lưu thất bại', 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="settings-spinner" />
        <span>Đang tải cấu hình...</span>
      </div>
    );
  }

  const maintenanceOn = localValues['MAINTENANCE_MODE'] === 'true';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {maintenanceOn && (
        <div className="maintenance-banner">
          ⚠️ Chế độ bảo trì đang BẬT — Người dùng không thể truy cập hệ thống
        </div>
      )}

      {Object.entries(config).map(([group, items]) => {
        const meta = GROUP_META[group] || { icon: '📌', label: group, desc: '' };
        const isNotify = group === 'NOTIFICATIONS';

        return (
          <div key={group} className="settings-card">
            <div>
              <div className="settings-card__title">
                <span>{meta.icon}</span>
                {meta.label}
              </div>
              {meta.desc && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {meta.desc}
                </p>
              )}
            </div>
            <div className="settings-card__divider" />

            {isNotify ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map(({ key, label }) => (
                  <div key={key} className="toggle-row">
                    <div className="toggle-row__info">
                      <div className="toggle-row__label">{label}</div>
                      <div className="toggle-row__desc">{NOTIFICATION_DESCS[key] || ''}</div>
                    </div>
                    <label className="toggle-switch" htmlFor={`toggle-${key}`}>
                      <input
                        id={`toggle-${key}`}
                        type="checkbox"
                        checked={localValues[key] === 'true'}
                        onChange={() => handleToggle(key)}
                      />
                      <span className="toggle-switch__slider" />
                    </label>
                  </div>
                ))}
              </div>
            ) : group === 'GENERAL' ? (
              <div className="settings-form">
                {items.map(({ key, label }) => {
                  if (key === 'MAINTENANCE_MODE') {
                    return (
                      <div key={key} className="toggle-row" style={{ background: maintenanceOn ? 'rgba(240,87,107,0.06)' : undefined }}>
                        <div className="toggle-row__info">
                          <div className="toggle-row__label">{label}</div>
                          <div className="toggle-row__desc">
                            Khi bật, toàn bộ hệ thống sẽ ở trạng thái bảo trì
                          </div>
                        </div>
                        <label className="toggle-switch" htmlFor={`toggle-${key}`}>
                          <input
                            id={`toggle-${key}`}
                            type="checkbox"
                            checked={localValues[key] === 'true'}
                            onChange={() => handleToggle(key)}
                          />
                          <span className="toggle-switch__slider" style={
                            localValues[key] === 'true'
                              ? { background: 'rgba(240,87,107,0.2)', borderColor: 'var(--accent-red)' }
                              : {}
                          } />
                        </label>
                      </div>
                    );
                  }
                  if (key === 'TIMEZONE') {
                    return (
                      <div key={key} className="settings-field">
                        <label className="settings-field__label">{label}</label>
                        <select
                          id={`config-${key}`}
                          className="settings-input"
                          value={localValues[key] || ''}
                          onChange={(e) => handleChange(key, e.target.value)}
                          style={{ cursor: 'pointer' }}
                        >
                          <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                          <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="settings-field">
                      <label className="settings-field__label">{label}</label>
                      <input
                        id={`config-${key}`}
                        className="settings-input"
                        value={localValues[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="config-grid">
                {items.map(({ key, label }) => (
                  <div key={key} className="settings-field">
                    <label className="settings-field__label" htmlFor={`config-${key}`}>{label}</label>
                    <input
                      id={`config-${key}`}
                      className="settings-input"
                      type="number"
                      step="any"
                      value={localValues[key] ?? ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Sticky Save Bar */}
      <div style={{
        position: 'sticky',
        bottom: '1rem',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        padding: '14px 18px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        backdropFilter: 'blur(8px)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <button id="config-reset-btn" className="settings-btn settings-btn--ghost" onClick={loadConfig} disabled={saving}>
          <HiOutlineRefresh /> Đặt lại
        </button>
        <button id="config-save-btn" className="settings-btn settings-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? <div className="settings-spinner" /> : <HiOutlineSave />}
          {saving ? 'Đang lưu...' : 'Lưu tất cả cấu hình'}
        </button>
      </div>
    </div>
  );
};

export default SystemConfigTab;
