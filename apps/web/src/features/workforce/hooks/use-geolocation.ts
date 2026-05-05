import { useState, useCallback, useRef } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type GeoStatus = 'idle' | 'acquiring' | 'ready' | 'denied' | 'error';

export function useGeolocation(): {
  position: GeoPosition | null;
  status: GeoStatus;
  error: string | null;
  requestPosition: () => void;
} {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('acquiring');
    setError(null);

    // Clear any existing watch
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('ready');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Location access was denied. Please enable it in your browser settings.');
        } else if (err.code === err.TIMEOUT) {
          setStatus('error');
          setError('Location request timed out. Please try again.');
        } else {
          setStatus('error');
          setError('Unable to determine your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }, []);

  return { position, status, error, requestPosition };
}
