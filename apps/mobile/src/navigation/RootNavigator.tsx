import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { usePushRegistration } from '../push/usePushRegistration';
import LoginScreen from '../screens/LoginScreen';
import TenantSelectScreen from '../screens/TenantSelectScreen';
import AppTabs from './AppTabs';
import { colors } from '../theme';

export default function RootNavigator() {
  const { status } = useAuth();
  usePushRegistration(status === 'authenticated');

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? (
        <AppTabs />
      ) : status === 'needs-tenant' ? (
        <TenantSelectScreen />
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
