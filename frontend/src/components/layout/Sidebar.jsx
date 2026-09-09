import { NavLink } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineUserGroup, HiOutlineShoppingCart, HiOutlineMap, HiOutlineDocumentText, HiOutlineTruck, HiOutlineChartBar, HiOutlineLogout, HiOutlineUser, HiOutlineCog } from 'react-icons/hi';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import useAdminNotifications from '../../hooks/useAdminNotifications';
import useAuth from '../../hooks/useAuth';
import '../../styles/sidebar.css';

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

const Sidebar = ({ collapsed = false, onToggle }) => {
  const { user, logout, isAdmin, isDriver } = useAuth();
  const { badgeCounts } = useAdminNotifications();

  const getAdminBadge = (path) => {
    if (path === '/admin/orders' && badgeCounts.ordersCount > 0) {
      return { count: badgeCounts.ordersCount, color: 'var(--accent-red)' };
    }
    if (path === '/admin/drivers' && badgeCounts.driversCount > 0) {
      return { count: badgeCounts.driversCount, color: '#F5A623' };
    }
    if (path === '/admin/users' && badgeCounts.usersCount > 0) {
      return { count: badgeCounts.usersCount, color: 'var(--accent-blue)' };
    }
    return null;
  };

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
        { path: '/admin/orders', label: 'Đơn hàng', icon: <HiOutlineShoppingCart /> },
        { path: '/admin/drivers', label: 'Tài xế', icon: <HiOutlineUsers /> },
        { path: '/admin/users', label: 'Người dùng', icon: <HiOutlineUserGroup /> },
      ],
    },
    {
      groupTitle: 'HỆ THỐNG',
      items: [
        { path: '/admin/settings', label: 'Cài đặt', icon: <HiOutlineCog /> },
      ],
    },
  ];

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__logo">
        <button
          type="button"
          className="sidebar__toggle-btn"
          onClick={onToggle}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen size={18} />
            : <PanelLeftClose size={18} />
          }
        </button>
        <div className="sidebar__logo-icon">SF</div>
        <div className="sidebar__logo-text">
          Smart<span>Fleet</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {isAdmin ? (
          adminNavGroups.map((grp, gIdx) => (
            <div key={gIdx} style={{ marginBottom: 14 }}>
              {grp.groupTitle && !collapsed && (
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
              {grp.items.map((item) => {
                const badgeInfo = getAdminBadge(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={({ isActive }) =>
                      `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="sidebar__nav-icon">{item.icon}</span>
                    <span className="sidebar__nav-label">{item.label}</span>
                    {badgeInfo && (
                      <span
                        className="sidebar__badge"
                        style={{ background: badgeInfo.color }}
                      >
                        {badgeInfo.count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
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
              title={collapsed ? item.label : undefined}
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
            to={isDriver ? '/driver/profile' : isAdmin ? '/admin/settings' : '/customer/profile'}
            style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, flex: collapsed ? 'none' : 1, textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}
            title="Cập nhật thông tin cá nhân"
          >
            <div className="sidebar__avatar" style={{ overflow: 'hidden', padding: 0 }}>
              {user?.avatarUrl || user?.avatar
                ? <img src={user.avatarUrl || user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user?.fullName}</div>
              <div className="sidebar__user-role">{user?.role}</div>
            </div>
          </NavLink>
          <button
            type="button"
            className="sidebar__logout-btn"
            onClick={logout}
            title="Đăng xuất"
          >
            <HiOutlineLogout style={{ fontSize: '1.2rem', color: 'var(--accent-red)' }} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
