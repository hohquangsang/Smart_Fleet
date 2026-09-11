import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineViewGrid,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineShoppingCart,
  HiOutlineMap,
  HiOutlineDocumentText,
  HiOutlineTruck,
  HiOutlineChartBar,
  HiOutlineLogout,
  HiOutlineUser,
  HiOutlineCog,
} from 'react-icons/hi';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import useAdminNotifications from '../../hooks/useAdminNotifications';
import useAuth from '../../hooks/useAuth';
import '../../styles/sidebar.css';

const Sidebar = ({ collapsed = false, onToggle }) => {
  const { t } = useTranslation();
  const { user, logout, isAdmin, isDriver } = useAuth();
  const { badgeCounts } = useAdminNotifications();

  /* ── Badge helper ─────────────────────────────── */
  const getAdminBadge = (path) => {
    if (path === '/admin/orders' && badgeCounts.ordersCount > 0)
      return { count: badgeCounts.ordersCount, color: 'var(--accent-red)' };
    if (path === '/admin/drivers' && badgeCounts.driversCount > 0)
      return { count: badgeCounts.driversCount, color: '#F5A623' };
    if (path === '/admin/users' && badgeCounts.usersCount > 0)
      return { count: badgeCounts.usersCount, color: 'var(--accent-blue)' };
    return null;
  };

  /* ── Nav definitions (inside component → reactive to t()) ── */
  const adminNavGroups = [
    {
      groupTitle: null,
      items: [
        { path: '/admin', label: t('sidebar.admin.dashboard'), icon: <HiOutlineViewGrid /> },
      ],
    },
    {
      groupTitle: t('sidebar.admin.group_manage'),
      items: [
        { path: '/admin/orders',  label: t('sidebar.admin.orders'),  icon: <HiOutlineShoppingCart /> },
        { path: '/admin/drivers', label: t('sidebar.admin.drivers'), icon: <HiOutlineUsers /> },
        { path: '/admin/users',   label: t('sidebar.admin.users'),   icon: <HiOutlineUserGroup /> },
      ],
    },
    {
      groupTitle: t('sidebar.admin.group_system'),
      items: [
        { path: '/admin/settings', label: t('sidebar.admin.settings'), icon: <HiOutlineCog /> },
      ],
    },
  ];

  const customerNavItems = [
    { path: '/customer',          label: t('sidebar.customer.create_order'), icon: <HiOutlineShoppingCart /> },
    { path: '/customer/tracking', label: t('sidebar.customer.tracking'),     icon: <HiOutlineMap /> },
    { path: '/customer/history',  label: t('sidebar.customer.history'),      icon: <HiOutlineDocumentText /> },
    { path: '/customer/profile',  label: t('sidebar.customer.profile'),      icon: <HiOutlineUser /> },
  ];

  const driverNavItems = [
    { path: '/driver',           label: t('sidebar.driver.dashboard'), icon: <HiOutlineViewGrid /> },
    { path: '/driver/dispatch',  label: t('sidebar.driver.dispatch'),  icon: <HiOutlineTruck /> },
    { path: '/driver/active',    label: t('sidebar.driver.active'),    icon: <HiOutlineMap /> },
    { path: '/driver/earnings',  label: t('sidebar.driver.earnings'),  icon: <HiOutlineChartBar /> },
    { path: '/driver/profile',   label: t('sidebar.driver.profile'),   icon: <HiOutlineUser /> },
  ];

  /* ── Avatar initials ─────────────────────────── */
  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      {/* ── Logo + collapse button ─── */}
      <div className="sidebar__logo">
        <button
          type="button"
          className="sidebar__toggle-btn"
          onClick={onToggle}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <div className="sidebar__logo-icon">SF</div>
        <div className="sidebar__logo-text">
          Smart<span>Fleet</span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="sidebar__nav">
        {isAdmin ? (
          adminNavGroups.map((grp, gIdx) => (
            <div key={gIdx} style={{ marginBottom: 14 }}>
              {/* Group title */}
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

              {/* Nav items */}
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

      {/* ── Footer: user info + logout ───────────── */}
      <div className="sidebar__footer">
        <div className="sidebar__user" style={{ cursor: 'default' }}>
          <NavLink
            to={isDriver ? '/driver/profile' : isAdmin ? '/admin/settings' : '/customer/profile'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 10,
              flex: collapsed ? 'none' : 1,
              textDecoration: 'none',
              color: 'inherit',
              overflow: 'hidden',
            }}
            title={t('sidebar.update_profile')}
          >
            <div className="sidebar__avatar" style={{ overflow: 'hidden', padding: 0 }}>
              {user?.avatarUrl || user?.avatar ? (
                <img
                  src={user.avatarUrl || user.avatar}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
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
            title={t('sidebar.logout')}
          >
            <HiOutlineLogout style={{ fontSize: '1.2rem', color: 'var(--accent-red)' }} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
