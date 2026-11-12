/** SAVED tab: my saved opportunities with their reminder dates. Works offline using the last copy. */
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { loadOfflineCopy, saveOfflineCopy } from '../../lib/offline';
import { formatDate } from '../../lib/format';
import { colors, font, spacing } from '../../lib/theme';
import type { Alert as AlertT, Opportunity } from '../../lib/types';
import { OpportunityCard } from '../../components/OpportunityCard';
import { Banner, Button, EmptyState, Loading } from '../../components/ui';

interface SavedBundle {
  items: Opportunity[];
  upcoming: AlertT[];
  due: AlertT[];
}

export default function SavedScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<SavedBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!user) return;
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const key = `saved:${user.id}`;
      try {
        const saved = await api<{ items: Opportunity[] }>('/me/saved');
        const alerts = await api<{ due: AlertT[]; upcoming: AlertT[] }>('/me/alerts');
        const bundle = { items: saved.items, due: alerts.due, upcoming: alerts.upcoming };
        setData(bundle);
        setOfflineAt(null);
        await saveOfflineCopy(key, bundle); // keep a copy on the phone
      } catch (err) {
        // No signal? Show the copy from the last time it worked.
        const copy = await loadOfflineCopy<SavedBundle>(key);
        if (copy) {
          setData(copy.value);
          setOfflineAt(copy.savedAt);
        } else {
          setError(errorMessage(err));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!user) {
    return <EmptyState icon="bookmark-outline" title="Sign in to save opportunities" message="Saved items work offline and remind you before they close." action={<Button title="Sign in" onPress={() => router.push('/login')} />} />;
  }

  const alertFor = (id: string) => [...(data?.due ?? []), ...(data?.upcoming ?? [])].find((a) => a.opportunityId === id);

  return (
    <FlatList
      data={loading ? [] : (data?.items ?? [])}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
      ListHeaderComponent={
        <View>
          {offlineAt ? <Banner kind="warning" message={`Offline - saved list from ${new Date(offlineAt).toLocaleString('en-ZA')}`} /> : null}
          {error ? <Banner message={error} /> : null}
          {data?.due.length ? <Banner kind="error" message={`${data.due.length} saved opportunit${data.due.length === 1 ? 'y closes' : 'ies close'} soon. Apply now.`} /> : null}
        </View>
      }
      renderItem={({ item }) => {
        const a = alertFor(item.id);
        return (
          <View>
            <OpportunityCard item={item} />
            {a ? (
              <Text style={styles.reminder}>
                Reminder {a.daysBefore} day{a.daysBefore === 1 ? '' : 's'} before · {formatDate(a.remindOn)}
              </Text>
            ) : null}
          </View>
        );
      }}
      ListEmptyComponent={
        loading ? (
          <Loading />
        ) : (
          <EmptyState icon="bookmark-outline" title="Nothing saved yet" message="Tap Save on an opportunity to keep it here and get a closing-date reminder." />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  reminder: { fontSize: font.small, color: colors.muted, marginTop: -spacing.sm, marginBottom: spacing.md, marginLeft: spacing.sm },
});
