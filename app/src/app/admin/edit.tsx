/** ADD / EDIT OPPORTUNITY (admin). With ?id= it edits an existing one and offers Expire now. */
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { api, ApiError, errorMessage } from '../../lib/api';
import { useMeta } from '../../lib/meta';
import { colors, font, spacing } from '../../lib/theme';
import type { Opportunity } from '../../lib/types';
import { Banner, Button, Field, Loading, SelectField } from '../../components/ui';

const inDays = (n: number) => new Date(Date.now() + 2 * 3600e3 + n * 864e5).toISOString().slice(0, 10);

export default function EditOpportunityScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const meta = useMeta();
  const [loaded, setLoaded] = useState(!id);
  const [existing, setExisting] = useState<Opportunity | null>(null);
  const [v, setV] = useState({
    title: '',
    type: null as string | null,
    organisation: '',
    description: '',
    field: 'any' as string | null,
    province: 'National' as string | null,
    minLevel: 1 as number | null,
    stipend: '',
    closingDate: inDays(30),
    applyMethod: 'form' as string | null,
    applyUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<{ opportunity: Opportunity }>(`/opportunities/${id}`)
      .then(({ opportunity: o }) => {
        setExisting(o);
        setV({
          title: o.title,
          type: o.type.slug,
          organisation: o.organisation,
          description: o.description,
          field: o.field.slug,
          province: o.province,
          minLevel: o.minLevel.level,
          stipend: o.stipend ?? '',
          closingDate: o.closingDate,
          applyMethod: o.applyMethod,
          applyUrl: o.applyUrl ?? '',
        });
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoaded(true));
  }, [id]);

  const set = (k: keyof typeof v) => (val: string | number | null) => setV((s) => ({ ...s, [k]: val }));

  const submit = async () => {
    setError(null);
    const e: Record<string, string> = {};
    if (v.title.trim().length < 5) e.title = 'At least 5 characters';
    if (!v.type) e.type = 'Choose a type';
    if (v.organisation.trim().length < 2) e.organisation = 'Who is offering it?';
    if (v.description.trim().length < 20) e.description = 'At least 20 characters';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.closingDate)) e.closingDate = 'Use YYYY-MM-DD';
    if (v.applyMethod === 'link' && !/^https?:\/\//.test(v.applyUrl.trim())) e.applyUrl = 'Enter the full link, starting with https://';
    setErrors(e);
    if (Object.keys(e).length) return;
    const body = {
      title: v.title.trim(),
      type: v.type,
      organisation: v.organisation.trim(),
      description: v.description.trim(),
      field: v.field,
      province: v.province,
      minLevel: v.minLevel ?? 0,
      stipend: v.stipend.trim() || null,
      closingDate: v.closingDate,
      applyMethod: v.applyMethod,
      applyUrl: v.applyMethod === 'link' ? v.applyUrl.trim() : null,
    };
    setSaving(true);
    try {
      if (id) await api(`/admin/opportunities/${id}`, { method: 'PATCH', body });
      else await api('/admin/opportunities', { method: 'POST', body });
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const mapped: Record<string, string> = {};
        for (const [k, val] of Object.entries(err.details)) if (val?.length) mapped[k] = val[0];
        setErrors(mapped);
      }
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const expire = () =>
    Alert.alert('Expire now?', 'It disappears from search and matches. Saved reminders stop.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Expire',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/admin/opportunities/${id}/expire`, { method: 'PATCH' });
            router.back();
          } catch (err) {
            setError(errorMessage(err));
          }
        },
      },
    ]);

  if (!loaded) return <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Edit opportunity' : 'New opportunity' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 64 }} keyboardShouldPersistTaps="handled">
        {error ? <Banner message={error} /> : null}
        {existing && !existing.isOpen ? <Banner kind="warning" message="This opportunity is closed. Set a new closing date and status to reopen it." /> : null}
        <Field label="Title" value={v.title} onChangeText={set('title')} error={errors.title} maxLength={140} />
        <SelectField label="Type" value={v.type} options={meta.types.map((t) => ({ value: t.slug, label: t.name }))} onChange={set('type')} error={errors.type} />
        <Field label="Organisation" value={v.organisation} onChangeText={set('organisation')} error={errors.organisation} />
        <Field label="Description" value={v.description} onChangeText={set('description')} multiline error={errors.description} maxLength={3000} />
        <SelectField
          label="Field"
          value={v.field}
          options={[{ value: 'any', label: 'Any field' }, ...meta.fields.map((f) => ({ value: f.slug, label: f.name }))]}
          onChange={set('field')}
        />
        <SelectField
          label="Province"
          value={v.province}
          options={[{ value: 'National', label: 'National (all provinces)' }, ...meta.provinces.map((p) => ({ value: p, label: p }))]}
          onChange={set('province')}
        />
        <SelectField label="Minimum qualification" value={v.minLevel} options={meta.levels.map((l) => ({ value: l.level, label: l.name }))} onChange={set('minLevel')} />
        <Field label="Value / stipend (optional)" value={v.stipend} onChangeText={set('stipend')} placeholder="e.g. R6 500 per month" />
        <Field label="Closing date (YYYY-MM-DD)" value={v.closingDate} onChangeText={set('closingDate')} error={errors.closingDate} autoCapitalize="none" />
        <SelectField
          label="How to apply"
          value={v.applyMethod}
          options={[
            { value: 'form', label: 'Simple form in the app' },
            { value: 'link', label: 'Link to their website' },
          ]}
          onChange={set('applyMethod')}
        />
        {v.applyMethod === 'link' ? (
          <Field label="Apply link" value={v.applyUrl} onChangeText={set('applyUrl')} autoCapitalize="none" keyboardType="url" error={errors.applyUrl} placeholder="https://" />
        ) : null}
        <Button title={id ? 'Save changes' : 'Publish opportunity'} onPress={submit} loading={saving} testID="opp-submit" />
        {id && existing?.isOpen ? (
          <View style={{ marginTop: spacing.md }}>
            <Button title="Expire now" variant="danger" onPress={expire} />
            <Text style={styles.note}>Opportunities also close automatically after their closing date.</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: font.small, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
});
