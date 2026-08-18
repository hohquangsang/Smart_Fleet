import { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineShoppingBag, HiOutlineX } from 'react-icons/hi';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import '../../styles/admin.css';

import { useContext } from 'react';
import { SocketContext } from '../../contexts/SocketContext';

const UsersPage = () => {
  const toast = useToast();
  const socket = useContext(SocketContext);
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

  // Listen for real-time customer appeal socket event
  useEffect(() => {
    if (!socket) return;

    const handleUserAppealed = (data) => {
      toast.warning(`📢 Khách hàng ${data.userName} (${data.phoneNumber}) vừa gửi khiếu nại mở khóa tài khoản!`, 'Khiếu Nại Khách Hàng');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === data.userId
            ? { ...u, isAppealed: true, appealNote: data.appealNote, blockReason: data.blockReason || u.blockReason }
            : u
        )
      );
      setSelectedUser((prev) =>
        prev && prev.id === data.userId
          ? { ...prev, isAppealed: true, appealNote: data.appealNote, blockReason: data.blockReason || prev.blockReason }
          : prev
      );
    };

    socket.on('admin:user-appealed', handleUserAppealed);

    return () => {
      socket.off('admin:user-appealed', handleUserAppealed);
    };
  }, [socket, toast]);

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

        <div className="topbar__search" style={{ width: 300 }}>
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
              <th>Liên hệ</th>
              <th>Số đơn</th>
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
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={userObj.email}
                      >
                        {userObj.email}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {userObj.ordersCount} đơn
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {Number(userObj.totalSpent || 0).toLocaleString('vi-VN')} ₫
                      </span>
                    </td>
                    <td>
                      {isActive ? (
                        <span className="badge-status badge-status--active">Hoạt động</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="badge-status badge-status--blocked">Bị khóa</span>
                          {userObj.isAppealed && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: '#F5A623',
                                background: 'rgba(245, 166, 35, 0.15)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontWeight: 700,
                              }}
                            >
                              📢 Có khiếu nại mở khóa
                            </span>
                          )}
                        </div>
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

              {/* Callout lý do bị khóa & khiếu nại */}
              {selectedUser.status === 'BLOCKED' && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <strong style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>🔒 Lý do bị khóa:</strong>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    "{selectedUser.blockReason || 'Vi phạm điều khoản hệ thống'}"
                  </p>

                  {selectedUser.isAppealed && selectedUser.appealNote && (
                    <div
                      style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: '1px dashed rgba(245, 166, 35, 0.4)',
                        color: '#F5A623',
                      }}
                    >
                      <strong style={{ fontSize: '0.85rem' }}>📢 Nội dung khiếu nại mở khóa từ người dùng:</strong>
                      <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginTop: 4, fontSize: '0.9rem' }}>
                        "{selectedUser.appealNote}"
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                    {Number(selectedUser.totalSpent || 0).toLocaleString('vi-VN')} ₫
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
