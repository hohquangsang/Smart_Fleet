import { useState, useEffect, useCallback } from 'react';
import { HiChevronLeft, HiChevronRight, HiCalendar, HiX } from 'react-icons/hi';
import { settingsApi } from '../../../services/settings.service';
import useToast from '../../../hooks/useToast';

const ACTION_META = {
  APPROVE_DRIVER: { label: 'Duyệt tài xế', icon: '✅', cls: 'audit-icon--approve' },
  REJECT_DRIVER: { label: 'Từ chối tài xế', icon: '❌', cls: 'audit-icon--block' },
  BLOCK_DRIVER: { label: 'Khóa tài xế', icon: '🔒', cls: 'audit-icon--block' },
  UNBLOCK_DRIVER: { label: 'Mở khóa tài xế', icon: '🔓', cls: 'audit-icon--approve' },
  RESOLVE_APPEAL: { label: 'Giải quyết khiếu nại', icon: '⚖️', cls: 'audit-icon--config' },
  BLOCK_USER: { label: 'Khóa người dùng', icon: '🔒', cls: 'audit-icon--block' },
  UNBLOCK_USER: { label: 'Mở khóa người dùng', icon: '🔓', cls: 'audit-icon--approve' },
  DISPATCH_ORDER: { label: 'Điều phối đơn hàng', icon: '🚀', cls: 'audit-icon--config' },
  CONFIRM_MATCH: { label: 'Xác nhận ghép đơn', icon: '🤝', cls: 'audit-icon--approve' },
  CANCEL_ORDER: { label: 'Hủy đơn hàng', icon: '🚫', cls: 'audit-icon--delete' },
  DELETE_ORDERS: { label: 'Xóa đơn hàng', icon: '🗑️', cls: 'audit-icon--delete' },
  UPDATE_SYSTEM_CONFIG: { label: 'Cập nhật cấu hình', icon: '⚙️', cls: 'audit-icon--config' },
  UPDATE_PROFILE: { label: 'Cập nhật hồ sơ', icon: '👤', cls: 'audit-icon--create' },
  UPDATE_AVATAR: { label: 'Cập nhật ảnh đại diện', icon: '🖼️', cls: 'audit-icon--create' },
  CHANGE_PASSWORD: { label: 'Đổi mật khẩu', icon: '🔑', cls: 'audit-icon--password' },
  CREATE_ADMIN: { label: 'Tạo tài khoản admin', icon: '➕', cls: 'audit-icon--create' },
  DELETE_ADMIN: { label: 'Xóa tài khoản admin', icon: '🗑️', cls: 'audit-icon--delete' },
  DISABLE_ADMIN: { label: 'Vô hiệu hóa admin', icon: '🚫', cls: 'audit-icon--block' },
  ENABLE_ADMIN: { label: 'Kích hoạt admin', icon: '✅', cls: 'audit-icon--approve' },
  ENABLE_MAINTENANCE: { label: 'Bật bảo trì hệ thống', icon: '🔧', cls: 'audit-icon--block' },
  DISABLE_MAINTENANCE: { label: 'Tắt bảo trì hệ thống', icon: '⚡', cls: 'audit-icon--approve' },
};

// ── Date helpers ──────────────────────────────────────────────────────────────
const toLocalISO = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const QUICK_PRESETS = [
  { id: 'today',     label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: '7days',     label: '7 ngày' },
  { id: '30days',    label: '30 ngày' },
  { id: 'custom',    label: 'Tùy chỉnh' },
];

const resolvePreset = (preset) => {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case '7days': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    case '30days': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    default:
      return { from: null, to: null };
  }
};

