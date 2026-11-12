/** Root of the app: keeps the signed-in user (AuthProvider) and defines the stack of screens. */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.white,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/login" options={{ title: 'Sign in', presentation: 'modal' }} />
            <Stack.Screen name="(auth)/register" options={{ title: 'Create account', presentation: 'modal' }} />
            <Stack.Screen name="opportunity/[id]" options={{ title: 'Opportunity' }} />
            <Stack.Screen name="apply/[id]" options={{ title: 'Apply' }} />
            <Stack.Screen name="admin/edit" options={{ title: 'Opportunity' }} />
          </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
