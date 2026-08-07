import { NavLink } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineUserGroup, HiOutlineShoppingCart, HiOutlineMap, HiOutlineDocumentText, HiOutlineTruck, HiOutlineChartBar, HiOutlineLogout } from 'react-icons/hi';
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
      { path: '/admin/drivers', label: 'Tài xế', icon: <HiOutlineUsers />, badge: '3', badgeColor: '#F5A623' },
      { path: '/admin/users', label: 'Người dùng', icon: <HiOutlineUserGroup /> },
    ],
  },
];

const customerNavItems = [
  { path: '/customer', label: 'Đặt đơn & Tính cước', icon: <HiOutlineShoppingCart /> },
  { path: '/customer/tracking', label: 'Theo dõi Real-time', icon: <HiOutlineMap /> },
  { path: '/customer/history', label: 'Lịch sử & Hóa đơn', icon: <HiOutlineDocumentText /> },
];

const driverNavItems = [
  { path: '/driver', label: 'Tổng quan & Trạng thái', icon: <HiOutlineViewGrid /> },
  { path: '/driver/dispatch', label: 'Nhận đơn Real-time', icon: <HiOutlineTruck /> },
  { path: '/driver/active', label: 'Đang giao hàng', icon: <HiOutlineMap /> },
  { path: '/driver/earnings', label: 'Thu nhập & Hiệu suất', icon: <HiOutlineChartBar /> },
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
        <div className="sidebar__user" onClick={logout} title="Logout">
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user?.fullName}</div>
            <div className="sidebar__user-role">{user?.role}</div>
          </div>
          <HiOutlineLogout style={{ marginLeft: 'auto', fontSize: '1.1rem', color: 'var(--text-muted)' }} />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
