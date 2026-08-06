import { HiOutlineSearch, HiOutlineBell } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import '../../styles/components.css';

const TopBar = ({ title }) => {
  const { user } = useAuth();

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>

      <div className="topbar__actions">
        <div className="topbar__search">
          <HiOutlineSearch className="topbar__search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Search vehicles, orders, or routes..."
          />
        </div>

        <button className="topbar__notification" title="Notifications">
          <HiOutlineBell size={20} />
          <span className="topbar__notification-badge" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>
              {user?.fullName}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {user?.role}
            </div>
          </div>
          <div className="sidebar__avatar">{initials}</div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
