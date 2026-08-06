import { useContext, useEffect } from 'react';
import { SocketContext } from '../contexts/SocketContext';

/**
 * Hook to subscribe to a Socket.IO event.
 * Automatically unsubscribes on unmount.
 */
const useSocket = (event, callback) => {
  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket || !event || !callback) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);

  return socket;
};

export default useSocket;
