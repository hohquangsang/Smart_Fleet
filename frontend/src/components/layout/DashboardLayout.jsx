import { useContext, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BlockedModal from '../common/BlockedModal';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { SocketContext } from '../../contexts/SocketContext';

const DashboardLayout = ({ title = 'Dashboard' }) => {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const socket = useContext(SocketContext);
  const toast = useToast();

  // Socket listener for account blockage updates
  useEffect(() => {
    if (!socket) return;

    const handleDriverApproval = (data) => {
      const status = data.approvalStatus || data.status;
      if (status === 'BLOCKED') {
        toast.error(data.message || 'Tài khoản của bạn đã bị khóa bởi Admin.', 'Tài khoản bị khóa 🔒');
        if (user) {
          updateUser({
            ...user,
            driver: {
              ...(user.driver || {}),
              approvalStatus: 'BLOCKED',
              rejectionReason: data.rejectionReason || user.driver?.rejectionReason,
            },
          });
        }
      } else if (status === 'APPROVED') {
        toast.success('Hồ sơ tài xế của bạn đã được Admin phê duyệt! 🎉', 'Thành công 🎉');
        if (user) {
          updateUser({
            ...user,
            driver: {
              ...(user.driver || {}),
              approvalStatus: 'APPROVED',
              rejectionReason: null,
              isAppealed: false,
            },
          });
        }
      }
    };

    const handleUserStatusUpdated = (data) => {
      if (data.isBlocked) {
        toast.error(data.message || 'Tài khoản của bạn đã bị khóa bởi Admin.', 'Tài khoản bị khóa 🔒');
        if (user) {
          updateUser({
            ...user,
            isBlocked: true,
            blockReason: data.blockReason || user.blockReason,
          });
        }
      } else {
        toast.success('Tài khoản của bạn đã được Admin mở khóa!', 'Thành công 🎉');
        if (user) {
          updateUser({
            ...user,
            isBlocked: false,
            blockReason: null,
            isAppealed: false,
          });
        }
      }
    };

    socket.on('driver:approval-updated', handleDriverApproval);
    socket.on('role:status-updated', handleDriverApproval);
    socket.on('user:status-updated', handleUserStatusUpdated);

    return () => {
      socket.off('driver:approval-updated', handleDriverApproval);
      socket.off('role:status-updated', handleDriverApproval);
      socket.off('user:status-updated', handleUserStatusUpdated);
    };
  }, [socket, user, updateUser, toast]);

  // Determine if current user is blocked
  const isDriverBlocked = user?.role === 'DRIVER' && user?.driver?.approvalStatus === 'BLOCKED';
  const isCustomerBlocked = user?.role === 'CUSTOMER' && Boolean(user?.isBlocked);

  const isBlocked = isDriverBlocked || isCustomerBlocked;
  const blockReason = user?.role === 'DRIVER'
    ? (user?.driver?.rejectionReason || 'Vi phạm điều khoản hoạt động tài xế')
    : (user?.blockReason || 'Vi phạm điều khoản dịch vụ khách hàng');

  const profilePath = user?.role === 'DRIVER' ? '/driver/profile' : '/customer/profile';
  const isOnProfilePage = location.pathname === profilePath;

  const showBlockedModal = isBlocked && !isOnProfilePage;

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="page-content">
        <TopBar title={title} />
        <Outlet />
      </main>

      {/* Popup modal khi tài khoản bị khóa và cố gắng vào các trang khác */}
      <BlockedModal
        isBlocked={showBlockedModal}
        blockReason={blockReason}
        profilePath={profilePath}
      />
    </div>
  );
};

export default DashboardLayout;
