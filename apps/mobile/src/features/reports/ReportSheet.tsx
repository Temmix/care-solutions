import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { colors, spacing } from '../../theme';
import type { ShiftContextPatient, ShiftReportCategory, ShiftReportPriority } from '../../types';
import type { NewReport } from './useShiftReports';

const CATEGORIES: { value: ShiftReportCategory; label: string }[] = [
  { value: 'GENERAL_NOTE', label: 'General' },
  { value: 'PERSONAL_CARE', label: 'Personal care' },
  { value: 'NUTRITION_HYDRATION', label: 'Food & fluids' },
  { value: 'CONTINENCE', label: 'Continence' },
  { value: 'MOBILITY', label: 'Mobility' },
  { value: 'MOOD_BEHAVIOUR', label: 'Mood & behaviour' },
  { value: 'SLEEP', label: 'Sleep' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'SAFEGUARDING', label: 'Safeguarding' },
];

const PRIORITIES: { value: ShiftReportPriority; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'CONCERN', label: 'Concern' },
  { value: 'URGENT', label: 'Urgent' },
];

export function ReportSheet({
  visible,
  patients,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  patients: ShiftContextPatient[];
  onSubmit: (input: NewReport) => Promise<void>;
  onClose: () => void;
}) {
  const [patient, setPatient] = useState<ShiftContextPatient | null>(null);
  const [category, setCategory] = useState<ShiftReportCategory>('GENERAL_NOTE');
  const [priority, setPriority] = useState<ShiftReportPriority>('NORMAL');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const formScroll = useRef<ScrollView>(null);
  const notesY = useRef(0);

  // Keyboard avoidance differs by platform inside a Modal:
  //  - iOS: KeyboardAvoidingView / JS offsets are unreliable in a transparent
  //    Modal, so the ScrollView uses the native `automaticallyAdjustKeyboardInsets`.
  //  - Android: that native prop is a no-op, so we measure the keyboard and lift
  //    the sheet ourselves.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const reset = () => {
    setPatient(null);
    setCategory('GENERAL_NOTE');
    setPriority('NORMAL');
    setContent('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!patient || !content.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ patientId: patient.patientId, category, priority, content: content.trim() });
      close();
    } catch (err) {
      Alert.alert('Could not save report', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, keyboardHeight > 0 ? { marginBottom: keyboardHeight } : null]}>
          {!patient ? (
            <>
              <Text style={styles.title}>Who is this report about?</Text>
              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                {patients.length === 0 && (
                  <Text style={styles.empty}>No patients at your location.</Text>
                )}
                {patients.map((p) => (
                  <Pressable key={p.patientId} style={styles.option} onPress={() => setPatient(p)}>
                    <Text style={styles.optionName}>{p.name}</Text>
                    {p.bed && <Text style={styles.optionMeta}>{p.bed}</Text>}
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable style={styles.closeBtn} onPress={close}>
                <Text style={styles.closeText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <ScrollView
              ref={formScroll}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              contentContainerStyle={styles.formBody}
            >
              <Text style={styles.title}>
                Report · {patient.name}
                {patient.bed ? ` (${patient.bed})` : ''}
              </Text>

              <Text style={styles.label}>Category</Text>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.value}
                    style={[styles.chip, category === c.value && styles.chipActive]}
                    onPress={() => setCategory(c.value)}
                  >
                    <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Priority</Text>
              <View style={styles.chips}>
                {PRIORITIES.map((p) => (
                  <Pressable
                    key={p.value}
                    style={[styles.chip, priority === p.value && styles.chipActive]}
                    onPress={() => setPriority(p.value)}
                  >
                    <Text style={[styles.chipText, priority === p.value && styles.chipTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={styles.input}
                value={content}
                onChangeText={setContent}
                placeholder="What happened during the shift…"
                placeholderTextColor={colors.muted}
                multiline
                onLayout={(e) => {
                  notesY.current = e.nativeEvent.layout.y;
                }}
                onFocus={() =>
                  // Bring the notes field (not the buttons below it) to the top of
                  // the visible area so it stays in view while typing.
                  setTimeout(
                    () =>
                      formScroll.current?.scrollTo({
                        y: Math.max(0, notesY.current - 8),
                        animated: true,
                      }),
                    100,
                  )
                }
              />

              <View style={styles.actions}>
                <Pressable
                  style={styles.secondary}
                  onPress={() => setPatient(null)}
                  disabled={saving}
                >
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primary, (!content.trim() || saving) && styles.disabled]}
                  onPress={submit}
                  disabled={!content.trim() || saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryText}>Save report</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.md,
    maxHeight: '88%',
  },
  formBody: { paddingBottom: spacing.lg },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  empty: { color: colors.muted, paddingVertical: spacing.md },
  option: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionName: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionMeta: { fontSize: 13, color: colors.muted },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 140,
    textAlignVertical: 'top',
    marginTop: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: { color: colors.muted, fontWeight: '600' },
  primary: {
    flex: 2,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryText: { color: colors.white, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  closeBtn: { padding: spacing.md, alignItems: 'center' },
  closeText: { color: colors.muted, fontWeight: '600' },
});
