import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

type PermissionState = 'unknown' | 'granted' | 'denied';

interface GeolocationState {
  coords: Coords | null;
  permission: PermissionState;
  error: string | null;
  /** Request permission + a fresh high-accuracy fix on demand (e.g. at clock-in). */
  refresh: () => Promise<Coords | null>;
}

/**
 * Foreground location for clock-in/out. We request a one-shot high-accuracy fix
 * rather than a continuous watch — the worker only needs their position at the
 * moment they tap clock in or out.
 */
export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<Coords | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermission('denied');
        setError('Location permission is required to clock in.');
        return null;
      }
      setPermission('granted');
      setError(null);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next: Coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
      };
      setCoords(next);
      return next;
    } catch {
      setError('Could not get your location. Check that GPS is on.');
      return null;
    }
  }, []);

  // Warm up a fix on mount so the distance indicator is ready.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { coords, permission, error, refresh };
}

/** Great-circle distance in metres (haversine) — mirrors the server check. */
export function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
