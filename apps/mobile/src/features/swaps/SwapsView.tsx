import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { useSwaps } from './useSwaps';
import { useAuth } from '../../auth/AuthContext';
import { formatKey } from '../../components/DateStepper';
import type { SwapRequest, SwapAssignmentRef, MyAssignmentOption } from '../../types';

function shiftSummary(ref: SwapAssignmentRef | null | undefined): string {
  if (!ref) return '—';
  const s = ref.shift;
  return `${formatKey(s.date.slice(0, 10))} · ${s.shiftPattern.name} (${s.shiftPattern.startTime}–${s.shiftPattern.endTime})`;
}

function statusStyle(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'PENDING':
      return { bg: '#fef3c7', fg: colors.warning };
    case 'ACCEPTED':
      return { bg: '#e0f2fe', fg: '#0369a1' };
    case 'APPROVED':
      return { bg: '#dcfce7', fg: colors.success };
    default:
      return { bg: '#e2e8f0', fg: colors.muted };
  }
}

function StatusPill({ status }: { status: string }) {
  const s = statusStyle(status);
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.fg }]}>{status.toLowerCase()}</Text>
    </View>
  );
}

function ShiftPickerModal({
  visible,
  options,
  onPick,
  onClose,
}: {
  visible: boolean;
  options: MyAssignmentOption[];
  onPick: (assignmentId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Choose one of your shifts</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.length === 0 && (
              <Text style={styles.empty}>You have no upcoming shifts to offer.</Text>
            )}
            {options.map((o) => (
              <Pressable
                key={o.assignmentId}
                style={styles.option}
                onPress={() => onPick(o.assignmentId)}
              >
                <Text style={styles.optionText}>{o.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function SwapsView() {
  const { profile } = useAuth();
  const { loading, error, mine, open, myShifts, createOffer, respond, cancel, refresh } =
    useSwaps();
  const [picker, setPicker] = useState<
    { kind: 'create' } | { kind: 'respond'; swapId: string } | null
  >(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (assignmentId: string) => {
    const mode = picker;
    setPicker(null);
    if (!mode) return;
    setBusy(true);
    try {
      if (mode.kind === 'create') await createOffer(assignmentId);
      else await respond(mode.swapId, assignmentId);
    } catch (err) {
      Alert.alert('Swap failed', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onCancel = (swap: SwapRequest) =>
    Alert.alert('Cancel this swap request?', shiftSummary(swap.originalShiftAssignment), [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel(swap.id);
          } catch (err) {
            Alert.alert('Could not cancel', (err as Error).message);
          }
        },
      },
    ]);

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
      <Pressable
        style={[styles.offerBtn, busy && styles.disabled]}
        onPress={() => setPicker({ kind: 'create' })}
        disabled={busy}
      >
        <Text style={styles.offerBtnText}>+ Offer one of my shifts</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>My requests</Text>
      {mine.length === 0 && <Text style={styles.empty}>You haven’t requested any swaps.</Text>}
      {mine.map((swap) => {
        const isRequester = swap.requester.id === profile?.id;
        return (
          <View key={swap.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>{isRequester ? 'Giving away' : 'Responding to'}</Text>
              <StatusPill status={swap.status} />
            </View>
            <Text style={styles.shift}>{shiftSummary(swap.originalShiftAssignment)}</Text>
            {swap.targetShiftAssignment && (
              <Text style={styles.shiftAlt}>
                In return: {shiftSummary(swap.targetShiftAssignment)}
              </Text>
            )}
            {isRequester && swap.status === 'PENDING' && (
              <Pressable style={styles.cancelLink} onPress={() => onCancel(swap)}>
                <Text style={styles.cancelLinkText}>Cancel request</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>Open to claim</Text>
      {open.length === 0 && <Text style={styles.empty}>No open swaps from colleagues.</Text>}
      {open.map((swap) => (
        <View key={swap.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>
              {swap.requester.firstName} {swap.requester.lastName}
            </Text>
            <StatusPill status={swap.status} />
          </View>
          <Text style={styles.shift}>{shiftSummary(swap.originalShiftAssignment)}</Text>
          <Pressable
            style={[styles.respondBtn, busy && styles.disabled]}
            onPress={() => setPicker({ kind: 'respond', swapId: swap.id })}
            disabled={busy}
          >
            <Text style={styles.respondBtnText}>Offer my shift in exchange</Text>
          </Pressable>
        </View>
      ))}

      <ShiftPickerModal
        visible={picker !== null}
        options={myShifts}
        onPick={onPick}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.md, gap: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  error: { color: colors.danger },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: spacing.xs },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  offerBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
  },
  offerBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  shift: { fontSize: 15, color: colors.text },
  shiftAlt: { fontSize: 13, color: colors.muted },
  cancelLink: { paddingTop: spacing.xs },
  cancelLinkText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  respondBtn: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
  },
  respondBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  option: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: 14, color: colors.text },
  modalClose: { padding: spacing.md, alignItems: 'center' },
  modalCloseText: { color: colors.muted, fontWeight: '600' },
});
