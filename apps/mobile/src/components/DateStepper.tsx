import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date as YYYY-MM-DD using UTC parts (calendar-day, timezone-stable). */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayKey(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // midday avoids any DST edge when adding days
  return toDateKey(d);
}

export function addDaysKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateKey(d);
}

export function formatKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Minimal date picker with no native dependency: −/+ a day plus quick presets.
 * `min` (optional YYYY-MM-DD) prevents stepping before that day.
 */
export function DateStepper({
  value,
  onChange,
  min,
}: {
  value: string;
  onChange: (key: string) => void;
  min?: string;
}) {
  const canGoBack = !min || value > min;
  const step = (days: number) => {
    const next = addDaysKey(value, days);
    if (min && next < min) return;
    onChange(next);
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          style={[styles.btn, !canGoBack && styles.btnDisabled]}
          onPress={() => step(-1)}
          disabled={!canGoBack}
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{formatKey(value)}</Text>
        <Pressable style={styles.btn} onPress={() => step(1)}>
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.presets}>
        <Preset label="Today" onPress={() => onChange(todayKey())} />
        <Preset label="+1 wk" onPress={() => onChange(addDaysKey(todayKey(), 7))} />
        <Preset label="+1 mo" onPress={() => onChange(addDaysKey(todayKey(), 30))} />
      </View>
    </View>
  );
}

function Preset({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.preset} onPress={onPress}>
      <Text style={styles.presetText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.white, fontSize: 22, fontWeight: '700' },
  value: { fontSize: 15, fontWeight: '600', color: colors.text },
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  presetText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
});
