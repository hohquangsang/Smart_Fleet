import { NavLink } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineUserGroup, HiOutlineShoppingCart, HiOutlineMap, HiOutlineDocumentText, HiOutlineTruck, HiOutlineChartBar, HiOutlineLogout, HiOutlineUser } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import '../../styles/sidebar.css';

const adminNavGroups = [
  {
    groupTitle: null,
    items: [
      { path: '/admin', label: 'Tổng quan', icon: <HiOutlineViewGrid /> },
    ],
  },
  {
    groupTitle: 'QUẢN LÝ',
    items: [
      { path: '/admin/orders', label: 'Đơn hàng', icon: <HiOutlineShoppingCart />, badge: null },
      { path: '/admin/drivers', label: 'Tài xế', icon: <HiOutlineUsers />, badge: null },
      { path: '/admin/users', label: 'Người dùng', icon: <HiOutlineUserGroup /> },
    ],
  },
];

const customerNavItems = [
  { path: '/customer', label: 'Đặt đơn & Tính cước', icon: <HiOutlineShoppingCart /> },
  { path: '/customer/tracking', label: 'Theo dõi Real-time', icon: <HiOutlineMap /> },
  { path: '/customer/history', label: 'Lịch sử & Hóa đơn', icon: <HiOutlineDocumentText /> },
  { path: '/customer/profile', label: 'Thông tin cá nhân', icon: <HiOutlineUser /> },
];

const driverNavItems = [
  { path: '/driver', label: 'Tổng quan & Trạng thái', icon: <HiOutlineViewGrid /> },
  { path: '/driver/dispatch', label: 'Nhận đơn Real-time', icon: <HiOutlineTruck /> },
  { path: '/driver/active', label: 'Chuyến xe hiện tại', icon: <HiOutlineMap /> },
  { path: '/driver/earnings', label: 'Thu nhập & Hiệu suất', icon: <HiOutlineChartBar /> },
  { path: '/driver/profile', label: 'Thông tin cá nhân', icon: <HiOutlineUser /> },
];

const Sidebar = () => {
  const { user, logout, isAdmin, isDriver } = useAuth();

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">SF</div>
        <div className="sidebar__logo-text">
          Smart<span>Fleet</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {isAdmin ? (
          adminNavGroups.map((grp, gIdx) => (
            <div key={gIdx} style={{ marginBottom: 14 }}>
              {grp.groupTitle && (
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    padding: '4px 12px',
                    letterSpacing: '0.8px',
                  }}
                >
                  {grp.groupTitle}
                </div>
              )}
              {grp.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) =>
                    `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
                  }
                >
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <span className="sidebar__nav-label">{item.label}</span>
                  {item.badge && (
                    <span
                      className="sidebar__badge"
                      style={{ background: item.badgeColor || 'var(--accent-red)' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))
        ) : (
          (isDriver ? driverNavItems : customerNavItems).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/customer' || item.path === '/driver'}
              className={({ isActive }) =>
                `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
              }
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
              {item.badge && <span className="sidebar__badge">{item.badge}</span>}
            </NavLink>
          ))
        )}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user" style={{ cursor: 'default' }}>
          <NavLink
            to={isDriver ? '/driver/profile' : isAdmin ? '/admin/users' : '/customer/profile'}
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, textDecoration: 'none', color: 'inherit' }}
            title="Cập nhật thông tin cá nhân"
          >
            <div className="sidebar__avatar">{initials}</div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user?.fullName}</div>
              <div className="sidebar__user-role">{user?.role}</div>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            title="Đăng xuất"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <HiOutlineLogout style={{ fontSize: '1.2rem', color: 'var(--accent-red)' }} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
