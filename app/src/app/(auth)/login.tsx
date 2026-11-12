/** SIGN IN screen. Demo accounts are listed at the bottom. */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, font, spacing } from '../../lib/theme';
import { Banner, Button, Field } from '../../components/ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (router.canDismiss()) router.dismissAll();
      router.replace(user.role === 'admin' ? '/manage' : '/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Ionicons name="sparkles" size={40} color={colors.white} />
        </View>
        <Text style={styles.title}>AgriOpportunity</Text>
        <Text style={styles.subtitle}>Agri bursaries, internships and jobs matched to you.</Text>

        {error ? <Banner message={error} /> : null}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" testID="login-email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Your password" testID="login-password" />
        <Button title="Sign in" onPress={submit} loading={loading} testID="login-submit" />
        <Button title="New here? Create an account" variant="ghost" onPress={() => router.replace('/register')} style={{ marginTop: spacing.md }} />

        <View style={styles.demo}>
          <Text style={styles.demoTitle}>Demo accounts (synthetic)</Text>
          <Text style={styles.demoText}>Youth: lerato@agriopportunity.test / Youth@1234</Text>
          <Text style={styles.demoText}>New youth: thabo@agriopportunity.test / Youth@1234</Text>
          <Text style={styles.demoText}>Admin: admin@agriopportunity.test / Admin@1234</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingTop: spacing.xxl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: { fontSize: font.h1, fontWeight: '800', textAlign: 'center', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: font.body, color: colors.muted, textAlign: 'center', marginBottom: spacing.xl },
  demo: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.primarySoft, borderRadius: 12 },
  demoTitle: { fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  demoText: { fontSize: font.small, color: colors.text },
});
