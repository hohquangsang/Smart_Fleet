import { useNavigate } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineBell } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import '../../styles/components.css';

const TopBar = ({ title }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const handleProfileClick = () => {
    if (user?.role === 'DRIVER') {
      navigate('/driver/profile');
    } else if (user?.role === 'CUSTOMER') {
      navigate('/customer/profile');
    } else if (user?.role === 'ADMIN') {
      navigate('/admin/dashboard');
    }
  };

  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>

      <div className="topbar__actions">
        <div className="topbar__search">
          <HiOutlineSearch className="topbar__search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Tìm kiếm xe, đơn hàng, tuyến đường..."
          />
        </div>

        <button className="topbar__notification" title="Notifications">
          <HiOutlineBell size={20} />
          <span className="topbar__notification-badge" />
        </button>

        <div
          onClick={handleProfileClick}
          title="Chuyển đến trang cập nhật thông tin cá nhân"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '10px',
            transition: 'background 0.2s ease, border-color 0.2s ease',
            border: '1px solid transparent',
            userSelect: 'none',
          }}
          className="topbar-user-badge"
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
              {user?.fullName}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {user?.role}
            </div>
          </div>
          <div
            className="sidebar__avatar"
            style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)', overflow: 'hidden', padding: 0 }}
          >
            {user?.avatarUrl || user?.avatar
              ? <img src={user.avatarUrl || user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
