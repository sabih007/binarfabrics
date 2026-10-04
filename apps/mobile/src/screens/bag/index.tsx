/* ==========================================================================
   The bag.

   Shows stored lines immediately, then asks `POST /api/orders` to re-price them
   against the database. The totals on screen always come from that quote, so a
   price change or a sold-out item is caught here rather than at checkout. If the
   quote fails the bag still lists its contents, with the error above the total
   and checkout held back until it succeeds.
   ========================================================================== */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuote } from '@/api/hooks';
import { Button } from '@/components/button';
import { FabricSwatch } from '@/components/fabric-swatch';
import { Divider, QuantityStepper, SummaryRow } from '@/components/pieces';
import { EmptyState, InlineError, LoadingState } from '@/components/states';
import { itemKey, useCart, type BagItem } from '@/store/cart';
import { FREE_SHIPPING_AT, colors, money, space, type as typography } from '@/theme';

export function Bag() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, hydrated, lines, setQty, remove, estimatedSubtotal } = useCart();
  const quote = useQuote(lines);

  // Reading the saved bag takes a moment; showing "empty" first would be a lie.
  if (!hydrated) return <LoadingState />;

  if (!items.length) {
    return (
      <EmptyState
        title="Your bag is empty"
        body="Browse the collection and add a design to get started."
        action={{ label: 'Shop the collection', onPress: () => router.push('/shop') }}
      />
    );
  }

  const totals = quote.data;
  const shortOfFreeShipping = FREE_SHIPPING_AT - (totals?.subtotal ?? estimatedSubtotal);

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <BagLine
            key={itemKey(item)}
            item={item}
            onQty={(qty) => setQty(itemKey(item), qty)}
            onRemove={() => remove(itemKey(item))}
          />
        ))}

        <View style={styles.summary}>
          {quote.error ? <InlineError error={quote.error} onRetry={() => quote.refetch()} /> : null}

          <SummaryRow
            label="Subtotal"
            value={money(totals?.subtotal ?? estimatedSubtotal)}
            hint={totals ? undefined : 'Confirming prices…'}
          />
          <SummaryRow
            label="Delivery"
            value={totals ? (totals.shipping ? money(totals.shipping) : 'Free') : '—'}
            hint={
              totals && totals.shipping > 0 && shortOfFreeShipping > 0
                ? `Add ${money(shortOfFreeShipping)} for free delivery`
                : undefined
            }
          />
          {totals?.discount ? (
            <SummaryRow label="Discount" value={`− ${money(totals.discount)}`} />
          ) : null}
          <Divider style={styles.rule} />
          <SummaryRow label="Total" value={totals ? money(totals.total) : '—'} strong />
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.sm }]}>
        <Button
          label={totals ? `Checkout · ${money(totals.total)}` : 'Checkout'}
          size="lg"
          busy={quote.isLoading}
          // Without a server quote there is no authoritative total to charge.
          disabled={!totals}
          onPress={() => router.push('/checkout')}
        />
      </View>
    </>
  );
}

function BagLine({
  item,
  onQty,
  onRemove,
}: {
  item: BagItem;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const hasVariant = Boolean(item.size || item.color);

  return (
    <View style={styles.line}>
      <View style={styles.lineMedia}>
        <FabricSwatch
          pattern={item.pattern}
          colors={item.colors}
          image={item.image}
          rounded={false}
        />
      </View>

      <View style={styles.lineBody}>
        <Text style={typography.eyebrow} numberOfLines={1}>
          {[item.categoryName, item.fabric].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.lineName} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.lineVariant}>
          {item.size ? <Text style={typography.small}>Size {item.size}</Text> : null}
          {item.color ? (
            <View style={styles.swatchRow}>
              {/* The stored colour is a hex value, so show it rather than print it. */}
              <View style={[styles.swatchDot, { backgroundColor: item.color }]} />
              <Text style={typography.small}>Colour</Text>
            </View>
          ) : null}
          {!hasVariant ? <Text style={typography.small}>One size</Text> : null}
        </View>

        <View style={styles.lineFooter}>
          <QuantityStepper value={item.qty} onChange={onQty} />
          <Text style={styles.linePrice}>{money(item.price * item.qty)}</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={8}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.md, backgroundColor: colors.paper },
  line: {
    flexDirection: 'row',
    gap: space.md,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  lineMedia: { width: 92, aspectRatio: 3 / 4, overflow: 'hidden', backgroundColor: colors.cream2 },
  lineBody: { flex: 1, gap: space.xs },
  lineName: { ...typography.heading, fontSize: 16 },
  lineVariant: { flexDirection: 'row', gap: space.md, alignItems: 'center', flexWrap: 'wrap' },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  lineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  linePrice: { ...typography.body, fontWeight: '700' },
  removeText: { ...typography.small, color: colors.ink3, textDecorationLine: 'underline' },
  summary: { gap: 2, paddingTop: space.sm },
  rule: { marginVertical: space.sm },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    backgroundColor: colors.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
