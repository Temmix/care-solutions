import { renderHook, act } from '@testing-library/react';
import { useBilling } from '../src/features/billing/hooks/use-billing';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('useBilling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlans', () => {
    it('fetches available plans', async () => {
      const plans = [
        { tier: 'FREE', label: 'Free', priceMonthlyGBP: 0 },
        { tier: 'STARTER', label: 'Starter', priceMonthlyGBP: 39 },
      ];
      mockGet.mockResolvedValueOnce(plans);

      const { result } = renderHook(() => useBilling());
      const res = await act(() => result.current.getPlans());

      expect(mockGet).toHaveBeenCalledWith('/billing/plans');
      expect(res).toEqual(plans);
    });
  });

  describe('getSubscription', () => {
    it('fetches current subscription', async () => {
      const sub = { id: 'sub-1', tier: 'STARTER', status: 'ACTIVE' };
      mockGet.mockResolvedValueOnce(sub);

      const { result } = renderHook(() => useBilling());
      const res = await act(() => result.current.getSubscription());

      expect(mockGet).toHaveBeenCalledWith('/billing/subscription');
      expect(res).toEqual(sub);
    });

    it('sets error on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useBilling());

      let caught: Error | undefined;
      await act(async () => {
        try {
          await result.current.getSubscription();
        } catch (e) {
          caught = e as Error;
        }
      });

      expect(caught?.message).toBe('Not found');
      expect(result.current.error).toBe('Not found');
    });
  });

  describe('createCheckout', () => {
    it('posts checkout session request', async () => {
      mockPost.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session' });

      const { result } = renderHook(() => useBilling());
      const res = await act(() => result.current.createCheckout('price_starter'));

      expect(mockPost).toHaveBeenCalledWith('/billing/checkout', {
        priceId: 'price_starter',
        returnUrl: expect.stringContaining('/billing'),
      });
      expect(res.url).toBe('https://checkout.stripe.com/session');
    });
  });

  describe('openPortal', () => {
    it('posts portal session request', async () => {
      mockPost.mockResolvedValueOnce({ url: 'https://billing.stripe.com/portal' });

      const { result } = renderHook(() => useBilling());
      const res = await act(() => result.current.openPortal());

      expect(mockPost).toHaveBeenCalledWith('/billing/portal', {
        returnUrl: expect.stringContaining('/billing'),
      });
      expect(res.url).toBe('https://billing.stripe.com/portal');
    });
  });
});
