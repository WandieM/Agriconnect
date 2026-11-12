/** Small reusable building blocks: Button, Field (text input), SelectField (dropdown), Chip, Card, Banner, EmptyState, Loading. */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing, TOUCH } from '../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const bg = { primary: colors.primary, secondary: colors.primarySoft, ghost: 'transparent', danger: colors.danger }[variant];
  const fg = { primary: colors.white, secondary: colors.primaryDark, ghost: colors.primary, danger: colors.white }[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: spacing.sm }} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, error ? { borderColor: colors.danger } : null, props.style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose...',
  error,
  allowClear,
}: {
  label: string;
  value: T | null | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T | null) => void;
  placeholder?: string;
  error?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={[styles.input, styles.select, error ? { borderColor: colors.danger } : null]}
      >
        <Text style={{ color: selected ? colors.text : colors.muted, fontSize: font.body }}>{selected?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <FlatList
            data={allowClear ? [{ value: null as unknown as T, label: 'Any' }, ...options] : options}
            keyExtractor={(o) => String(o.value)}
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  onChange(item.value ?? null);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{item.label}</Text>
                {item.value === value || (item.value === null && value == null && allowClear) ? (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({ icon, title, message, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; message?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={colors.border} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function Banner({ kind = 'error', message }: { kind?: 'error' | 'info' | 'warning'; message: string }) {
  const s = {
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as const },
    info: { bg: colors.infoSoft, fg: colors.info, icon: 'information-circle' as const },
    warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'cloud-offline' as const },
  }[kind];
  return (
    <View style={[styles.banner, { backgroundColor: s.bg }]} accessibilityRole="alert">
      <Ionicons name={s.icon} size={18} color={s.fg} />
      <Text style={[styles.bannerText, { color: s.fg }]}>{message}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: font.body, fontWeight: '600' },
  field: { marginBottom: spacing.lg },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    minHeight: TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    fontSize: font.body,
    color: colors.text,
  },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.xs },
  hint: { color: colors.muted, fontSize: font.small, marginTop: spacing.xs },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '60%',
  },
  sheetTitle: { fontSize: font.h3, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  option: {
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: font.body, color: colors.text },
  chip: {
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  chipText: { fontSize: font.small, color: colors.text, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, gap: 4, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, flex: 1 },
  emptyTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  emptyMsg: { fontSize: font.body, color: colors.muted, marginTop: spacing.xs, textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, gap: spacing.sm, marginBottom: spacing.md },
  bannerText: { flex: 1, fontSize: font.small, fontWeight: '500' },
});
