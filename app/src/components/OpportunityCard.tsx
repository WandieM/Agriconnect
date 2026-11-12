/** One opportunity in a list: type icon, title, organisation, closing badge and match badge. */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { closingLabel } from '../lib/format';
import { colors, font, radius, spacing } from '../lib/theme';
import type { Opportunity } from '../lib/types';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  bursary: 'school-outline',
  internship: 'briefcase-outline',
  learnership: 'book-outline',
  graduate_placement: 'ribbon-outline',
  programme: 'people-outline',
  job: 'construct-outline',
};

export function MatchBadge({ score, outOf }: { score: number; outOf: number }) {
  const full = score === outOf;
  return (
    <View style={[styles.badge, { backgroundColor: full ? colors.primarySoft : colors.warningSoft }]} accessibilityLabel={`Match ${score} of ${outOf}`}>
      <Ionicons name={full ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={full ? colors.primary : colors.warning} />
      <Text style={[styles.badgeText, { color: full ? colors.primaryDark : colors.warning }]}>{full ? 'Full match' : `${score}/${outOf} match`}</Text>
    </View>
  );
}

export function ClosingBadge({ daysLeft, isOpen }: { daysLeft: number; isOpen: boolean }) {
  const urgent = isOpen && daysLeft <= 3;
  return (
    <View style={[styles.badge, { backgroundColor: !isOpen ? '#EEEEEE' : urgent ? colors.dangerSoft : colors.infoSoft }]}>
      <Ionicons name="time-outline" size={13} color={!isOpen ? colors.muted : urgent ? colors.danger : colors.info} />
      <Text style={[styles.badgeText, { color: !isOpen ? colors.muted : urgent ? colors.danger : colors.info }]}>{closingLabel(daysLeft, isOpen)}</Text>
    </View>
  );
}

export function OpportunityCard({ item, onPress }: { item: Opportunity; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.type.name}: ${item.title}, ${item.organisation}, ${closingLabel(item.daysLeft, item.isOpen)}`}
      onPress={onPress ?? (() => router.push(`/opportunity/${item.id}`))}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.icon}>
        <Ionicons name={TYPE_ICON[item.type.slug] ?? 'leaf-outline'} size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.type}>{item.type.name}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.organisation} · {item.province}
        </Text>
        <View style={styles.badges}>
          <ClosingBadge daysLeft={item.daysLeft} isOpen={item.isOpen} />
          {item.match ? <MatchBadge score={item.match.score} outOf={item.match.outOf} /> : null}
          {item.saved ? <Ionicons name="bookmark" size={16} color={colors.primary} accessibilityLabel="Saved" /> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  icon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  type: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.3 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.small, color: colors.muted },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
