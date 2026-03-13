import { renderHook, act } from '@testing-library/react';
import { usePractitioners } from '../src/features/practitioners/hooks/use-practitioners';

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

describe('usePractitioners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('fetches practitioners with default pagination', async () => {
      const response = { data: [], total: 0, page: 1, limit: 50 };
      mockGet.mockResolvedValueOnce(response);

      const { result } = renderHook(() => usePractitioners());
      const res = await act(() => result.current.list());

      expect(mockGet).toHaveBeenCalledWith('/practitioners?page=1&limit=50');
      expect(res).toEqual(response);
    });

    it('fetches practitioners with custom pagination', async () => {
      const response = { data: [], total: 0, page: 2, limit: 10 };
      mockGet.mockResolvedValueOnce(response);

      const { result } = renderHook(() => usePractitioners());
      await act(() => result.current.list(2, 10));

      expect(mockGet).toHaveBeenCalledWith('/practitioners?page=2&limit=10');
    });

    it('sets loading state during fetch', async () => {
      mockGet.mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 50 });

      const { result } = renderHook(() => usePractitioners());
      expect(result.current.loading).toBe(false);

      await act(() => result.current.list());
      expect(result.current.loading).toBe(false); // finished
    });

    it('sets error on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePractitioners());

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

  describe('get', () => {
    it('fetches a single practitioner', async () => {
      const practitioner = { id: 'p-1', name: [{ given: ['John'], family: 'Smith' }] };
      mockGet.mockResolvedValueOnce(practitioner);

      const { result } = renderHook(() => usePractitioners());
      const res = await act(() => result.current.get('p-1'));

      expect(mockGet).toHaveBeenCalledWith('/practitioners/p-1');
      expect(res).toEqual(practitioner);
    });
  });

  describe('create', () => {
    it('posts practitioner with required fields', async () => {
      const created = { id: 'p-new', name: [{ given: ['Jane'], family: 'Doe' }] };
      mockPost.mockResolvedValueOnce(created);

      const { result } = renderHook(() => usePractitioners());
      const res = await act(() =>
        result.current.create({
          givenName: 'Jane',
          familyName: 'Doe',
          gender: 'UNKNOWN',
          phone: '',
          email: '',
          specialty: '',
          registrationNumber: '',
          userId: 'user-1',
        }),
      );

      expect(mockPost).toHaveBeenCalledWith('/practitioners', {
        givenName: 'Jane',
        familyName: 'Doe',
        userId: 'user-1',
      });
      expect(res).toEqual(created);
    });

    it('includes optional fields when provided', async () => {
      mockPost.mockResolvedValueOnce({ id: 'p-2' });

      const { result } = renderHook(() => usePractitioners());
      await act(() =>
        result.current.create({
          givenName: 'John',
          familyName: 'Smith',
          gender: 'MALE',
          phone: '+44 7700 900000',
          email: 'john@nhs.uk',
          specialty: 'General Practice',
          registrationNumber: 'GMC 1234567',
          userId: 'user-1',
        }),
      );

      expect(mockPost).toHaveBeenCalledWith('/practitioners', {
        givenName: 'John',
        familyName: 'Smith',
        gender: 'MALE',
        phone: '+44 7700 900000',
        email: 'john@nhs.uk',
        specialty: 'General Practice',
        registrationNumber: 'GMC 1234567',
        userId: 'user-1',
      });
    });
  });

  describe('update', () => {
    it('patches practitioner with provided fields', async () => {
      mockPatch.mockResolvedValueOnce({ id: 'p-1' });

      const { result } = renderHook(() => usePractitioners());
      await act(() => result.current.update('p-1', { givenName: 'Updated', familyName: 'Name' }));

      expect(mockPatch).toHaveBeenCalledWith('/practitioners/p-1', {
        givenName: 'Updated',
        familyName: 'Name',
      });
    });

    it('can deactivate a practitioner', async () => {
      mockPatch.mockResolvedValueOnce({ id: 'p-1', active: false });

      const { result } = renderHook(() => usePractitioners());
      await act(() => result.current.update('p-1', { active: false }));

      expect(mockPatch).toHaveBeenCalledWith('/practitioners/p-1', { active: false });
    });
  });
});
