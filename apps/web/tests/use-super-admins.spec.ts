import { renderHook, act } from '@testing-library/react';
import { useSuperAdmins } from '../src/features/super-admins/hooks/use-super-admins';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

describe('useSuperAdmins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('fetches super admins with default pagination', async () => {
      const response = { data: [], total: 0, page: 1, limit: 50 };
      mockGet.mockResolvedValueOnce(response);

      const { result } = renderHook(() => useSuperAdmins());
      const res = await act(() => result.current.list());

      expect(mockGet).toHaveBeenCalledWith('/users/super-admins?page=1&limit=50');
      expect(res).toEqual(response);
    });

    it('fetches super admins with custom pagination', async () => {
      mockGet.mockResolvedValueOnce({ data: [], total: 0, page: 2, limit: 10 });

      const { result } = renderHook(() => useSuperAdmins());
      await act(() => result.current.list(2, 10));

      expect(mockGet).toHaveBeenCalledWith('/users/super-admins?page=2&limit=10');
    });

    it('sets error on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSuperAdmins());

      let caught: Error | undefined;
      await act(async () => {
        try {
          await result.current.list();
        } catch (e) {
          caught = e as Error;
        }
      });
      expect(caught?.message).toBe('Network error');
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('create', () => {
    it('posts new super admin', async () => {
      const created = { id: 'sa-new', email: 'new@test.com', role: 'SUPER_ADMIN' };
      mockPost.mockResolvedValueOnce(created);

      const { result } = renderHook(() => useSuperAdmins());
      const res = await act(() =>
        result.current.create({
          email: 'new@test.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'Admin',
        }),
      );

      expect(mockPost).toHaveBeenCalledWith('/users/super-admins', {
        email: 'new@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'Admin',
      });
      expect(res).toEqual(created);
    });
  });

  describe('deactivate', () => {
    it('patches to deactivate endpoint', async () => {
      mockPatch.mockResolvedValueOnce({ id: 'sa1', isActive: false });

      const { result } = renderHook(() => useSuperAdmins());
      await act(() => result.current.deactivate('sa1'));

      expect(mockPatch).toHaveBeenCalledWith('/users/super-admins/sa1/deactivate', {});
    });
  });

  describe('reactivate', () => {
    it('patches to reactivate endpoint', async () => {
      mockPatch.mockResolvedValueOnce({ id: 'sa1', isActive: true });

      const { result } = renderHook(() => useSuperAdmins());
      await act(() => result.current.reactivate('sa1'));

      expect(mockPatch).toHaveBeenCalledWith('/users/super-admins/sa1/reactivate', {});
    });
  });
});
