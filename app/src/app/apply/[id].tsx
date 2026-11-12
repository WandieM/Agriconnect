/** APPLY screen: the short in-app application (motivation + phone) for opportunities without their own website. */
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, font, spacing } from '../../lib/theme';
import { Banner, Button, Field } from '../../components/ui';

export default function ApplyScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { user } = useAuth();
  const [motivation, setMotivation] = useState('');
  const [phone, setPhone] = useState(user?.profile?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setError(null);
    if (motivation.trim().length < 20) return setError('Tell them why you are a good fit (at least 20 characters).');
    setSending(true);
    try {
      await api(`/opportunities/${id}/apply`, { method: 'POST', body: { motivation: motivation.trim(), phone: phone.trim() || undefined } });
      Alert.alert('Application sent', 'The organisation will contact you by email or phone.');
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.sub}>
          Applying as {user?.name} ({user?.email})
        </Text>
        {error ? <Banner message={error} /> : null}
        <Field
          label="Why are you a good fit?"
          value={motivation}
          onChangeText={setMotivation}
          multiline
          placeholder="Your studies, farm or work experience, and what you want to learn"
          maxLength={1500}
          hint={`${motivation.trim().length}/1500`}
          testID="motivation"
        />
        <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title="Send application" icon="send" onPress={submit} loading={sending} testID="apply-submit" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.small, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
});
