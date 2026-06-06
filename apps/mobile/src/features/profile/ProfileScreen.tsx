import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { colors, spacing } from '../../theme';

export default function ProfileScreen() {
  const { profile, memberships, tenantId, logout } = useAuth();
  const org = memberships.find((m) => m.organizationId === tenantId)?.organization;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {profile ? `${profile.firstName} ${profile.lastName}` : '—'}
        </Text>
        <Text style={styles.detail}>{profile?.email}</Text>
        <Text style={styles.detail}>Role: {profile?.role}</Text>
        {org && <Text style={styles.detail}>Organisation: {org.name}</Text>}
      </View>

      <Pressable style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md, gap: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  detail: { fontSize: 14, color: colors.muted },
  logout: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
});
