/**
 * OPPORTUNITY DETAIL screen
 * Shows the facts, "Why this matches you" (the 3 checks), and the actions:
 * Apply (link or form), Save with a reminder (1/3/7 days), Add to calendar, Share.
 */
import React, { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, API_URL, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { colors, font, radius, spacing } from '../../lib/theme';
import type { Opportunity } from '../../lib/types';
import { ClosingBadge, MatchBadge } from '../../components/OpportunityCard';
import { Banner, Button, Card, Chip, EmptyState, Loading } from '../../components/ui';

const REMINDER_OPTIONS = [1, 3, 7];

export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ opportunity: Opportunity }>(`/opportunities/${id}`);
      setOpp(res.opportunity);
      if (res.opportunity.alertDaysBefore != null) setDays(res.opportunity.alertDaysBefore);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (error && !opp) return <EmptyState icon="alert-circle-outline" title="Could not open" message={error} />;
  if (!opp) return <Loading />;

  const isYouth = user?.role === 'youth';

  const save = async (d = days) => {
    setBusy(true);
    try {
      const res = await api<{ opportunity: Opportunity }>(`/opportunities/${opp.id}/save`, { method: 'POST', body: { daysBefore: d } });
      setOpp(res.opportunity);
    } catch (err) {
      Alert.alert('Could not save', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const unsave = async () => {
    setBusy(true);
    try {
      await api(`/opportunities/${opp.id}/save`, { method: 'DELETE' });
      setOpp({ ...opp, saved: false, alertDaysBefore: null });
    } catch (err) {
      Alert.alert('Could not remove', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (opp.applyMethod === 'link' && opp.applyUrl) Linking.openURL(opp.applyUrl);
    else router.push({ pathname: '/apply/[id]', params: { id: opp.id, title: opp.title } });
  };

  const share = () =>
    Share.share({
      message: `${opp.type.name}: ${opp.title} (${opp.organisation}). Closes ${formatDate(opp.closingDate)}.${opp.applyUrl ? ` ${opp.applyUrl}` : ''} Found on AgriOpportunity.`,
    });

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
      <Stack.Screen
        options={{
          title: opp.type.name,
          headerRight: () => (
            <Pressable onPress={share} accessibilityLabel="Share opportunity" hitSlop={12}>
              <Ionicons name="share-social-outline" size={22} color={colors.white} />
            </Pressable>
          ),
        }}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm }}>
        <ClosingBadge daysLeft={opp.daysLeft} isOpen={opp.isOpen} />
        {opp.match ? <MatchBadge score={opp.match.score} outOf={opp.match.outOf} /> : null}
      </View>
      <Text style={styles.title}>{opp.title}</Text>
      <Text style={styles.org}>{opp.organisation}</Text>

      <View style={styles.facts}>
        <Fact icon="calendar-outline" label="Closes" value={formatDate(opp.closingDate)} />
        <Fact icon="location-outline" label="Where" value={opp.province} />
        <Fact icon="school-outline" label="Minimum" value={opp.minLevel.name} />
        <Fact icon="leaf-outline" label="Field" value={opp.field.name} />
        {opp.stipend ? <Fact icon="cash-outline" label="Value" value={opp.stipend} /> : null}
      </View>

      {opp.match ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.h}>
            Why this {opp.match.isFullMatch ? 'matches' : 'partly matches'} you ({opp.match.score}/{opp.match.outOf})
          </Text>
          {opp.match.reasons.map((r) => (
            <View key={r.check} style={styles.reason}>
              <Ionicons name={r.ok ? 'checkmark-circle' : 'close-circle'} size={20} color={r.ok ? colors.primary : colors.danger} />
              <Text style={styles.reasonText}>{r.text}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Text style={styles.desc}>{opp.description}</Text>

      {!opp.isOpen ? <Banner kind="warning" message="This opportunity has closed." /> : null}

      {isYouth && opp.isOpen ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {opp.applied ? (
            <Banner kind="info" message="You have applied. Good luck!" />
          ) : (
            <Button title={opp.applyMethod === 'link' ? 'Apply on their website' : 'Apply now'} icon={opp.applyMethod === 'link' ? 'open-outline' : 'send'} onPress={apply} testID="apply" />
          )}
          <Card style={{ marginTop: spacing.sm }}>
            <Text style={styles.h}>{opp.saved ? 'Saved · closing-date reminder' : 'Save and remind me'}</Text>
            <Text style={styles.small}>Remind me this many days before it closes:</Text>
            <View style={{ flexDirection: 'row', marginVertical: spacing.sm }}>
              {REMINDER_OPTIONS.map((d) => (
                <Chip
                  key={d}
                  label={`${d} day${d === 1 ? '' : 's'}`}
                  active={days === d}
                  onPress={() => {
                    setDays(d);
                    if (opp.saved) save(d);
                  }}
                />
              ))}
            </View>
            {opp.saved ? (
              <Button title="Remove from saved" variant="ghost" icon="bookmark" onPress={unsave} loading={busy} />
            ) : (
              <Button title="Save" variant="secondary" icon="bookmark-outline" onPress={() => save()} loading={busy} testID="save" />
            )}
            <Button
              title="Add to my phone calendar"
              variant="ghost"
              icon="calendar-outline"
              style={{ marginTop: spacing.sm }}
              onPress={() => Linking.openURL(`${API_URL}${opp.calendarUrl}?daysBefore=${days}`)}
            />
          </Card>
        </View>
      ) : !user && opp.isOpen ? (
        <Button title="Sign in to save and apply" onPress={() => router.push('/login')} style={{ marginTop: spacing.lg }} />
      ) : null}
    </ScrollView>
  );
}

function Fact({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  org: { fontSize: font.body, color: colors.muted, marginTop: 4 },
  facts: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg, paddingHorizontal: spacing.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  factLabel: { width: 70, fontSize: font.small, color: colors.muted },
  factValue: { flex: 1, fontSize: font.body, color: colors.text, fontWeight: '600' },
  h: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  reasonText: { flex: 1, fontSize: font.body, color: colors.text },
  desc: { fontSize: font.body, color: colors.text, lineHeight: 22, marginTop: spacing.lg },
  small: { fontSize: font.small, color: colors.muted },
});