const formatRelativeTime = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Component ─────────────────────────────────────────────────────────────────
const AuditLogTab = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [actionFilter, setActionFilter] = useState('');
  const [preset, setPreset] = useState('');          // '' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'
  const [customFrom, setCustomFrom] = useState(''); // yyyy-MM-dd string
  const [customTo, setCustomTo] = useState('');     // yyyy-MM-dd string

  // Derive actual from/to dates to send to API
  const getDateRange = () => {
    if (!preset) return { from: null, to: null };
    if (preset === 'custom') {
      return {
        from: customFrom ? startOfDay(new Date(customFrom)) : null,
        to: customTo ? endOfDay(new Date(customTo)) : null,
      };
    }
    return resolvePreset(preset);
  };

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange();
      const params = { page, limit: 15 };
      if (actionFilter) params.action = actionFilter;
      if (from) params.from = from.toISOString();
      if (to) params.to = to.toISOString();
      const res = await settingsApi.getAuditLogs(params);
      const d = res.data.data;
      setLogs(d.logs);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    } catch {
      toast.error('Không thể tải nhật ký', 'Lỗi');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, preset, customFrom, customTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Reset page when any filter changes
  useEffect(() => { setPage(1); }, [actionFilter, preset, customFrom, customTo]);

  const handlePreset = (id) => {
    if (preset === id) {
      // toggle off
      setPreset('');
    } else {
      setPreset(id);
      if (id !== 'custom') {
        setCustomFrom('');
        setCustomTo('');
      }
    }
  };

  const clearAllFilters = () => {
    setActionFilter('');
    setPreset('');
    setCustomFrom('');
    setCustomTo('');
  };

  const hasActiveFilter = actionFilter || preset;

  const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="settings-card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="settings-card__title">📋 Nhật Ký Hoạt Động</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {hasActiveFilter && (
              <button
                id="audit-clear-filters"
                onClick={clearAllFilters}
                className="audit-filter-clear-btn"
              >
                <HiX style={{ fontSize: '0.8rem' }} />
                Xóa bộ lọc
              </button>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{total} bản ghi</span>
          </div>
        </div>
        <div className="settings-card__divider" />

        {/* ── Filter Area ── */}
        <div className="audit-filter-area">

          {/* Row 1: Quick date preset chips + action dropdown */}
          <div className="audit-filter-row">
            <div className="audit-date-presets">
              <HiCalendar className="audit-date-presets__icon" />
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.id}
                  id={`audit-preset-${p.id}`}
                  className={`audit-preset-chip ${preset === p.id ? 'audit-preset-chip--active' : ''}`}
                  onClick={() => handlePreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <select
              id="audit-action-filter"
              className="settings-input audit-action-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">Tất cả hành động</option>
              {Object.keys(ACTION_META).map((a) => (
                <option key={a} value={a}>{ACTION_META[a].label}</option>
              ))}
            </select>
          </div>

          {/* Row 2: Custom date inputs (only visible when preset === 'custom') */}
          {preset === 'custom' && (
            <div className="audit-custom-range">
              <div className="audit-custom-range__field">
                <label htmlFor="audit-date-from" className="audit-custom-range__label">
                  Từ ngày
                </label>
                <input
                  id="audit-date-from"
                  type="date"
                  className="settings-input audit-date-input"
                  value={customFrom}
                  max={customTo || toLocalISO(new Date())}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="audit-custom-range__separator">→</div>
              <div className="audit-custom-range__field">
                <label htmlFor="audit-date-to" className="audit-custom-range__label">
                  Đến ngày
                </label>
                <input
                  id="audit-date-to"
                  type="date"
                  className="settings-input audit-date-input"
                  value={customTo}
                  min={customFrom}
                  max={toLocalISO(new Date())}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Log List */}
        {loading ? (
          <div className="settings-loading"><div className="settings-spinner" /><span>Đang tải nhật ký...</span></div>
        ) : logs.length === 0 ? (
          <div className="settings-empty">
            <div className="settings-empty__icon">📋</div>
            <p>Không có nhật ký nào trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="audit-log-list">
            {logs.map((log) => {
              const meta = ACTION_META[log.action] || { label: log.action, icon: '•', cls: 'audit-icon--default' };
              const itemType = meta.cls.replace('audit-icon--', '');
              return (
                <div key={log.id} className={`audit-log-item audit-log-item--${itemType}`}>
                  <div className={`audit-log-item__icon ${meta.cls}`}>{meta.icon}</div>
                  <div className="audit-log-item__body">
                    <div className="audit-log-item__action">{meta.label}</div>
                    <div className="audit-log-item__meta">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--bg-hover)', border: '1px solid var(--border-primary)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {getInitials(log.admin?.fullName)}
                        </span>
                        {log.admin?.fullName || 'Admin'}
                        {log.targetType && log.targetId && log.targetId !== 'MAINTENANCE_MODE' && (
                          <span style={{ opacity: 0.6 }}>
                            · {log.targetType} #{log.targetId.length > 8 ? log.targetId.slice(-8).toUpperCase() : log.targetId}
                          </span>
                        )}
                        {log.details?.message && (
                          <span style={{ opacity: 0.75, fontStyle: 'italic' }}>
                            · "{log.details.message}"
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="audit-log-item__time">{formatRelativeTime(log.createdAt)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="settings-pagination">
            <span className="settings-pagination__info">
              Trang {page} / {totalPages}
            </span>
            <div className="settings-pagination__btns">
              <button
                id="audit-prev-btn"
                className="settings-pagination__btn"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <HiChevronLeft />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                return start + i;
              }).map((p) => (
                <button
                  key={p}
                  className="settings-pagination__btn"
                  style={p === page ? { background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', color: '#fff' } : {}}
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p}
                </button>
              ))}
              <button
                id="audit-next-btn"
                className="settings-pagination__btn"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <HiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogTab;
