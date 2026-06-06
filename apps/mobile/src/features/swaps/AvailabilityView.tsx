import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { DateStepper, todayKey, formatKey } from '../../components/DateStepper';
import { useAvailability, type NewAvailability } from './useAvailability';
import type { Availability, AvailabilityType } from '../../types';

const TYPES: { value: AvailabilityType; label: string }[] = [
  { value: 'UNAVAILABLE', label: 'Unavailable' },
  { value: 'ANNUAL_LEAVE', label: 'Annual leave' },
  { value: 'SICK_LEAVE', label: 'Sick leave' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'AVAILABLE', label: 'Available' },
];

function typeLabel(t: AvailabilityType): string {
  return TYPES.find((x) => x.value === t)?.label ?? t;
}

function AddForm({
  onSubmit,
  onDone,
}: {
  onSubmit: (input: NewAvailability) => Promise<void>;
  onDone: () => void;
}) {
  const [type, setType] = useState<AvailabilityType>('UNAVAILABLE');
  const [date, setDate] = useState<string>(todayKey());
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState<string>(todayKey());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (hasEnd && endDate < date) {
      Alert.alert('Invalid dates', 'End date cannot be before the start date.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        type,
        date,
        endDate: hasEnd ? endDate : undefined,
        notes: notes.trim() || undefined,
      });
      onDone();
    } catch (err) {
      Alert.alert('Could not save', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Type</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <Pressable
            key={t.value}
            style={[styles.typeChip, type === t.value && styles.typeChipActive]}
            onPress={() => setType(t.value)}
          >
            <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{hasEnd ? 'Start date' : 'Date'}</Text>
      <DateStepper value={date} onChange={setDate} min={todayKey()} />

      <Pressable style={styles.endToggle} onPress={() => setHasEnd((v) => !v)}>
        <Text style={styles.endToggleText}>{hasEnd ? '✓ ' : '+ '}Date range (multiple days)</Text>
      </Pressable>
      {hasEnd && (
        <>
          <Text style={styles.label}>End date</Text>
          <DateStepper value={endDate} onChange={setEndDate} min={date} />
        </>
      )}

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={styles.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. GP appointment"
        placeholderTextColor={colors.muted}
      />

      <View style={styles.formActions}>
        <Pressable style={styles.cancelBtn} onPress={onDone} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.saveBtn} onPress={submit} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Row({ item, onDelete }: { item: Availability; onDelete: (id: string) => void }) {
  const range =
    item.endDate && item.endDate !== item.date
      ? `${formatKey(item.date.slice(0, 10))} → ${formatKey(item.endDate.slice(0, 10))}`
      : formatKey(item.date.slice(0, 10));
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardType}>{typeLabel(item.type)}</Text>
        <Text style={styles.cardDate}>{range}</Text>
        {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
      </View>
      <Pressable
        hitSlop={8}
        onPress={() =>
          Alert.alert('Remove entry?', typeLabel(item.type), [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => onDelete(item.id) },
          ])
        }
      >
        <Text style={styles.remove}>Remove</Text>
      </Pressable>
    </View>
  );
}

export default function AvailabilityView() {
  const { loading, error, items, remove, create, refresh } = useAvailability();
  const [adding, setAdding] = useState(false);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
    >
      {!adding && (
        <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
          <Text style={styles.addBtnText}>+ Add availability</Text>
        </Pressable>
      )}
      {adding && <AddForm onSubmit={create} onDone={() => setAdding(false)} />}

      {error && <Text style={styles.error}>{error}</Text>}
      {!error && items.length === 0 && !adding && (
        <Text style={styles.empty}>No availability entries yet.</Text>
      )}
      {items.map((item) => (
        <Row key={item.id} item={item} onDelete={remove} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.md, gap: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.muted, fontSize: 15, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.danger },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  form: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: spacing.xs },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 13, color: colors.text },
  typeChipTextActive: { color: colors.white, fontWeight: '700' },
  endToggle: { paddingVertical: spacing.xs },
  endToggleText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { color: colors.muted, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveText: { color: colors.white, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardType: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardDate: { fontSize: 14, color: colors.text },
  cardNotes: { fontSize: 13, color: colors.muted },
  remove: { color: colors.danger, fontWeight: '600', fontSize: 13 },
});
