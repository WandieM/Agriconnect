/** PROFILE tab: account details, the matching profile form, privacy notice, sign out, delete account. */
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { api, API_URL, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, font, spacing } from '../../lib/theme';
import { Button, Card } from '../../components/ui';
import { ProfileForm } from '../../components/ProfileForm';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const deleteAccount = () =>
    Alert.alert('Delete your account?', 'Your profile, saved items, reminders and applications will be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/auth/me', { method: 'DELETE' });
            await logout();
          } catch (err) {
            Alert.alert('Could not delete', errorMessage(err));
          }
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      {user ? (
        <>
          <Card>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.meta}>{user.email}</Text>
                <Text style={styles.meta}>{user.role === 'admin' ? 'Programme admin' : 'Youth account'}</Text>
              </View>
            </View>
          </Card>
          {user.role === 'youth' ? (
            <Card>
              <Text style={styles.h}>Matching profile</Text>
              <Text style={[styles.meta, { marginBottom: spacing.md }]}>These three answers decide your matches.</Text>
              <ProfileForm />
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <Text style={styles.name}>Welcome to AgriOpportunity</Text>
          <Text style={[styles.meta, { marginBottom: spacing.lg }]}>Sign in to see matches, save opportunities and get closing-date reminders.</Text>
          <Button title="Sign in" onPress={() => router.push('/login')} />
          <Button title="Create account" variant="secondary" onPress={() => router.push('/register')} style={{ marginTop: spacing.sm }} />
        </Card>
      )}

      <Card>
        <Text style={styles.h}>Privacy (POPIA)</Text>
        <Text style={styles.meta}>
          We store your name, email, field, province, qualification level and optional phone to match you to opportunities. We never sell your data, and you can delete
          your account at any time.
        </Text>
      </Card>

      {user ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            title="Sign out"
            variant="ghost"
            icon="log-out-outline"
            onPress={() =>
              Alert.alert('Sign out?', '', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => logout() },
              ])
            }
          />
          {user.role === 'youth' ? <Button title="Delete my account" variant="ghost" onPress={deleteAccount} /> : null}
        </View>
      ) : null}

      <Text style={styles.footer}>
        AgriOpportunity v{Constants.expoConfig?.version ?? '1.0.0'} · AgriConnect 360 (A4){'\n'}API: {API_URL}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  h: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.small, color: colors.muted, marginTop: 2 },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: spacing.xl },
});
