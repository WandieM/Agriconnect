/**
 * BROWSE tab: search every open opportunity.
 * Filters: words, type, province, field and "closing in the next 7 days".
 * Each change reloads the list from GET /opportunities.
 */
import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '../../lib/api';
import { useMeta } from '../../lib/meta';
import { colors, font, radius, spacing } from '../../lib/theme';
import type { Opportunity } from '../../lib/types';
import { OpportunityCard } from '../../components/OpportunityCard';
import { Banner, Chip, EmptyState, Loading, SelectField } from '../../components/ui';

export default function BrowseScreen() {
  const meta = useMeta();

  // Filters chosen by the user
  const [words, setWords] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [closingSoon, setClosingSoon] = useState(false);

  // What we got back from the API
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reload whenever a filter changes. The short wait means we don't call the API on every key press.
  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (words.trim()) params.set('q', words.trim());
      if (type) params.set('type', type);
      if (province) params.set('province', province);
      if (field) params.set('field', field);
      if (closingSoon) params.set('closingWithin', '7');

      setLoading(true);
      setError(null);
      try {
        const res = await api<{ items: Opportunity[] }>(`/opportunities?${params.toString()}`);
        setItems(res.items);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [words, type, province, field, closingSoon]);

  const filters = (
    <View>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={words}
          onChangeText={setWords}
          placeholder="Search bursaries, internships..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          accessibilityLabel="Search opportunities"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <Chip label="All types" active={!type} onPress={() => setType(null)} />
        {meta.types.map((t) => (
          <Chip key={t.slug} label={t.name} active={type === t.slug} onPress={() => setType(t.slug)} />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <SelectField label="Province" value={province} allowClear placeholder="All" options={meta.provinces.map((p) => ({ value: p, label: p }))} onChange={setProvince} />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField label="Field" value={field} allowClear placeholder="All" options={meta.fields.map((f) => ({ value: f.slug, label: f.name }))} onChange={setField} />
        </View>
      </View>

      <View style={styles.toggle}>
        <Ionicons name="time-outline" size={18} color={colors.danger} />
        <Text style={styles.toggleText}>Closing in the next 7 days</Text>
        <Switch value={closingSoon} onValueChange={setClosingSoon} trackColor={{ true: colors.primary }} accessibilityLabel="Closing in the next 7 days" />
      </View>

      {error ? <Banner message={error} /> : null}
      {!loading ? <Text style={styles.count}>{items.length} open · soonest closing first</Text> : null}
    </View>
  );

  return (
    <FlatList
      data={loading ? [] : items}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => <OpportunityCard item={item} />}
      ListHeaderComponent={filters}
      ListEmptyComponent={loading ? <Loading /> : <EmptyState icon="search-outline" title="Nothing found" message="Clear a filter or try another word." />}
      contentContainerStyle={{ padding: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  toggleText: { flex: 1, fontSize: font.body, color: colors.text, fontWeight: '500' },
  count: { color: colors.muted, fontSize: font.small, marginBottom: spacing.sm },
});
