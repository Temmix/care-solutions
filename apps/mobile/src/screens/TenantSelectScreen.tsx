import React, { useState } from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing } from '../theme';

export default function TenantSelectScreen() {
  const { memberships, selectTenant, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const choose = async (organizationId: string) => {
    setBusy(true);
    try {
      await selectTenant(organizationId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Choose an organisation</Text>
      {memberships.map((m) => (
        <Pressable
          key={m.organizationId}
          style={styles.card}
          onPress={() => choose(m.organizationId)}
          disabled={busy}
        >
          <Text style={styles.orgName}>{m.organization.name}</Text>
          <Text style={styles.orgRole}>{m.role}</Text>
        </Pressable>
      ))}
      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orgName: { fontSize: 17, fontWeight: '600', color: colors.text },
  orgRole: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  logout: { padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  logoutText: { color: colors.danger, fontWeight: '600' },
});
