import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const SettingsPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');

  const TABS = [
    {
      id: 'profile',
      label: t('settings.tabs.profile'),
      icon: <HiOutlineUser />,
      desc: t('settings.tabs.profile_desc'),
      component: ProfileTab,
    },
    {
      id: 'system',
      label: t('settings.tabs.system'),
      icon: <HiOutlineCog />,
      desc: t('settings.tabs.system_desc'),
      component: SystemConfigTab,
    },
    {
      id: 'accounts',
      label: t('settings.tabs.accounts'),
      icon: <HiOutlineUsers />,
      desc: t('settings.tabs.accounts_desc'),
      component: AccountsTab,
    },
    {
      id: 'audit-log',
      label: t('settings.tabs.audit_log'),
      icon: <HiOutlineClipboardList />,
      desc: t('settings.tabs.audit_log_desc'),
      component: AuditLogTab,
    },
    {
      id: 'smtp',
      label: t('settings.tabs.email'),
      icon: <HiOutlineMail />,
      desc: t('settings.tabs.email_desc'),
      component: SmtpTab,
    },
  ];

  const current = TABS.find((tab) => tab.id === activeTab);
  const ActiveComponent = current?.component;

  return (
    <div className="settings-page">
      {/* ── Left Navigation ── */}
      <nav className="settings-nav">
        <div className="settings-nav__title">{t('settings.nav_title')}</div>

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
        <div className="settings-nav__title" style={{ marginTop: 4 }}>
          {t('settings.admin_section')}
        </div>

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
        <div className="settings-nav__title" style={{ marginTop: 4 }}>
          {t('settings.contact_section')}
        </div>

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
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default SettingsPage;
