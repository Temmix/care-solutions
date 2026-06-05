import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import AvailabilityView from './AvailabilityView';
import SwapsView from './SwapsView';

type Tab = 'availability' | 'swaps';

export default function SwapsScreen() {
  const [tab, setTab] = useState<Tab>('availability');

  return (
    <View style={styles.container}>
      <View style={styles.segmented}>
        <Segment
          label="Availability"
          active={tab === 'availability'}
          onPress={() => setTab('availability')}
        />
        <Segment label="Swaps" active={tab === 'swaps'} onPress={() => setTab('swaps')} />
      </View>
      {tab === 'availability' ? <AvailabilityView /> : <SwapsView />}
    </View>
  );
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segment, active && styles.segmentActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  segmented: {
    flexDirection: 'row',
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.border,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: colors.primary },
});
