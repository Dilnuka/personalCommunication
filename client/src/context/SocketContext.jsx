import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('token');
    const s = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect_error', (err) => {
      const msg = err?.message || '';
      if (msg.includes('Authentication') || msg.includes('Invalid or expired')) {
        localStorage.removeItem('token');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
      }
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
