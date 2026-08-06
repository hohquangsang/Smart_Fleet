import { NavLink } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineMap, HiOutlineTruck, HiOutlineUsers, HiOutlineChartBar, HiOutlineDocumentText, HiOutlineBell, HiOutlineShoppingCart, HiOutlineClock, HiOutlineLogout } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import '../../styles/sidebar.css';

const adminNavItems = [
  { path: '/admin', label: 'Operations Dashboard', icon: <HiOutlineViewGrid /> },
  { path: '/admin/tracking', label: 'Live Fleet Monitor', icon: <HiOutlineMap /> },
  { path: '/admin/orders', label: 'Order & Dispatch', icon: <HiOutlineTruck /> },
  { path: '/admin/drivers', label: 'Fleet Management', icon: <HiOutlineUsers /> },
  { path: '/admin/analytics', label: 'Data Analytics', icon: <HiOutlineChartBar /> },
  { path: '/admin/alerts', label: 'System Alerts', icon: <HiOutlineBell /> },
];

const customerNavItems = [
  { path: '/customer', label: 'Create Order', icon: <HiOutlineShoppingCart /> },
  { path: '/customer/orders', label: 'My Orders', icon: <HiOutlineTruck /> },
  { path: '/customer/invoices', label: 'Invoices', icon: <HiOutlineDocumentText /> },
];

const driverNavItems = [
  { path: '/driver', label: 'Dashboard', icon: <HiOutlineViewGrid /> },
  { path: '/driver/available', label: 'Available Orders', icon: <HiOutlineTruck /> },
  { path: '/driver/history', label: 'Order History', icon: <HiOutlineClock /> },
];

const Sidebar = () => {
  const { user, logout, isAdmin, isDriver } = useAuth();

  const navItems = isAdmin ? adminNavItems : isDriver ? driverNavItems : customerNavItems;

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
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin' || item.path === '/customer' || item.path === '/driver'}
            className={({ isActive }) =>
              `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
            }
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            <span className="sidebar__nav-label">{item.label}</span>
            {item.badge && <span className="sidebar__badge">{item.badge}</span>}
          </NavLink>
        ))}
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
