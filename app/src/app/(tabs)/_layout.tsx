/** The bottom tabs. Which tabs show depends on the role: youth see Matches + Saved, admins see Manage. */
import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';
import { Loading } from '../../components/ui';

type IconName = keyof typeof Ionicons.glyphMap;

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Wait for the saved session so role-based tabs are correct from the first render.
  if (loading) return <Loading />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'AgriOpportunity', tabBarLabel: 'Matches', tabBarIcon: icon('sparkles-outline'), href: isAdmin ? null : undefined }} />
      <Tabs.Screen name="browse" options={{ title: 'Browse opportunities', tabBarLabel: 'Browse', tabBarIcon: icon('search') }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarLabel: 'Saved', tabBarIcon: icon('bookmark-outline'), href: isAdmin ? null : undefined }} />
      <Tabs.Screen name="manage" options={{ title: 'Manage opportunities', tabBarLabel: 'Manage', tabBarIcon: icon('create-outline'), href: isAdmin ? undefined : null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: user ? 'Profile' : 'Sign in', tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  );
}
