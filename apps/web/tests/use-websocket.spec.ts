import { renderHook, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Mock socket.io-client ────────────────────────────

const mockOn = vi.fn();
const mockDisconnect = vi.fn();
const mockSocket = { on: mockOn, disconnect: mockDisconnect };

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { io } from 'socket.io-client';
import { useWebSocket } from '../src/hooks/use-websocket';

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('should not connect when no token is stored', () => {
    renderHook(() => useWebSocket({ 'bed:status-changed': vi.fn() }));

    expect(io).not.toHaveBeenCalled();
  });

  it('should connect with token and tenantId from localStorage', () => {
    localStorage.setItem('access_token', 'test-jwt');
    localStorage.setItem('tenant_id', 'tenant-1');

    renderHook(() => useWebSocket({ 'bed:status-changed': vi.fn() }));

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'test-jwt', tenantId: 'tenant-1' },
        transports: ['websocket', 'polling'],
      }),
    );
  });

  it('should register event listeners for all provided events', () => {
    localStorage.setItem('access_token', 'test-jwt');

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    renderHook(() =>
      useWebSocket({
        'bed:status-changed': handler1,
        'swap:created': handler2,
      }),
    );

    // Should register connect + 2 custom events
    const registeredEvents = mockOn.mock.calls.map((c: unknown[]) => c[0]);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('bed:status-changed');
    expect(registeredEvents).toContain('swap:created');
  });

  it('should disconnect on unmount', () => {
    localStorage.setItem('access_token', 'test-jwt');

    const { unmount } = renderHook(() => useWebSocket({ 'swap:updated': vi.fn() }));

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should invoke the correct handler when an event fires', () => {
    localStorage.setItem('access_token', 'test-jwt');

    const handler = vi.fn();
    renderHook(() => useWebSocket({ 'bed:status-changed': handler }));

    // Find the registered callback for bed:status-changed
    const call = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'bed:status-changed');
    expect(call).toBeDefined();

    // Simulate the event firing
    const callback = call![1] as (data: unknown) => void;
    callback({ bedId: 'bed-1', status: 'AVAILABLE' });

    expect(handler).toHaveBeenCalledWith({ bedId: 'bed-1', status: 'AVAILABLE' });
  });
});
