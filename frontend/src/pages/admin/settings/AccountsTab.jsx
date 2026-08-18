import { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineBan, HiOutlineCheck, HiX } from 'react-icons/hi';
import { settingsApi } from '../../../services/settings.service';
import useToast from '../../../hooks/useToast';
import useAuth from '../../../hooks/useAuth';

const AccountsTab = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [newAdmin, setNewAdmin] = useState({ email: '', fullName: '', password: '' });
  const [creating, setCreating] = useState(false);

  const loadAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getAdmins();
      setAdmins(res.data.data.admins);
    } catch {
      toast.error('Không thể tải danh sách admin', 'Lỗi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.fullName || !newAdmin.password) {
      return toast.error('Vui lòng điền đầy đủ thông tin');
    }
    try {
      setCreating(true);
      await settingsApi.createAdmin(newAdmin);
      toast.success('Tạo tài khoản admin thành công', 'Thành công');
      setShowModal(false);
      setNewAdmin({ email: '', fullName: '', password: '' });
      loadAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Tạo thất bại', 'Lỗi');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id, isBlocked) => {
    if (id === user?.id) return toast.error('Không thể thay đổi trạng thái của chính mình', 'Lỗi');
    try {
      setActionLoading(id + '_toggle');
      await settingsApi.toggleAdmin(id);
      toast.success(isBlocked ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản', 'Thành công');
      loadAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Thao tác thất bại', 'Lỗi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (id === user?.id) return toast.error('Không thể xóa chính mình', 'Lỗi');
    if (!window.confirm(`Bạn chắc chắn muốn xóa admin "${name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      setActionLoading(id + '_delete');
      await settingsApi.deleteAdmin(id);
      toast.success('Đã xóa tài khoản admin', 'Thành công');
      loadAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Xóa thất bại', 'Lỗi');
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="settings-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="settings-card__title">👥 Danh Sách Admin ({admins.length})</div>
          <button id="settings-add-admin-btn" className="settings-btn settings-btn--primary settings-btn--sm" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Thêm Admin
          </button>
        </div>
        <div className="settings-card__divider" />

        {loading ? (
          <div className="settings-loading"><div className="settings-spinner" /><span>Đang tải...</span></div>
        ) : admins.length === 0 ? (
          <div className="settings-empty">
            <div className="settings-empty__icon">👤</div>
            <p>Chưa có tài khoản admin nào</p>
          </div>
        ) : (
          <div className="settings-admin-table-wrap">
            <table className="admin-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const isSelf = admin.id === user?.id;
                  const isToggling = actionLoading === admin.id + '_toggle';
                  const isDeleting = actionLoading === admin.id + '_delete';
                  return (
                    <tr key={admin.id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-user-avatar" style={{
                            background: isSelf ? 'rgba(59,130,246,0.2)' : undefined,
                            borderColor: isSelf ? 'var(--accent-blue)' : undefined,
                          }}>
                            {getInitials(admin.fullName)}
                          </div>
                          <div>
                            <div className="admin-user-name">
                              {admin.fullName}
                              {isSelf && (
                                <span style={{ marginLeft: 6, fontSize: '0.65rem', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                  BẠN
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{admin.email}</td>
                      <td>
                        <span className={`badge-status ${admin.isBlocked ? 'badge-status--blocked' : 'badge-status--active'}`}>
                          {admin.isBlocked ? 'Vô hiệu' : 'Hoạt động'}
                        </span>
                      </td>
                      <td>{new Date(admin.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {!isSelf && (
                            <>
                              <button
                                id={`admin-toggle-${admin.id}`}
                                className={`settings-btn settings-btn--sm ${admin.isBlocked ? 'settings-btn--ghost' : 'settings-btn--danger'}`}
                                onClick={() => handleToggle(admin.id, admin.isBlocked)}
                                disabled={isToggling}
                                title={admin.isBlocked ? 'Kích hoạt' : 'Vô hiệu hóa'}
                              >
                                {isToggling ? <div className="settings-spinner" style={{ width: 12, height: 12 }} /> : admin.isBlocked ? <HiOutlineCheck /> : <HiOutlineBan />}
                                {admin.isBlocked ? 'Kích hoạt' : 'Tắt'}
                              </button>
                              <button
                                id={`admin-delete-${admin.id}`}
                                className="settings-btn settings-btn--danger settings-btn--sm"
                                onClick={() => handleDelete(admin.id, admin.fullName)}
                                disabled={isDeleting}
                                title="Xóa tài khoản"
                              >
                                {isDeleting ? <div className="settings-spinner" style={{ width: 12, height: 12 }} /> : <HiOutlineTrash />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="settings-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="settings-modal">
            <div className="settings-modal__header">
              <h3 className="settings-modal__title">➕ Tạo Tài Khoản Admin</h3>
              <button className="settings-modal__close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form className="settings-form" onSubmit={handleCreate}>
              <div className="settings-field">
                <label className="settings-field__label">Họ và tên</label>
                <input
                  id="new-admin-name"
                  className="settings-input"
                  value={newAdmin.fullName}
                  onChange={(e) => setNewAdmin((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Nhập họ và tên"
                  autoFocus
                />
              </div>
              <div className="settings-field">
                <label className="settings-field__label">Email</label>
                <input
                  id="new-admin-email"
                  className="settings-input"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@smartfleet.vn"
                />
              </div>
              <div className="settings-field">
                <label className="settings-field__label">Mật khẩu tạm thời</label>
                <input
                  id="new-admin-password"
                  className="settings-input"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Tối thiểu 8 ký tự"
                />
                <span className="settings-field__hint">Admin sẽ cần đổi mật khẩu sau lần đăng nhập đầu tiên</span>
              </div>
            </form>
            <div className="settings-modal__footer">
              <button className="settings-btn settings-btn--ghost" onClick={() => setShowModal(false)}>Hủy</button>
              <button id="confirm-create-admin-btn" className="settings-btn settings-btn--primary" onClick={handleCreate} disabled={creating}>
                {creating ? <div className="settings-spinner" /> : <HiOutlinePlus />}
                {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsTab;
