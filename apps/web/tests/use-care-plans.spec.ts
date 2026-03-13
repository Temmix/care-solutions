import { renderHook, act } from '@testing-library/react';
import { useCarePlans } from '../src/features/care-plans/hooks/use-care-plans';

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../src/lib/api-client';

const mockedApi = vi.mocked(api);

const mockBundle = {
  total: 1,
  entry: [
    {
      resource: {
        id: 'cp-1',
        resourceType: 'CarePlan',
        title: 'Falls Prevention',
        status: 'active',
      },
    },
  ],
};

const mockCarePlan = {
  id: 'cp-1',
  resourceType: 'CarePlan',
  title: 'Falls Prevention',
  status: 'active',
};

describe('useCarePlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchCarePlans', () => {
    it('builds correct query string from params', async () => {
      mockedApi.get.mockResolvedValueOnce(mockBundle);

      const { result } = renderHook(() => useCarePlans());

      await act(async () => {
        await result.current.searchCarePlans({
          patientId: 'p-1',
          status: 'ACTIVE',
          category: 'NURSING',
          page: 2,
          limit: 10,
        });
      });

      const calledPath = mockedApi.get.mock.calls[0][0];
      expect(calledPath).toContain('/care-plans?');
      expect(calledPath).toContain('patientId=p-1');
      expect(calledPath).toContain('status=ACTIVE');
      expect(calledPath).toContain('category=NURSING');
      expect(calledPath).toContain('page=2');
      expect(calledPath).toContain('limit=10');
    });

    it('sets loading state during search', async () => {
      let resolveGet: (value: unknown) => void;
      mockedApi.get.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGet = resolve;
          }),
      );

      const { result } = renderHook(() => useCarePlans());
      expect(result.current.loading).toBe(false);

      let searchPromise: Promise<unknown>;
      act(() => {
        searchPromise = result.current.searchCarePlans({});
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveGet!(mockBundle);
        await searchPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCarePlans());

      await act(async () => {
        try {
          await result.current.searchCarePlans({});
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('getCarePlan', () => {
    it('calls correct endpoint', async () => {
      mockedApi.get.mockResolvedValueOnce(mockCarePlan);

      const { result } = renderHook(() => useCarePlans());

      const cp = await act(async () => {
        return result.current.getCarePlan('cp-1');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/care-plans/cp-1');
      expect(cp).toEqual(mockCarePlan);
    });
  });

  describe('createCarePlan', () => {
    it('calls correct endpoint with data', async () => {
      mockedApi.post.mockResolvedValueOnce(mockCarePlan);

      const { result } = renderHook(() => useCarePlans());

      const data = { title: 'Falls Prevention', patientId: 'p-1', startDate: '2026-03-01' };
      const cp = await act(async () => {
        return result.current.createCarePlan(data);
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/care-plans', data);
      expect(cp).toEqual(mockCarePlan);
    });
  });

  describe('updateCarePlan', () => {
    it('calls correct endpoint with data', async () => {
      mockedApi.patch.mockResolvedValueOnce(mockCarePlan);

      const { result } = renderHook(() => useCarePlans());

      const cp = await act(async () => {
        return result.current.updateCarePlan('cp-1', { status: 'ACTIVE' });
      });

      expect(mockedApi.patch).toHaveBeenCalledWith('/care-plans/cp-1', { status: 'ACTIVE' });
      expect(cp).toEqual(mockCarePlan);
    });
  });

  describe('goals', () => {
    it('addGoal calls correct endpoint', async () => {
      const mockGoal = { id: 'g-1', description: 'Reduce falls' };
      mockedApi.post.mockResolvedValueOnce(mockGoal);

      const { result } = renderHook(() => useCarePlans());

      await act(async () => {
        await result.current.addGoal('cp-1', { description: 'Reduce falls' });
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/care-plans/cp-1/goals', {
        description: 'Reduce falls',
      });
    });

    it('removeGoal calls correct endpoint', async () => {
      mockedApi.delete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useCarePlans());

      await act(async () => {
        await result.current.removeGoal('cp-1', 'g-1');
      });

      expect(mockedApi.delete).toHaveBeenCalledWith('/care-plans/cp-1/goals/g-1');
    });
  });

  describe('activities', () => {
    it('addActivity calls correct endpoint', async () => {
      const mockActivity = { id: 'a-1', description: 'Daily walks' };
      mockedApi.post.mockResolvedValueOnce(mockActivity);

      const { result } = renderHook(() => useCarePlans());

      await act(async () => {
        await result.current.addActivity('cp-1', { type: 'EXERCISE', description: 'Daily walks' });
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/care-plans/cp-1/activities', {
        type: 'EXERCISE',
        description: 'Daily walks',
      });
    });
  });

  describe('notes', () => {
    it('addNote calls correct endpoint', async () => {
      const mockNote = { id: 'n-1', content: 'Patient improving' };
      mockedApi.post.mockResolvedValueOnce(mockNote);

      const { result } = renderHook(() => useCarePlans());

      await act(async () => {
        await result.current.addNote('cp-1', 'Patient improving');
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/care-plans/cp-1/notes', {
        content: 'Patient improving',
      });
    });

    it('getNotes calls correct endpoint with pagination', async () => {
      const mockNotes = { data: [], total: 0, page: 2, limit: 10 };
      mockedApi.get.mockResolvedValueOnce(mockNotes);

      const { result } = renderHook(() => useCarePlans());

      await act(async () => {
        await result.current.getNotes('cp-1', 2, 10);
      });

      const calledPath = mockedApi.get.mock.calls[0][0];
      expect(calledPath).toContain('/care-plans/cp-1/notes');
      expect(calledPath).toContain('page=2');
      expect(calledPath).toContain('limit=10');
    });
  });
});
