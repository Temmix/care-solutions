import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;

export function useWebSocket(events: Record<string, (data: unknown) => void>): void {
  const socketRef = useRef<Socket | null>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token, tenantId },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Connected
    });

    // Register all event listeners
    const eventNames = Object.keys(eventsRef.current);
    for (const event of eventNames) {
      socket.on(event, (data: unknown) => {
        eventsRef.current[event]?.(data);
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
}
