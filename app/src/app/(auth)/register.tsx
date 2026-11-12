/** CREATE ACCOUNT screen. POPIA consent is required; next the Matches tab asks for the profile. */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ApiError, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, font, spacing } from '../../lib/theme';
import { Banner, Button, Field } from '../../components/ui';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) e.password = 'At least 8 characters with a letter and a number';
    if (!consent) e.consent = 'Please accept the privacy notice to continue';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, consent });
      if (router.canDismiss()) router.dismissAll();
      router.replace('/'); // Matches tab asks for the profile next
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.details)) if (v?.length) mapped[k] = v[0];
        setErrors(mapped);
      }
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 64 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>Free for everyone. Next, three quick questions to find your matches.</Text>
        {error ? <Banner message={error} /> : null}
        <Field label="Full name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" testID="reg-name" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={errors.email} autoComplete="email" testID="reg-email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry error={errors.password} hint="At least 8 characters with a letter and a number" testID="reg-password" />
        <View style={styles.consent}>
          <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.primary }} accessibilityLabel="Accept privacy notice" />
          <Text style={styles.consentText}>
            I agree that AgriOpportunity may store my details to match me to opportunities and send closing-date reminders (POPIA). I can delete my account at any time.
          </Text>
        </View>
        {errors.consent ? <Text style={styles.error}>{errors.consent}</Text> : null}
        <Button title="Create account" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} testID="register-submit" />
        <Button title="Already have an account? Sign in" variant="ghost" onPress={() => router.replace('/login')} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: font.body, color: colors.muted, marginBottom: spacing.lg },
  consent: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  consentText: { flex: 1, fontSize: font.small, color: colors.text },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.xs },
});
