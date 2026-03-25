import { renderHook, act } from '@testing-library/react';
import { useTraining } from '../src/features/training/hooks/use-training';

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

const mockRecord = {
  id: 'rec-1',
  title: 'Fire Safety',
  description: null,
  category: 'FIRE_SAFETY',
  priority: 'MANDATORY',
  status: 'COMPLETED',
  provider: 'Safety Corp',
  scheduledDate: null,
  startedDate: null,
  completedDate: '2026-03-01',
  expiryDate: '2027-03-01',
  renewalPeriodMonths: 12,
  hoursCompleted: 2,
  score: 95,
  notes: null,
  user: { id: 'u1', firstName: 'Jane', lastName: 'Doe', role: 'NURSE' },
  createdBy: { id: 'a1', firstName: 'Admin', lastName: 'User' },
  certificates: [],
  createdAt: '2026-03-01',
  updatedAt: '2026-03-01',
};

const mockPaginated = {
  data: [mockRecord],
  total: 1,
  page: 1,
  limit: 20,
};

const mockSummary = {
  totalRecords: 10,
  byStatus: { COMPLETED: 8, SCHEDULED: 2 },
  byCategory: { FIRE_SAFETY: 5 },
  mandatoryTotal: 8,
  mandatoryCompleted: 6,
  compliancePercentage: 75,
  expiringCount: 2,
};

describe('useTraining', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with loading false and no error', () => {
    const { result } = renderHook(() => useTraining());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('listTrainingRecords', () => {
    it('should call api.get with no params', async () => {
      mockedApi.get.mockResolvedValueOnce(mockPaginated);
      const { result } = renderHook(() => useTraining());

      let data: unknown;
      await act(async () => {
        data = await result.current.listTrainingRecords();
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/training');
      expect(data).toEqual(mockPaginated);
    });

    it('should build query string from params', async () => {
      mockedApi.get.mockResolvedValueOnce(mockPaginated);
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.listTrainingRecords({
          userId: 'u1',
          status: 'COMPLETED',
          page: 2,
        });
      });

      const url = mockedApi.get.mock.calls[0][0];
      expect(url).toContain('userId=u1');
      expect(url).toContain('status=COMPLETED');
      expect(url).toContain('page=2');
    });
  });

  describe('getTrainingRecord', () => {
    it('should call api.get with record id', async () => {
      mockedApi.get.mockResolvedValueOnce(mockRecord);
      const { result } = renderHook(() => useTraining());

      let data: unknown;
      await act(async () => {
        data = await result.current.getTrainingRecord('rec-1');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/training/rec-1');
      expect(data).toEqual(mockRecord);
    });
  });

  describe('getMyTraining', () => {
    it('should call api.get /training/me', async () => {
      mockedApi.get.mockResolvedValueOnce([mockRecord]);
      const { result } = renderHook(() => useTraining());

      let data: unknown;
      await act(async () => {
        data = await result.current.getMyTraining();
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/training/me');
      expect(data).toEqual([mockRecord]);
    });
  });

  describe('createTrainingRecord', () => {
    it('should call api.post with data', async () => {
      mockedApi.post.mockResolvedValueOnce(mockRecord);
      const { result } = renderHook(() => useTraining());

      const payload = { title: 'New Training', category: 'FIRE_SAFETY', userId: 'u1' };
      await act(async () => {
        await result.current.createTrainingRecord(payload);
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/training', payload);
    });
  });

  describe('updateTrainingRecord', () => {
    it('should call api.patch with id and data', async () => {
      mockedApi.patch.mockResolvedValueOnce(mockRecord);
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.updateTrainingRecord('rec-1', { title: 'Updated' });
      });

      expect(mockedApi.patch).toHaveBeenCalledWith('/training/rec-1', { title: 'Updated' });
    });
  });

  describe('deleteTrainingRecord', () => {
    it('should call api.delete with id', async () => {
      mockedApi.delete.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.deleteTrainingRecord('rec-1');
      });

      expect(mockedApi.delete).toHaveBeenCalledWith('/training/rec-1');
    });
  });

  describe('addCertificate', () => {
    it('should call api.post with training id and cert data', async () => {
      const cert = { name: 'Cert', issuer: 'Issuer', issueDate: '2026-03-01' };
      mockedApi.post.mockResolvedValueOnce({ id: 'cert-1', ...cert });
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.addCertificate('rec-1', cert);
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/training/rec-1/certificates', cert);
    });
  });

  describe('updateCertificate', () => {
    it('should call api.patch with training id, cert id, and data', async () => {
      mockedApi.patch.mockResolvedValueOnce({ id: 'cert-1', name: 'Updated' });
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.updateCertificate('rec-1', 'cert-1', { name: 'Updated' });
      });

      expect(mockedApi.patch).toHaveBeenCalledWith('/training/rec-1/certificates/cert-1', {
        name: 'Updated',
      });
    });
  });

  describe('deleteCertificate', () => {
    it('should call api.delete with training id and cert id', async () => {
      mockedApi.delete.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.deleteCertificate('rec-1', 'cert-1');
      });

      expect(mockedApi.delete).toHaveBeenCalledWith('/training/rec-1/certificates/cert-1');
    });
  });

  describe('getTrainingSummary', () => {
    it('should call api.get /training/summary', async () => {
      mockedApi.get.mockResolvedValueOnce(mockSummary);
      const { result } = renderHook(() => useTraining());

      let data: unknown;
      await act(async () => {
        data = await result.current.getTrainingSummary();
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/training/summary');
      expect(data).toEqual(mockSummary);
    });
  });

  describe('getExpiringTraining', () => {
    it('should call api.get with default 30 days', async () => {
      mockedApi.get.mockResolvedValueOnce([mockRecord]);
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.getExpiringTraining();
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/training/expiring?days=30');
    });

    it('should call api.get with custom days', async () => {
      mockedApi.get.mockResolvedValueOnce([]);
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.getExpiringTraining(60);
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/training/expiring?days=60');
    });
  });

  describe('error handling', () => {
    it('should set error state on failure', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.getMyTraining().catch(() => {});
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.loading).toBe(false);
    });

    it('should clear error on next successful call', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('fail'));
      const { result } = renderHook(() => useTraining());

      await act(async () => {
        await result.current.getMyTraining().catch(() => {});
      });
      expect(result.current.error).toBe('fail');

      mockedApi.get.mockResolvedValueOnce([]);
      await act(async () => {
        await result.current.getMyTraining();
      });
      expect(result.current.error).toBeNull();
    });
  });
});
