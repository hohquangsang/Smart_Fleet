import { useState } from 'react';
import {
  HiOutlineUser,
  HiOutlineCog,
  HiOutlineUsers,
  HiOutlineClipboardList,
  HiOutlineMail,
} from 'react-icons/hi';
import ProfileTab      from './settings/ProfileTab';
import SystemConfigTab from './settings/SystemConfigTab';
import AccountsTab     from './settings/AccountsTab';
import AuditLogTab     from './settings/AuditLogTab';
import SmtpTab         from './settings/SmtpTab';
import '../../styles/settings.css';

const TABS = [
  {
    id: 'profile',
    label: 'Hồ Sơ',
    icon: <HiOutlineUser />,
    desc: 'Thông tin cá nhân & mật khẩu',
    component: ProfileTab,
  },
  {
    id: 'system',
    label: 'Hệ Thống',
    icon: <HiOutlineCog />,
    desc: 'Cài đặt chung, thông báo & phiên bản app',
    component: SystemConfigTab,
  },
  {
    id: 'accounts',
    label: 'Tài Khoản',
    icon: <HiOutlineUsers />,
    desc: 'Quản lý tài khoản admin',
    component: AccountsTab,
  },
  {
    id: 'audit-log',
    label: 'Nhật Ký',
    icon: <HiOutlineClipboardList />,
    desc: 'Lịch sử hoạt động hệ thống',
    component: AuditLogTab,
  },
  {
    id: 'smtp',
    label: 'Email',
    icon: <HiOutlineMail />,
    desc: 'Cấu hình SMTP & thông báo',
    component: SmtpTab,
  },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const current = TABS.find((t) => t.id === activeTab);
  const ActiveComponent = current?.component;

  return (
    <div className="settings-page">
      {/* ── Left Navigation ── */}
      <nav className="settings-nav">
        <div className="settings-nav__title">Cài đặt</div>

        {TABS.slice(0, 1).map((tab) => (
          <button
            key={tab.id}
            id={`settings-tab-${tab.id}`}
            className={`settings-nav__item ${activeTab === tab.id ? 'settings-nav__item--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="settings-nav__icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}

        <div className="settings-nav__separator" />
        <div className="settings-nav__title" style={{ marginTop: 4 }}>Quản Trị</div>

        {TABS.slice(1, 4).map((tab) => (
          <button
            key={tab.id}
            id={`settings-tab-${tab.id}`}
            className={`settings-nav__item ${activeTab === tab.id ? 'settings-nav__item--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="settings-nav__icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}

        <div className="settings-nav__separator" />
        <div className="settings-nav__title" style={{ marginTop: 4 }}>Liên Lạc</div>

        {TABS.slice(4).map((tab) => (
          <button
            key={tab.id}
            id={`settings-tab-${tab.id}`}
            className={`settings-nav__item ${activeTab === tab.id ? 'settings-nav__item--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="settings-nav__icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <div className="settings-content">
        {/* Tab Content */}
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default SettingsPage;
