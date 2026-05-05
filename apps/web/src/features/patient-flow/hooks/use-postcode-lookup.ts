import { useState, useCallback } from 'react';

interface PostcodeResult {
  latitude: number;
  longitude: number;
}

interface PostcodesIoResponse {
  status: number;
  result: {
    latitude: number;
    longitude: number;
  } | null;
}

export function usePostcodeLookup(): {
  loading: boolean;
  error: string | null;
  lookup: (postcode: string) => Promise<PostcodeResult | null>;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (postcode: string): Promise<PostcodeResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const encoded = encodeURIComponent(postcode.trim());
      const response = await fetch(`https://api.postcodes.io/postcodes/${encoded}`);

      if (response.status === 404) {
        setError('Postcode not found. Please check and try again.');
        return null;
      }

      if (!response.ok) {
        setError('Postcode lookup failed. Please try again or enter coordinates manually.');
        return null;
      }

      const data: PostcodesIoResponse = await response.json();

      if (!data.result) {
        setError('Postcode not found.');
        return null;
      }

      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
      };
    } catch {
      setError('Postcode lookup failed. Please try again or enter coordinates manually.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, lookup };
}
