import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { useGeolocation, haversineMetres, type Coords } from './useGeolocation';
import { useClock, type AssignmentView } from './useClock';
import { clearFailed } from './offline-queue';
import { clockWindow, clockInWindowState, fmtTimeUTC, humanizeUntil } from './clock-window';
import type { TodayAssignment } from '../../types';

function formatRange(a: TodayAssignment): string {
  const p = a.shift.shiftPattern;
  return `${p.startTime} – ${p.endTime}`;
}

function distanceLabel(a: TodayAssignment, coords: Coords | null): string | null {
  const loc = a.shift.location;
  if (!loc || loc.latitude == null || loc.longitude == null || !coords) return null;
  const metres = haversineMetres(coords.latitude, coords.longitude, loc.latitude, loc.longitude);
  const radius = loc.geofenceRadius ?? 150;
  const within = metres <= radius;
  return `${Math.round(metres)}m away · ${within ? 'within range' : `must be within ${radius}m`}`;
}

export default function ClockScreen() {
  const geo = useGeolocation();
  const { loading, error, views, pending, failed, online, refresh, clockIn, clockOut, syncNow } =
    useClock();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Tick so the clock-in window countdown updates and the button enables on time.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const onClockIn = async (view: AssignmentView) => {
    setBusyId(view.assignment.id);
    try {
      const coords = geo.coords ?? (await geo.refresh());
      if (!coords) {
        Alert.alert('Location needed', geo.error ?? 'Enable location to clock in.');
        return;
      }
      await clockIn(view.assignment.id, coords);
    } finally {
      setBusyId(null);
    }
  };

  const onClockOut = async (view: AssignmentView) => {
    setBusyId(view.assignment.id);
    try {
      const coords = geo.coords ?? (await geo.refresh());
      await clockOut(view.assignment.id, coords, undefined);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
    >
      {!online && (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Text style={styles.bannerText}>
            You’re offline. Clock actions are saved and will sync automatically.
          </Text>
        </View>
      )}

      {pending.length > 0 && (
        <View style={[styles.banner, styles.bannerInfo]}>
          <Text style={styles.bannerText}>
            {pending.length} clock {pending.length === 1 ? 'action' : 'actions'} waiting to sync.
          </Text>
          <Pressable onPress={syncNow} hitSlop={8}>
            <Text style={styles.bannerAction}>Sync now</Text>
          </Pressable>
        </View>
      )}

      {failed.length > 0 && (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerText}>
            {failed.length} clock {failed.length === 1 ? 'action' : 'actions'} were rejected:{' '}
            {failed[0].error}
          </Text>
          <Pressable onPress={clearFailed} hitSlop={8}>
            <Text style={styles.bannerAction}>Dismiss</Text>
          </Pressable>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {views.length === 0 && !error && (
        <View style={styles.centered}>
          <Text style={styles.empty}>No shifts scheduled for today.</Text>
        </View>
      )}

      {views.map((view) => {
        const { assignment, state, pendingKind } = view;
        const dist = distanceLabel(assignment, geo.coords);
        const busy = busyId === assignment.id;
        const win = clockWindow(assignment.shift);
        const winState = clockInWindowState(win, now);
        return (
          <View key={assignment.id} style={styles.card}>
            <Text style={styles.shiftName}>{assignment.shift.shiftPattern.name}</Text>
            <Text style={styles.shiftTime}>{formatRange(assignment)}</Text>
            {assignment.shift.location && (
              <Text style={styles.location}>{assignment.shift.location.name}</Text>
            )}
            {dist && <Text style={styles.distance}>{dist}</Text>}

            {pendingKind && (
              <Text style={styles.syncing}>
                {pendingKind === 'in' ? 'Clock-in' : 'Clock-out'} pending sync…
              </Text>
            )}

            {state === 'not_clocked_in' && winState === 'open' && (
              <Pressable
                style={[styles.button, styles.clockIn]}
                onPress={() => onClockIn(view)}
                disabled={busy}
              >
                <Text style={styles.buttonText}>{busy ? 'Working…' : 'Clock In'}</Text>
              </Pressable>
            )}
            {state === 'not_clocked_in' && winState === 'before' && (
              <View style={[styles.button, styles.notYet]}>
                <Text style={styles.notYetText}>
                  Clock-in opens {fmtTimeUTC(win.windowStart)} (in{' '}
                  {humanizeUntil(win.windowStart - now)})
                </Text>
              </View>
            )}
            {state === 'not_clocked_in' && winState === 'ended' && (
              <View style={[styles.button, styles.notYet]}>
                <Text style={styles.notYetText}>Clock-in window has closed</Text>
              </View>
            )}
            {state === 'clocked_in' && (
              <Pressable
                style={[styles.button, styles.clockOut]}
                onPress={() => onClockOut(view)}
                disabled={busy}
              >
                <Text style={styles.buttonText}>{busy ? 'Working…' : 'Clock Out'}</Text>
              </Pressable>
            )}
            {state === 'clocked_out' && (
              <View style={[styles.button, styles.done]}>
                <Text style={styles.doneText}>Shift complete</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.muted, fontSize: 16 },
  error: { color: colors.danger, marginBottom: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  bannerWarn: { backgroundColor: '#fef3c7' },
  bannerInfo: { backgroundColor: '#e0f2fe' },
  bannerError: { backgroundColor: '#fee2e2' },
  bannerText: { flex: 1, color: colors.text, fontSize: 13 },
  bannerAction: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  shiftName: { fontSize: 18, fontWeight: '700', color: colors.text },
  shiftTime: { fontSize: 15, color: colors.text },
  location: { fontSize: 14, color: colors.muted },
  distance: { fontSize: 13, color: colors.muted },
  syncing: { fontSize: 13, color: colors.warning, fontStyle: 'italic' },
  button: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  clockIn: { backgroundColor: colors.primary },
  clockOut: { backgroundColor: colors.danger },
  done: { backgroundColor: '#ecfdf5' },
  notYet: { backgroundColor: '#f1f5f9' },
  notYetText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  doneText: { color: colors.success, fontWeight: '700', fontSize: 15 },
});
