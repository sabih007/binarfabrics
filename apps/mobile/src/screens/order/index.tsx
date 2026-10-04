/* ==========================================================================
   Order detail — the receipt after checkout and the result of a tracking
   lookup, which are the same page.

   The order number is sequential and therefore guessable, so the API treats the
   phone number on the order as the shared secret and answers an indistinguish-
   able 404 without it. The phone is passed along in the route params and never
   stored.

   A card order arrives here `PENDING / UNPAID` because the Stripe webhook, not
   the app, confirms payment — so while that is outstanding the screen keeps
   polling for a short while instead of calling the order failed.
   ========================================================================== */

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTrackOrder } from '@/api/hooks';
import type { OrderStatus, PaymentStatus } from '@/api/types';
import { Button } from '@/components/button';
import { Badge, Divider, SummaryRow } from '@/components/pieces';
import { ErrorState, LoadingState } from '@/components/states';
import { colors, money, space, type as typography } from '@/theme';

/** Customer-facing wording for each stage, in the order they happen. */
const STATUS_STEPS: { status: OrderStatus; label: string; note: string }[] = [
  { status: 'PENDING', label: 'Placed', note: 'We have your order.' },
  { status: 'CONFIRMED', label: 'Confirmed', note: 'Confirmed over the phone.' },
  { status: 'PROCESSING', label: 'Packing', note: 'Being packed for dispatch.' },
  { status: 'SHIPPED', label: 'On the way', note: 'Handed to the courier.' },
  { status: 'DELIVERED', label: 'Delivered', note: 'Thank you for shopping with us.' },
];

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Payment pending',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  FAILED: 'Payment failed',
};

/** How long to keep checking for a Stripe webhook before giving up quietly. */
const PAYMENT_POLL_ATTEMPTS = 5;
const PAYMENT_POLL_INTERVAL = 4000;

export function OrderScreen({
  number,
  phone,
  justPlaced = false,
}: {
  number: string;
  phone: string;
  justPlaced?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: order, error, isLoading, refetch } = useTrackOrder(number, phone, true);
  const [polls, setPolls] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A card order sits UNPAID until the webhook lands; re-read a few times.
  const awaitingPayment =
    order?.paymentMethod === 'CARD' &&
    order.paymentStatus === 'UNPAID' &&
    order.status !== 'CANCELLED';

  useEffect(() => {
    if (!awaitingPayment || polls >= PAYMENT_POLL_ATTEMPTS) return;
    timer.current = setTimeout(() => {
      setPolls((n) => n + 1);
      refetch();
    }, PAYMENT_POLL_INTERVAL);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [awaitingPayment, polls, refetch]);

  if (isLoading) return <LoadingState label="Fetching your order…" />;
  if (!order) return <ErrorState error={error} onRetry={() => refetch()} />;

  const stepIndex = STATUS_STEPS.findIndex((step) => step.status === order.status);
  const cancelled = order.status === 'CANCELLED';

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {justPlaced && !cancelled ? (
        <View style={styles.hero}>
          <Text style={typography.eyebrow}>Thank you</Text>
          <Text style={typography.title}>Your order is in.</Text>
          <Text style={typography.bodyMuted}>
            We will call {order.phone} to confirm before dispatch.
          </Text>
        </View>
      ) : null}

      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={typography.eyebrow}>Order</Text>
          <Text style={typography.title}>{order.number}</Text>
          <Text style={typography.small}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={styles.headBadges}>
          <Badge
            text={cancelled ? 'Cancelled' : (STATUS_STEPS[stepIndex]?.label ?? order.status)}
            tone={cancelled ? 'sale' : 'new'}
          />
          <Badge
            text={PAYMENT_LABEL[order.paymentStatus]}
            tone={
              order.paymentStatus === 'PAID'
                ? 'new'
                : order.paymentStatus === 'FAILED'
                  ? 'sale'
                  : 'neutral'
            }
          />
        </View>
      </View>

      {awaitingPayment ? (
        <View style={styles.notice}>
          <Text style={typography.small}>
            {polls < PAYMENT_POLL_ATTEMPTS
              ? 'Confirming your card payment…'
              : 'We have not seen the payment yet. If you completed it, it will appear here shortly — otherwise call us and we will switch this order to cash on delivery.'}
          </Text>
        </View>
      ) : null}

      {cancelled ? (
        <View style={styles.notice}>
          <Text style={[typography.small, { color: colors.sale }]}>
            This order was cancelled. Nothing has been charged.
          </Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {STATUS_STEPS.map((step, index) => {
            const done = index <= stepIndex;
            return (
              <View key={step.status} style={styles.step}>
                <View style={[styles.stepDot, done && styles.stepDotDone]} />
                <View style={styles.stepText}>
                  <Text style={[typography.body, done && styles.stepLabelDone]}>{step.label}</Text>
                  {index === stepIndex ? (
                    <Text style={typography.small}>{step.note}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Divider style={styles.rule} />

      <Text style={typography.eyebrow}>Items</Text>
      {order.items.map((item) => (
        <SummaryRow
          key={item.id}
          label={`${item.name} × ${item.qty}`}
          value={money(item.lineTotal)}
          hint={item.size ? `Size ${item.size}` : undefined}
        />
      ))}

      <Divider style={styles.rule} />
      <SummaryRow label="Subtotal" value={money(order.subtotal)} />
      <SummaryRow label="Delivery" value={order.shipping ? money(order.shipping) : 'Free'} />
      {order.discount ? <SummaryRow label="Discount" value={`− ${money(order.discount)}`} /> : null}
      <SummaryRow
        label={order.paymentMethod === 'COD' ? 'Total (cash on delivery)' : 'Total'}
        value={money(order.total)}
        strong
      />

      <Divider style={styles.rule} />

      <Text style={typography.eyebrow}>Delivering to</Text>
      <Text style={typography.body}>{order.customerName}</Text>
      <Text style={typography.bodyMuted}>{order.address}</Text>
      <Text style={typography.bodyMuted}>
        {[order.city, order.postalCode].filter(Boolean).join(' ')}
      </Text>
      <Text style={typography.bodyMuted}>{order.phone}</Text>
      {order.notes ? <Text style={[typography.small, styles.notes]}>“{order.notes}”</Text> : null}

      <Button
        label="Continue shopping"
        variant="outline"
        onPress={() => router.replace('/shop')}
        style={styles.action}
      />
    </ScrollView>
  );
}

/** Used by the header on the receipt; the API sends ISO strings. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.xs, backgroundColor: colors.paper },
  hero: {
    backgroundColor: colors.cream,
    padding: space.md,
    marginBottom: space.md,
    gap: 2,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  headText: { gap: 2 },
  headBadges: { alignItems: 'flex-end', gap: space.xs },
  notice: { backgroundColor: colors.cream, padding: space.md, marginTop: space.sm },
  timeline: { marginTop: space.md, gap: space.sm },
  step: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
    backgroundColor: colors.line,
  },
  stepDotDone: { backgroundColor: colors.green },
  stepText: { flex: 1 },
  stepLabelDone: { fontWeight: '700' },
  rule: { marginVertical: space.md },
  notes: { marginTop: space.sm, fontStyle: 'italic' },
  action: { marginTop: space.xl },
});
