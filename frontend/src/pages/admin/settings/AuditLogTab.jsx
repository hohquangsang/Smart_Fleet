import { useState, useEffect, useCallback } from 'react';
import { HiOutlineSearch, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { settingsApi } from '../../../services/settings.service';
import useToast from '../../../hooks/useToast';

const ACTION_META = {
  APPROVE_DRIVER:       { label: 'Duyệt tài xế',          icon: '✅', cls: 'audit-icon--approve' },
  REJECT_DRIVER:        { label: 'Từ chối tài xế',         icon: '❌', cls: 'audit-icon--block' },
  BLOCK_DRIVER:         { label: 'Khóa tài xế',            icon: '🔒', cls: 'audit-icon--block' },
  UNBLOCK_DRIVER:       { label: 'Mở khóa tài xế',         icon: '🔓', cls: 'audit-icon--approve' },
  RESOLVE_APPEAL:       { label: 'Giải quyết khiếu nại',   icon: '⚖️', cls: 'audit-icon--config' },
  BLOCK_USER:           { label: 'Khóa người dùng',        icon: '🔒', cls: 'audit-icon--block' },
  UNBLOCK_USER:         { label: 'Mở khóa người dùng',     icon: '🔓', cls: 'audit-icon--approve' },
  DISPATCH_ORDER:       { label: 'Điều phối đơn hàng',     icon: '🚀', cls: 'audit-icon--config' },
  CONFIRM_MATCH:        { label: 'Xác nhận ghép đơn',      icon: '🤝', cls: 'audit-icon--approve' },
  CANCEL_ORDER:         { label: 'Hủy đơn hàng',           icon: '🚫', cls: 'audit-icon--delete' },
  DELETE_ORDERS:        { label: 'Xóa đơn hàng',           icon: '🗑️', cls: 'audit-icon--delete' },
  UPDATE_SYSTEM_CONFIG: { label: 'Cập nhật cấu hình',      icon: '⚙️', cls: 'audit-icon--config' },
  UPDATE_PROFILE:       { label: 'Cập nhật hồ sơ',         icon: '👤', cls: 'audit-icon--create' },
  UPDATE_AVATAR:        { label: 'Cập nhật ảnh đại diện',  icon: '🖼️', cls: 'audit-icon--create' },
  CHANGE_PASSWORD:      { label: 'Đổi mật khẩu',           icon: '🔑', cls: 'audit-icon--password' },
  CREATE_ADMIN:         { label: 'Tạo tài khoản admin',    icon: '➕', cls: 'audit-icon--create' },
  DELETE_ADMIN:         { label: 'Xóa tài khoản admin',    icon: '🗑️', cls: 'audit-icon--delete' },
  DISABLE_ADMIN:        { label: 'Vô hiệu hóa admin',      icon: '🚫', cls: 'audit-icon--block' },
  ENABLE_ADMIN:         { label: 'Kích hoạt admin',        icon: '✅', cls: 'audit-icon--approve' },
};

const formatRelativeTime = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AuditLogTab = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (actionFilter) params.action = actionFilter;
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
  }, [page, actionFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [actionFilter]);

  const filteredLogs = search.trim()
    ? logs.filter((l) =>
        l.admin?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="settings-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="settings-card__title">📋 Nhật Ký Hoạt Động</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{total} bản ghi</span>
        </div>
        <div className="settings-card__divider" />

        {/* Filter Bar */}
        <div className="settings-filter-bar">
          <div className="settings-search-wrap">
            <HiOutlineSearch className="settings-search-icon" />
            <input
              id="audit-search"
              className="settings-search-input"
              style={{ width: '100%' }}
              placeholder="Tìm theo admin hoặc hành động..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            id="audit-action-filter"
            className="settings-input"
            style={{ width: 'auto', minWidth: 180 }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Tất cả hành động</option>
            {Object.keys(ACTION_META).map((a) => (
              <option key={a} value={a}>{ACTION_META[a].label}</option>
            ))}
          </select>
        </div>

        {/* Log List */}
        {loading ? (
          <div className="settings-loading"><div className="settings-spinner" /><span>Đang tải nhật ký...</span></div>
        ) : filteredLogs.length === 0 ? (
          <div className="settings-empty">
            <div className="settings-empty__icon">📋</div>
            <p>Chưa có nhật ký nào</p>
          </div>
        ) : (
          <div className="audit-log-list">
            {filteredLogs.map((log) => {
              const meta = ACTION_META[log.action] || { label: log.action, icon: '•', cls: 'audit-icon--default' };
              return (
                <div key={log.id} className="audit-log-item">
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
                        {log.targetType && log.targetId && (
                          <span style={{ opacity: 0.6 }}>
                            · {log.targetType} #{log.targetId.slice(-8).toUpperCase()}
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
