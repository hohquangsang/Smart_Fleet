import { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineShoppingBag, HiOutlineX } from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import '../../styles/admin.css';

const UsersPage = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const [showReasonInput, setShowReasonInput] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch real users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/admin/users');
        const userList = data?.data?.users || (Array.isArray(data?.data) ? data.data : []);
        setUsers(userList);
      } catch {
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.phone.includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  // Action: Confirm Block User with mandatory reason
  const handleConfirmBlock = async () => {
    if (!blockReason.trim()) {
      toast.warning('Vui lòng nhập lý do khóa tài khoản người dùng!', 'Cảnh báo');
      return;
    }

    setProcessing(true);
    const userObj = selectedUser;

    try {
      await api.patch(`/admin/users/${userObj.id}/block`, { reason: blockReason });
    } catch {
      // ignore in mock mode
    } finally {
      toast.error(`Đã khóa tài khoản người dùng ${userObj.name}. Lý do: ${blockReason}`, 'Khóa tài khoản');
      setUsers((prev) =>
        prev.map((u) => (u.id === userObj.id ? { ...u, status: 'BLOCKED' } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, status: 'BLOCKED' } : null));
      setShowReasonInput(false);
      setBlockReason('');
      setProcessing(false);
    }
  };

  // Action: Unblock User
  const handleUnblock = async (userObj) => {
    setProcessing(true);
    try {
      await api.patch(`/admin/users/${userObj.id}/unblock`);
    } catch {
      // ignore
    } finally {
      toast.success(`Đã mở khóa tài khoản người dùng ${userObj.name}`, 'Mở khóa');
      setUsers((prev) =>
        prev.map((u) => (u.id === userObj.id ? { ...u, status: 'ACTIVE' } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, status: 'ACTIVE' } : null));
      setProcessing(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header-bar">
        <div>
          <h1 className="admin-title">Quản Lý Người Dùng (Khách Hàng)</h1>
          <p className="admin-subtitle">
            Danh sách tài khoản khách hàng, lịch sử chi tiêu và quản lý quyền truy cập
          </p>
        </div>
      </div>

      {/* ─── THANH FILTER TRẠNG THÁI ─────────────────── */}
      <div className="admin-filter-bar">
        <div className="admin-chip-group">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, marginRight: 4 }}>
            Trạng thái:
          </span>
          <button
            type="button"
            className={`admin-filter-chip ${statusFilter === 'ALL' ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Tất cả ({users.length})
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${statusFilter === 'ACTIVE' ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Hoạt động ({users.filter((u) => u.status === 'ACTIVE').length})
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${statusFilter === 'BLOCKED' ? 'admin-filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('BLOCKED')}
          >
            Bị khóa ({users.filter((u) => u.status === 'BLOCKED').length})
          </button>
        </div>

        <div className="topbar__search" style={{ width: 280 }}>
          <HiOutlineSearch className="topbar__search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Tìm theo tên, SĐT, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ─── BẢNG DANH SÁCH NGƯỜI DÙNG ──────────────── */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Liên hệ (SĐT & Email)</th>
              <th>Số đơn đã đặt</th>
              <th>Tổng chi tiêu</th>
              <th>Trạng thái</th>
              <th>Ngày tham gia</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Không tìm thấy người dùng nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredUsers.map((userObj) => {
                const initials = userObj.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
                const isActive = userObj.status === 'ACTIVE';

                return (
                  <tr key={userObj.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar">{initials}</div>
                        <div className="admin-user-name">{userObj.name}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{userObj.phone}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{userObj.email}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {userObj.ordersCount} đơn
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {userObj.totalSpent.toLocaleString('vi-VN')} đ
                      </span>
                    </td>
                    <td>
                      {isActive ? (
                        <span className="badge-status badge-status--active">Hoạt động</span>
                      ) : (
                        <span className="badge-status badge-status--blocked">Bị khóa</span>
                      )}
                    </td>
                    <td>{userObj.createdAt}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setSelectedUser(userObj);
                          setShowReasonInput(false);
                          setBlockReason('');
                        }}
                      >
                        Xem hồ sơ
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── DRAWER CHI TIẾT NGƯỜI DÙNG ───────────────── */}
      {selectedUser && (
        <>
          <div className="admin-drawer-backdrop" onClick={() => setSelectedUser(null)} />
          <div className="admin-drawer">
            <div className="admin-drawer-header">
              <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                Hồ Sơ Người Dùng
              </h3>
              <button type="button" className="toast-card__close" onClick={() => setSelectedUser(null)}>
                &times;
              </button>
            </div>

            <div className="admin-drawer-body">
              {/* Head: Avatar & Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  className="admin-user-avatar"
                  style={{ width: 60, height: 60, fontSize: '1.3rem', border: '2px solid var(--accent-blue)' }}
                >
                  {selectedUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{selectedUser.name}</h2>
                  <div style={{ marginTop: 4 }}>
                    {selectedUser.status === 'ACTIVE' ? (
                      <span className="badge-status badge-status--active">Hoạt động</span>
                    ) : (
                      <span className="badge-status badge-status--blocked">Bị khóa</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ lưới 2 cột */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  padding: '1rem',
                  background: 'var(--bg-panel-sub)',
                  borderRadius: 10,
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SỐ ĐIỆN THOẠI</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedUser.phone}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EMAIL</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {selectedUser.email}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SỐ ĐƠN ĐÃ ĐẶT</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, marginTop: 2 }}>
                    {selectedUser.ordersCount} Đơn
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TỔNG CHI TIÊU</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)', marginTop: 2 }}>
                    {selectedUser.totalSpent.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* Danh sách Đơn hàng gần đây */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10 }}>
                  Đơn Hàng Gần Đây
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedUser.recentOrders.map((ord, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-panel-sub)',
                        borderRadius: 8,
                        border: '1px solid var(--border-primary)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <span className="order-code">{ord.code}</span>
                      <span className="badge-status badge-status--approved" style={{ fontSize: '0.7rem' }}>
                        {ord.status}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{ord.fare}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Khu vực Hành động cuối Drawer */}
            <div className="admin-drawer-footer">
              {selectedUser.status === 'ACTIVE' ? (
                <>
                  {!showReasonInput ? (
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ width: '100%', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                      onClick={() => setShowReasonInput(true)}
                    >
                      <HiOutlineLockClosed /> Khóa Tài Khoản Người Dùng
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontWeight: 600 }}>
                        Nhập lý do khóa tài khoản (bắt buộc):
                      </label>
                      <input
                        type="text"
                        className="location-input"
                        placeholder="VD: Vi phạm điều khoản thanh toán, bom hàng..."
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          className="btn btn--danger"
                          style={{ flex: 1, background: 'var(--accent-red)' }}
                          disabled={processing}
                          onClick={handleConfirmBlock}
                        >
                          Xác Nhận Khóa
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setShowReasonInput(false)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%', background: 'var(--accent-green)', color: '#FFF' }}
                  disabled={processing}
                  onClick={() => handleUnblock(selectedUser)}
                >
                  <HiOutlineLockOpen /> Mở Khóa Tài Khoản
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UsersPage;
