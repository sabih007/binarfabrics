/* ==========================================================================
   Small shared pieces: badges, prices, colour dots, chips, section headings
   and the quantity stepper. Each is a few lines on its own and they are always
   used together, so they share a file rather than scattering across ten.
   ========================================================================== */

import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { Badge as BadgeKind, Product } from '@/api/types';
import { colors, money, radius, space, type as typography } from '@/theme';

// ------------------------------------------------------------------- badges

const BADGE_TEXT: Record<NonNullable<BadgeKind>, string> = {
  sale: 'Sale',
  new: 'New',
  low: 'Few left',
};

/**
 * The stock-derived badge, matching `components/ProductCard.tsx` on the web:
 * sold out wins over everything, and "few left" over a stale "new".
 */
export function ProductBadge({ product }: { product: Pick<Product, 'inStock' | 'badge'> }) {
  if (!product.inStock) return <Badge text="Sold out" tone="low" />;
  if (!product.badge) return null;
  return <Badge text={BADGE_TEXT[product.badge]} tone={product.badge} />;
}

export function Badge({
  text,
  tone = 'new',
}: {
  text: string;
  tone?: 'new' | 'sale' | 'low' | 'neutral';
}) {
  const background =
    tone === 'sale' ? colors.sale : tone === 'low' ? colors.ink : tone === 'neutral' ? colors.cream2 : colors.green;
  const color = tone === 'neutral' ? colors.ink2 : colors.paper;

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

// -------------------------------------------------------------------- price

export function Price({
  price,
  oldPrice,
  size = 'md',
}: {
  price: number;
  oldPrice?: number | null;
  size?: 'md' | 'lg';
}) {
  const large = size === 'lg';
  return (
    <View style={styles.priceRow}>
      <Text
        style={[
          styles.price,
          large && styles.priceLarge,
          oldPrice ? { color: colors.sale } : null,
        ]}
      >
        {money(price)}
      </Text>
      {oldPrice ? (
        <Text style={[styles.oldPrice, large && styles.oldPriceLarge]}>{money(oldPrice)}</Text>
      ) : null}
    </View>
  );
}

// --------------------------------------------------------------- colour dots

export function ColorDots({ values, max = 5 }: { values: string[]; max?: number }) {
  if (!values.length) return null;
  const shown = values.slice(0, max);

  return (
    <View style={styles.dots}>
      {shown.map((value) => (
        <View key={value} style={[styles.dot, { backgroundColor: value }]} />
      ))}
      {values.length > shown.length ? (
        <Text style={styles.dotsMore}>+{values.length - shown.length}</Text>
      ) : null}
    </View>
  );
}

/** A selectable colour, used on the product page. */
export function ColorOption({
  value,
  selected,
  onPress,
}: {
  value: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Colour ${value}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.colorOption, selected && styles.colorOptionSelected]}
    >
      <View style={[styles.colorOptionInner, { backgroundColor: value }]} />
    </Pressable>
  );
}

// --------------------------------------------------------------------- chip

export function Chip({
  label,
  selected = false,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
        style,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------- section heading

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={typography.title}>{title}</Text>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// -------------------------------------------------------- quantity stepper

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepper}>
      <StepperButton
        label="−"
        accessibilityLabel="Decrease quantity"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
      />
      <Text style={styles.stepperValue} accessibilityLabel={`Quantity ${value}`}>
        {value}
      </Text>
      <StepperButton
        label="+"
        accessibilityLabel="Increase quantity"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
      />
    </View>
  );
}

function StepperButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepperButton,
        pressed && !disabled && styles.chipPressed,
        disabled && styles.stepperButtonDisabled,
      ]}
    >
      <Text style={styles.stepperButtonText}>{label}</Text>
    </Pressable>
  );
}

// -------------------------------------------------------------------- rules

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

/** A label/value line, as used in order summaries. */
export function SummaryRow({
  label,
  value,
  strong = false,
  hint,
}: {
  label: string;
  value: string;
  strong?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryLabel}>
        <Text style={strong ? styles.summaryStrong : typography.bodyMuted}>{label}</Text>
        {hint ? <Text style={typography.small}>{hint}</Text> : null}
      </View>
      <Text style={strong ? styles.summaryStrong : typography.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  price: { ...typography.body, fontWeight: '600' },
  priceLarge: { fontSize: 20, lineHeight: 26 },
  oldPrice: {
    ...typography.small,
    color: colors.ink3,
    textDecorationLine: 'line-through',
  },
  oldPriceLarge: { fontSize: 15 },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  dotsMore: { ...typography.small, color: colors.ink3, fontSize: 11 },

  colorOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    padding: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: { borderColor: colors.ink },
  colorOptionInner: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },

  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipPressed: { opacity: 0.75 },
  chipText: { ...typography.small, color: colors.ink2 },
  chipTextSelected: { color: colors.paper, fontWeight: '600' },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.md,
  },
  sectionHeadingText: { flex: 1, gap: 2 },
  eyebrow: typography.eyebrow,
  sectionAction: {
    ...typography.small,
    color: colors.green,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  stepperButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  stepperButtonDisabled: { opacity: 0.3 },
  stepperButtonText: { ...typography.body, fontSize: 18 },
  stepperValue: { ...typography.body, minWidth: 28, textAlign: 'center', fontWeight: '600' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: 5,
  },
  summaryLabel: { flex: 1, gap: 1 },
  summaryStrong: { ...typography.body, fontWeight: '700' },
});
