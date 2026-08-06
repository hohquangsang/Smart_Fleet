import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DashboardLayout = ({ title = 'Dashboard' }) => {
  return (
    <div className="page-layout">
      <Sidebar />
      <main className="page-content">
        <TopBar title={title} />
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
