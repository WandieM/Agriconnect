/** The 3 profile questions (field, province, qualification) + optional phone. Saves with PUT /profile. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useMeta } from '../lib/meta';
import type { Profile } from '../lib/types';
import { Banner, Button, Field, SelectField } from './ui';

/** The three answers that drive matching, plus an optional phone number. */
export function ProfileForm({ onSaved, submitLabel = 'Save profile' }: { onSaved?: (p: Profile) => void; submitLabel?: string }) {
  const { user, refresh } = useAuth();
  const meta = useMeta();
  const p = user?.profile;
  const [field, setField] = useState<string | null>(p?.field ?? null);
  const [province, setProvince] = useState<string | null>(p?.province ?? null);
  const [level, setLevel] = useState<number | null>(p?.level ?? null);
  const [phone, setPhone] = useState(p?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    setError(null);
    setDone(false);
    const e: Record<string, string> = {};
    if (!field) e.field = 'Choose your field';
    if (!province) e.province = 'Choose your province';
    if (level === null) e.level = 'Choose your highest level';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const res = await api<{ profile: Profile }>('/profile', { method: 'PUT', body: { field, province, level, phone: phone.trim() || null } });
      await refresh();
      setDone(true);
      onSaved?.(res.profile);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {error ? <Banner message={error} /> : null}
      {done ? <Banner kind="info" message="Profile saved. Your matches are updated." /> : null}
      <SelectField label="Field of interest" value={field} options={meta.fields.map((f) => ({ value: f.slug, label: f.name }))} onChange={setField} error={errors.field} />
      <SelectField label="Province you live in" value={province} options={meta.provinces.map((x) => ({ value: x, label: x }))} onChange={setProvince} error={errors.province} />
      <SelectField
        label="Highest qualification"
        value={level}
        options={meta.levels.map((l) => ({ value: l.level, label: l.name }))}
        onChange={setLevel}
        error={errors.level}
      />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="072 123 4567" hint="Shared only when you apply through a form" />
      <Button title={submitLabel} onPress={save} loading={saving} testID="profile-save" />
    </View>
  );
}
