/**
 * MATCHES tab (the home screen)
 * - Not signed in: welcome screen with Create account / Sign in / Just browse
 * - Signed in, no profile yet: the 3-question profile form
 * - Signed in with a profile: due alerts (red), "N opportunities match your profile", ranked list
 */
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useMeta } from '../../lib/meta';
import { colors, font, radius, spacing } from '../../lib/theme';
import type { Alert as AlertT, Opportunity } from '../../lib/types';
import { OpportunityCard } from '../../components/OpportunityCard';
import { Banner, Button, Card, EmptyState, Loading } from '../../components/ui';
import { ProfileForm } from '../../components/ProfileForm';

interface MatchesResponse {
  matchCount: number;
  partialCount: number;
  items: Opportunity[];
}

export default function MatchesScreen() {
  const { user } = useAuth();
  const meta = useMeta();
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load my matches and any due closing-date alerts.
  const load = useCallback(
    async (refresh = false) => {
      if (!user?.profile) {
        setLoading(false);
        return; // no profile yet: the profile form is shown instead
      }
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const matches = await api<MatchesResponse>('/opportunities/matches');
        const alertList = await api<{ due: AlertT[] }>('/me/alerts');
        setData(matches);
        setAlerts(alertList.due);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  // Reload every time this tab is opened (e.g. after saving something).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (user?.role === 'admin') return <Redirect href="/manage" />;

  if (!user) {
    return (
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'center' }}>
        <View style={styles.logo}>
          <Ionicons name="sparkles" size={36} color={colors.white} />
        </View>
        <Text style={styles.hero}>Bursaries, internships and jobs in agriculture, matched to you</Text>
        <Text style={styles.heroSub}>Tell us your field, province and qualification once. We show what you qualify for and remind you before it closes.</Text>
        <Button title="Create a free account" onPress={() => router.push('/register')} style={{ marginTop: spacing.xl }} testID="cta-register" />
        <Button title="Sign in" variant="secondary" onPress={() => router.push('/login')} style={{ marginTop: spacing.sm }} />
        <Button title="Just browse" variant="ghost" onPress={() => router.push('/browse')} style={{ marginTop: spacing.sm }} />
      </View>
    );
  }

  if (!user.profile) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Hi {user.name.split(' ')[0]}, let's find your matches</Text>
        <Text style={styles.sub}>Three questions. You can change them later in Profile.</Text>
        <Card>
          <ProfileForm submitLabel="Show my matches" />
        </Card>
      </ScrollView>
    );
  }

  const fieldName = meta.fields.find((f) => f.slug === user.profile!.field)?.name ?? user.profile.field;
  const levelName = meta.levels.find((l) => l.level === user.profile!.level)?.name ?? '';

  return (
    <FlatList
      data={loading ? [] : (data?.items ?? [])}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => <OpportunityCard item={item} />}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
      ListHeaderComponent={
        <View>
          {error ? <Banner message={error} /> : null}
          {alerts.map((a) => (
            <Pressable key={a.id} onPress={() => router.push(`/opportunity/${a.opportunityId}`)} style={styles.alert} accessibilityRole="button" testID="due-alert">
              <Ionicons name="notifications" size={20} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{a.message}</Text>
                <Text style={styles.alertSub}>Closing-date reminder · tap to apply</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.danger} />
            </Pressable>
          ))}
          {data ? (
            <View style={styles.countBox} accessibilityRole="summary">
              <Text style={styles.count} testID="match-count">
                {data.matchCount} {data.matchCount === 1 ? 'opportunity matches' : 'opportunities match'} your profile
              </Text>
              <Text style={styles.countSub}>
                {fieldName} · {user.profile.province} · {levelName}
              </Text>
              {data.partialCount ? <Text style={styles.countSub}>+ {data.partialCount} close matches (2 of 3 checks)</Text> : null}
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Loading />
        ) : (
          <EmptyState
            icon="search-outline"
            title="No matches right now"
            message="New opportunities are added every week. Try Browse, or widen your profile."
            action={<Button title="Browse all" variant="secondary" onPress={() => router.push('/browse')} />}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.lg },
  hero: { fontSize: font.h1, fontWeight: '800', color: colors.text, textAlign: 'center' },
  heroSub: { fontSize: font.body, color: colors.muted, textAlign: 'center', marginTop: spacing.md, lineHeight: 21 },
  h1: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.body, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#F3C2BC',
  },
  alertTitle: { fontSize: font.body, fontWeight: '700', color: colors.danger },
  alertSub: { fontSize: font.small, color: colors.danger },
  countBox: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  count: { fontSize: font.h2, fontWeight: '800', color: colors.white },
  countSub: { fontSize: font.small, color: '#D7EBDD', marginTop: 4 },
});
