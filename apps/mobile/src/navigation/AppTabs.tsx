import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ClockScreen from '../features/clock/ClockScreen';
import ShiftsScreen from '../features/shifts/ShiftsScreen';
import SwapsScreen from '../features/swaps/SwapsScreen';
import TrainingScreen from '../features/training/TrainingScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

// Text-glyph tab icons keep the scaffold dependency-free (no icon font wiring).
const icon =
  (glyph: string) =>
  ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
      }}
    >
      <Tab.Screen
        name="Clock"
        component={ClockScreen}
        options={{ title: 'Clock', tabBarIcon: icon('⏱') }}
      />
      <Tab.Screen
        name="Shifts"
        component={ShiftsScreen}
        options={{ title: 'Shifts', tabBarIcon: icon('📅') }}
      />
      <Tab.Screen
        name="Swaps"
        component={SwapsScreen}
        options={{ title: 'Swaps', tabBarIcon: icon('🔁') }}
      />
      <Tab.Screen
        name="Training"
        component={TrainingScreen}
        options={{ title: 'Training', tabBarIcon: icon('🎓') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: icon('👤') }}
      />
    </Tab.Navigator>
  );
}
