import { renderHook, act, waitFor } from '@testing-library/react';
import { usePatients } from '../src/features/patients/hooks/use-patients';

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import { api } from '../src/lib/api-client';

const mockedApi = vi.mocked(api);

const mockBundle = {
  total: 1,
  entry: [
    {
      resource: {
        id: 'patient-1',
        resourceType: 'Patient',
        name: [{ family: 'Smith', given: ['John'] }],
      },
    },
  ],
};

const mockPatient = {
  id: 'patient-1',
  resourceType: 'Patient',
  name: [{ family: 'Smith', given: ['John'] }],
};

describe('usePatients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchPatients', () => {
    it('builds correct query string from params', async () => {
      mockedApi.get.mockResolvedValueOnce(mockBundle);

      const { result } = renderHook(() => usePatients());

      await act(async () => {
        await result.current.searchPatients({
          name: 'Smith',
          nhsNumber: '1234567890',
          birthDate: '1990-01-01',
          postalCode: 'AB1 2CD',
          page: 2,
          limit: 10,
        });
      });

      const calledPath = mockedApi.get.mock.calls[0][0];
      expect(calledPath).toContain('/patients?');
      expect(calledPath).toContain('name=Smith');
      expect(calledPath).toContain('nhsNumber=1234567890');
      expect(calledPath).toContain('birthDate=1990-01-01');
      expect(calledPath).toContain('postalCode=AB1+2CD');
      expect(calledPath).toContain('page=2');
      expect(calledPath).toContain('limit=10');
    });

    it('omits undefined params from query string', async () => {
      mockedApi.get.mockResolvedValueOnce(mockBundle);

      const { result } = renderHook(() => usePatients());

      await act(async () => {
        await result.current.searchPatients({ name: 'Smith' });
      });

      const calledPath = mockedApi.get.mock.calls[0][0];
      expect(calledPath).toContain('name=Smith');
      expect(calledPath).not.toContain('nhsNumber');
      expect(calledPath).not.toContain('birthDate');
    });

    it('sets loading state during search', async () => {
      let resolveGet: (value: unknown) => void;
      mockedApi.get.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGet = resolve;
          }),
      );

      const { result } = renderHook(() => usePatients());

      expect(result.current.loading).toBe(false);

      let searchPromise: Promise<unknown>;
      act(() => {
        searchPromise = result.current.searchPatients({ name: 'Smith' });
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

      const { result } = renderHook(() => usePatients());

      await act(async () => {
        try {
          await result.current.searchPatients({ name: 'Smith' });
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('getPatient', () => {
    it('calls correct endpoint with patient id', async () => {
      mockedApi.get.mockResolvedValueOnce(mockPatient);

      const { result } = renderHook(() => usePatients());

      const patient = await act(async () => {
        return result.current.getPatient('patient-1');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/patients/patient-1');
      expect(patient).toEqual(mockPatient);
    });
  });

  describe('createPatient', () => {
    it('calls correct endpoint with patient data', async () => {
      mockedApi.post.mockResolvedValueOnce(mockPatient);

      const { result } = renderHook(() => usePatients());

      const data = { resourceType: 'Patient', name: [{ family: 'Smith', given: ['John'] }] };
      const patient = await act(async () => {
        return result.current.createPatient(data);
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/patients', data);
      expect(patient).toEqual(mockPatient);
    });
  });
});
