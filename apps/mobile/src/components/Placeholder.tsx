import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

/** Stub for tabs landing in later branches (Shifts, Swaps, Training). */
export function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.blurb}>{blurb}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  blurb: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
