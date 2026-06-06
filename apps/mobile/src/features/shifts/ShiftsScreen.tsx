import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { useShifts } from './useShifts';
import type { RosterShift } from '../../types';

function statusStyle(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'IN_PROGRESS':
      return { bg: '#dcfce7', fg: colors.success };
    case 'COMPLETED':
      return { bg: '#e2e8f0', fg: colors.muted };
    case 'CANCELLED':
      return { bg: '#fee2e2', fg: colors.danger };
    case 'PUBLISHED':
    default:
      return { bg: '#e0f2fe', fg: '#0369a1' };
  }
}

function ShiftCard({ shift }: { shift: RosterShift }) {
  const s = statusStyle(shift.status);
  const p = shift.shiftPattern;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.shiftName}>{p.name}</Text>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>
            {shift.status.replace('_', ' ').toLowerCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.shiftTime}>
        {p.startTime} – {p.endTime}
      </Text>
      {shift.location && <Text style={styles.location}>{shift.location.name}</Text>}
    </View>
  );
}

export default function ShiftsScreen() {
  const { loading, error, groups, refresh } = useShifts();

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
      {error && <Text style={styles.error}>{error}</Text>}

      {!error && groups.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.empty}>No upcoming shifts in the next 4 weeks.</Text>
        </View>
      )}

      {groups.map((group) => (
        <View key={group.date} style={styles.group}>
          <Text style={styles.dayLabel}>{group.label}</Text>
          {group.shifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.muted, fontSize: 16, textAlign: 'center' },
  error: { color: colors.danger, marginBottom: spacing.sm },
  group: { gap: spacing.sm },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  shiftTime: { fontSize: 15, color: colors.text },
  location: { fontSize: 14, color: colors.muted },
});
