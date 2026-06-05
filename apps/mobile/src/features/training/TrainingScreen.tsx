import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors, spacing } from '../../theme';
import {
  useTraining,
  daysUntil,
  isOverdue,
  isExpiringSoon,
  EXPIRING_SOON_DAYS,
} from './useTraining';
import type { TrainingRecord } from '../../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function statusStyle(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'COMPLETED':
      return { bg: '#dcfce7', fg: colors.success };
    case 'IN_PROGRESS':
      return { bg: '#e0f2fe', fg: '#0369a1' };
    case 'EXPIRED':
    case 'OVERDUE':
      return { bg: '#fee2e2', fg: colors.danger };
    case 'SCHEDULED':
    default:
      return { bg: '#e2e8f0', fg: colors.muted };
  }
}

function expiryLabel(record: TrainingRecord): { text: string; color: string } | null {
  if (!record.expiryDate) return null;
  const d = daysUntil(record.expiryDate);
  const date = fmtDate(record.expiryDate);
  if (isOverdue(record)) return { text: `Expired ${date}`, color: colors.danger };
  if (isExpiringSoon(record)) return { text: `Expires ${date} (${d}d)`, color: colors.warning };
  return { text: `Expires ${date}`, color: colors.muted };
}

function TrainingCard({ record }: { record: TrainingRecord }) {
  const [open, setOpen] = useState(false);
  const s = statusStyle(record.status);
  const expiry = expiryLabel(record);
  return (
    <Pressable style={styles.card} onPress={() => setOpen((o) => !o)}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{record.title}</Text>
        <View style={[styles.badge, { backgroundColor: s.bg }]}>
          <Text style={[styles.badgeText, { color: s.fg }]}>
            {record.status.replace('_', ' ').toLowerCase()}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {record.priority === 'MANDATORY' && (
          <View style={[styles.badge, styles.mandatory]}>
            <Text style={styles.mandatoryText}>Mandatory</Text>
          </View>
        )}
        <Text style={styles.category}>{record.category}</Text>
      </View>

      {expiry && <Text style={[styles.expiry, { color: expiry.color }]}>{expiry.text}</Text>}

      {open && (
        <View style={styles.details}>
          {record.provider && <Detail label="Provider" value={record.provider} />}
          {record.completedDate && (
            <Detail label="Completed" value={fmtDate(record.completedDate)} />
          )}
          {record.score != null && <Detail label="Score" value={`${record.score}%`} />}
          {record.notes && <Detail label="Notes" value={record.notes} />}

          {record.certificates.length > 0 && (
            <View style={styles.certBlock}>
              <Text style={styles.certHeading}>Certificates</Text>
              {record.certificates.map((c) => (
                <View key={c.id} style={styles.cert}>
                  <Text style={styles.certName}>{c.name}</Text>
                  <Text style={styles.certMeta}>
                    {c.issuer}
                    {c.certificateNumber ? ` · #${c.certificateNumber}` : ''}
                  </Text>
                  <Text style={styles.certMeta}>
                    Issued {fmtDate(c.issueDate)}
                    {c.expiryDate ? ` · Expires ${fmtDate(c.expiryDate)}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={styles.toggle}>{open ? 'Tap to collapse' : 'Tap for details'}</Text>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

export default function TrainingScreen() {
  const { loading, error, records, overdueCount, expiringCount, refresh } = useTraining();

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
      {overdueCount > 0 && (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerText}>
            {overdueCount} training {overdueCount === 1 ? 'item is' : 'items are'} overdue or
            expired.
          </Text>
        </View>
      )}
      {expiringCount > 0 && (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Text style={styles.bannerText}>
            {expiringCount} {expiringCount === 1 ? 'item expires' : 'items expire'} within{' '}
            {EXPIRING_SOON_DAYS} days.
          </Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {!error && records.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.empty}>No training records.</Text>
        </View>
      )}

      {records.map((record) => (
        <TrainingCard key={record.id} record={record} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.muted, fontSize: 16 },
  error: { color: colors.danger },
  banner: { padding: spacing.md, borderRadius: 10 },
  bannerError: { backgroundColor: '#fee2e2' },
  bannerWarn: { backgroundColor: '#fef3c7' },
  bannerText: { color: colors.text, fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, paddingRight: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  category: { fontSize: 13, color: colors.muted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  mandatory: { backgroundColor: '#fef3c7' },
  mandatoryText: { fontSize: 11, fontWeight: '700', color: colors.warning },
  expiry: { fontSize: 13, fontWeight: '600' },
  details: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  detailRow: { fontSize: 14, color: colors.text },
  detailLabel: { color: colors.muted },
  certBlock: { marginTop: spacing.xs, gap: spacing.sm },
  certHeading: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  cert: { backgroundColor: colors.bg, borderRadius: 8, padding: spacing.sm, gap: 2 },
  certName: { fontSize: 14, fontWeight: '600', color: colors.text },
  certMeta: { fontSize: 12, color: colors.muted },
  toggle: { fontSize: 12, color: colors.primary, marginTop: spacing.xs },
});
