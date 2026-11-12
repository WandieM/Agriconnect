/** MANAGE tab (admins only): numbers at the top, Add opportunity, and the open / closed lists. Tap one to edit it. */
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, font, spacing } from '../../lib/theme';
import type { Opportunity } from '../../lib/types';
import { OpportunityCard } from '../../components/OpportunityCard';
import { Banner, Button, Chip, EmptyState, Loading } from '../../components/ui';

interface Stats {
  youth: number;
  profiles: number;
  openOpportunities: number;
  closingThisWeek: number;
  saves: number;
  applications: number;
}

export default function ManageScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [items, setItems] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const [l, s] = await Promise.all([api<{ items: Opportunity[] }>(`/admin/opportunities?status=${status}`), api<Stats>('/admin/stats')]);
        setItems(l.items);
        setStats(s);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status],
  );

  useFocusEffect(
    useCallback(() => {
      if (user?.role === 'admin') load();
    }, [load, user?.role]),
  );

  if (user?.role !== 'admin') return <EmptyState icon="lock-closed-outline" title="Admins only" />;

  return (
    <FlatList
      data={loading ? [] : items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
      ListHeaderComponent={
        <View>
          {error ? <Banner message={error} /> : null}
          {stats ? (
            <View style={styles.stats}>
              <Stat label="Open" value={stats.openOpportunities} />
              <Stat label="Closing this week" value={stats.closingThisWeek} highlight />
              <Stat label="Youth with profiles" value={stats.profiles} />
              <Stat label="Saves · applications" value={`${stats.saves} · ${stats.applications}`} />
            </View>
          ) : null}
          <Button title="Add opportunity" icon="add-circle" onPress={() => router.push('/admin/edit')} style={{ marginBottom: spacing.md }} testID="add-opportunity" />
          <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
            <Chip label="Open" active={status === 'open'} onPress={() => setStatus('open')} />
            <Chip label="Closed / expired" active={status === 'closed'} onPress={() => setStatus('closed')} />
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View>
          <OpportunityCard item={item} onPress={() => router.push({ pathname: '/admin/edit', params: { id: item.id } })} />
          <Text style={styles.counts}>
            {item.saves ?? 0} saved · {item.applications ?? 0} applied
          </Text>
        </View>
      )}
      ListEmptyComponent={loading ? <Loading /> : <EmptyState icon="documents-outline" title="Nothing here" />}
    />
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <View style={[styles.stat, highlight && { backgroundColor: colors.warningSoft, borderColor: colors.accent }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.small, color: colors.muted },
  counts: { fontSize: font.small, color: colors.muted, marginTop: -spacing.sm, marginBottom: spacing.md, marginLeft: spacing.sm },
});
