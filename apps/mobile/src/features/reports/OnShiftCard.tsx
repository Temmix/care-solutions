import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing } from '../../theme';
import { useShiftReports } from './useShiftReports';
import { ReportSheet } from './ReportSheet';
import { clearFailed } from './report-queue';
import type { ShiftReport } from '../../types';

function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function categoryLabel(c: string): string {
  return c
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (m) => m.toUpperCase());
}

function ReportRow({ report }: { report: ShiftReport }) {
  const [expanded, setExpanded] = useState(false);
  const name = report.patient
    ? `${report.patient.givenName} ${report.patient.familyName}`
    : 'Patient';
  return (
    <Pressable style={styles.reportRow} onPress={() => setExpanded((e) => !e)}>
      <View style={styles.reportHead}>
        <Text style={styles.reportName}>{name}</Text>
        <Text style={styles.reportMeta}>
          {categoryLabel(report.category)} · {fmtClock(report.recordedAt)}
        </Text>
      </View>
      <Text style={styles.reportContent} numberOfLines={expanded ? undefined : 2}>
        {report.content}
      </Text>
      {!expanded && report.content.length > 80 && (
        <Text style={styles.reportMore}>Tap to read more</Text>
      )}
    </Pressable>
  );
}

/** Shown in the Clock tab only when the worker is on shift within the reporting
 * window (the server returns onShift=false otherwise). */
export function OnShiftCard() {
  const { loading, context, recent, pending, failed, submit, syncNow } = useShiftReports();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading || !context?.onShift) return null;

  const patients = context.patients ?? [];

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>On shift · {context.location?.name ?? 'your location'}</Text>
      <Text style={styles.sub}>
        {patients.length} {patients.length === 1 ? 'person' : 'people'} to report on
        {context.reportingClosesAt
          ? ` · reporting closes ${fmtClock(context.reportingClosesAt)}`
          : ''}
      </Text>

      {pending.length > 0 && (
        <View style={[styles.banner, styles.bannerInfo]}>
          <Text style={styles.bannerText}>
            {pending.length} report{pending.length === 1 ? '' : 's'} waiting to sync.
          </Text>
          <Pressable onPress={syncNow} hitSlop={8}>
            <Text style={styles.bannerAction}>Sync now</Text>
          </Pressable>
        </View>
      )}
      {failed.length > 0 && (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerText}>
            {failed.length} report{failed.length === 1 ? '' : 's'} rejected: {failed[0].error}
          </Text>
          <Pressable onPress={clearFailed} hitSlop={8}>
            <Text style={styles.bannerAction}>Dismiss</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.addBtn} onPress={() => setSheetOpen(true)}>
        <Text style={styles.addBtnText}>+ Add care report</Text>
      </Pressable>

      {recent.length > 0 && (
        <View style={styles.recent}>
          <Text style={styles.recentHeading}>This shift</Text>
          {recent.slice(0, 5).map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </View>
      )}

      <ReportSheet
        visible={sheetOpen}
        patients={patients}
        onSubmit={submit}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  heading: { fontSize: 16, fontWeight: '700', color: colors.primary },
  sub: { fontSize: 13, color: colors.muted },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 8,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  bannerInfo: { backgroundColor: '#e0f2fe' },
  bannerError: { backgroundColor: '#fee2e2' },
  bannerText: { flex: 1, color: colors.text, fontSize: 12 },
  bannerAction: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  addBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  recent: { marginTop: spacing.sm, gap: spacing.xs },
  recentHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportRow: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: spacing.sm,
    gap: 2,
  },
  reportHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportName: { fontSize: 14, fontWeight: '600', color: colors.text },
  reportMeta: { fontSize: 11, color: colors.muted },
  reportContent: { fontSize: 13, color: colors.text },
  reportMore: { fontSize: 11, fontWeight: '600', color: colors.primary, marginTop: 2 },
});
