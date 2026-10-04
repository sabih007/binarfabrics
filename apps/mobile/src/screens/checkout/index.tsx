/* ==========================================================================
   Checkout.

   Posts to the same `/api/checkout` the website uses, so an app order is an
   ordinary row in the `Order` table: stock is reserved, the confirmation mail
   goes out, and it appears in /admin alongside every other order.

   Two payment paths, matching the API:
     COD  — the order comes back confirmed and we go straight to the receipt.
     CARD — the API returns a Stripe Checkout URL. We open it in a browser
            session; the Stripe webhook is what actually marks the order paid,
            so afterwards we re-read the order rather than trusting the browser.

   Money is never sent from here. The server re-prices the bag from the
   database, and the total shown comes from its quote.
   ========================================================================== */

import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { trackOrder } from '@/api/endpoints';
import { usePlaceOrder, useQuote, useStoreConfig } from '@/api/hooks';
import type { CheckoutBody, PaymentMethod } from '@/api/types';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Chip, Divider, SummaryRow } from '@/components/pieces';
import { EmptyState, InlineError, LoadingState } from '@/components/states';
import { useCart } from '@/store/cart';
import { colors, money, space, type as typography } from '@/theme';

interface Draft {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
}

const EMPTY_DRAFT: Draft = {
  customerName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  notes: '',
};

export function Checkout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, hydrated, lines, clear } = useCart();
  const quote = useQuote(lines);
  const config = useStoreConfig();
  const placeOrder = usePlaceOrder();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [method, setMethod] = useState<PaymentMethod>('COD');
  const [localErrors, setLocalErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  /** Set while the Stripe browser session is open or being verified. */
  const [payingByCard, setPayingByCard] = useState(false);

  const field = (key: keyof Draft) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (localErrors[key]) setLocalErrors((current) => ({ ...current, [key]: undefined }));
  };

  if (!hydrated) return <LoadingState />;

  if (!items.length) {
    return (
      <EmptyState
        title="Your bag is empty"
        body="Add a design before checking out."
        action={{ label: 'Shop the collection', onPress: () => router.replace('/shop') }}
      />
    );
  }

  // Card is only offered when the store actually has Stripe configured.
  const cardEnabled = config.data?.stripeEnabled === true;
  const totals = quote.data;
  const busy = placeOrder.isPending || payingByCard;

  /** Server-side field errors, merged over the ones caught here. */
  const serverFields = placeOrder.error instanceof ApiError ? placeOrder.error.fields : undefined;
  const errorFor = (key: keyof Draft) => localErrors[key] ?? serverFields?.[key];

  const submit = async () => {
    if (busy || !totals) return;

    const missing = validate(draft);
    if (Object.keys(missing).length) {
      setLocalErrors(missing);
      return;
    }

    const body: CheckoutBody = {
      items: lines,
      customerName: draft.customerName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim() || undefined,
      address: draft.address.trim(),
      city: draft.city.trim(),
      postalCode: draft.postalCode.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      paymentMethod: cardEnabled ? method : 'COD',
    };

    try {
      const result = await placeOrder.mutateAsync(body);

      // --- cash on delivery: already confirmed server-side ----------------
      if (result.payment.provider === 'cod') {
        clear();
        router.replace({
          pathname: '/order/[number]',
          params: { number: result.order.number, phone: body.phone, placed: '1' },
        });
        return;
      }

      // --- card: hand off to Stripe, then re-read the order --------------
      setPayingByCard(true);
      await WebBrowser.openBrowserAsync(result.payment.url, { dismissButtonStyle: 'cancel' });

      // The webhook — not the browser — decides whether this is paid, and it
      // may land a moment after the window closes. Re-read before deciding.
      const latest = await trackOrder(result.order.number, body.phone).catch(() => null);
      if (latest?.paymentStatus === 'PAID') clear();

      router.replace({
        pathname: '/order/[number]',
        params: { number: result.order.number, phone: body.phone, placed: '1' },
      });
    } catch {
      // `placeOrder.error` already holds the message; the draft is untouched so
      // the customer can correct a field and submit again.
    } finally {
      setPayingByCard(false);
    }
  };

  const generalError =
    placeOrder.error instanceof ApiError && !placeOrder.error.fields
      ? placeOrder.error
      : placeOrder.error && !(placeOrder.error instanceof ApiError)
        ? placeOrder.error
        : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={typography.eyebrow}>Delivery details</Text>

        <Field
          label="Full name"
          value={draft.customerName}
          onChangeText={field('customerName')}
          error={errorFor('customerName')}
          placeholder="Your name"
          autoComplete="name"
          textContentType="name"
          editable={!busy}
        />
        <Field
          label="Phone"
          value={draft.phone}
          onChangeText={field('phone')}
          error={errorFor('phone')}
          placeholder="03xx xxx xxxx"
          hint="We confirm every order by phone before dispatch."
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          editable={!busy}
        />
        <Field
          label="Email"
          value={draft.email}
          onChangeText={field('email')}
          error={errorFor('email')}
          placeholder="you@example.com"
          hint="For the order confirmation."
          optional
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!busy}
        />
        <Field
          label="Street address"
          value={draft.address}
          onChangeText={field('address')}
          error={errorFor('address')}
          placeholder="House, street, area"
          multiline
          numberOfLines={3}
          style={styles.multiline}
          autoComplete="street-address"
          editable={!busy}
        />
        <View style={styles.row}>
          <View style={styles.rowCell}>
            <Field
              label="City"
              value={draft.city}
              onChangeText={field('city')}
              error={errorFor('city')}
              placeholder="Karachi"
              editable={!busy}
            />
          </View>
          <View style={styles.rowCell}>
            <Field
              label="Postal code"
              value={draft.postalCode}
              onChangeText={field('postalCode')}
              error={errorFor('postalCode')}
              placeholder="75500"
              optional
              keyboardType="number-pad"
              editable={!busy}
            />
          </View>
        </View>
        <Field
          label="Order notes"
          value={draft.notes}
          onChangeText={field('notes')}
          error={errorFor('notes')}
          placeholder="Landmark, delivery timing, anything else"
          optional
          multiline
          numberOfLines={3}
          style={styles.multiline}
          editable={!busy}
        />

        <Divider style={styles.rule} />

        <Text style={typography.eyebrow}>Payment</Text>
        <View style={styles.methods}>
          <Chip
            label="Cash on delivery"
            selected={method === 'COD' || !cardEnabled}
            onPress={() => setMethod('COD')}
          />
          {cardEnabled ? (
            <Chip label="Card" selected={method === 'CARD'} onPress={() => setMethod('CARD')} />
          ) : null}
        </View>
        <Text style={typography.small}>
          {cardEnabled && method === 'CARD'
            ? 'You will be taken to a secure Stripe page to pay.'
            : 'Pay the rider in cash when your parcel arrives.'}
        </Text>

        <Divider style={styles.rule} />

        <Text style={typography.eyebrow}>Order summary</Text>
        {quote.error ? <InlineError error={quote.error} onRetry={() => quote.refetch()} /> : null}
        {totals ? (
          <View>
            {totals.lines.map((line) => (
              <SummaryRow
                key={`${line.slug}-${line.color ?? ''}-${line.size ?? ''}`}
                label={`${line.name} × ${line.qty}`}
                value={money(line.lineTotal)}
              />
            ))}
            <Divider style={styles.rule} />
            <SummaryRow label="Subtotal" value={money(totals.subtotal)} />
            <SummaryRow
              label="Delivery"
              value={totals.shipping ? money(totals.shipping) : 'Free'}
            />
            {totals.discount ? (
              <SummaryRow label="Discount" value={`− ${money(totals.discount)}`} />
            ) : null}
            <Divider style={styles.rule} />
            <SummaryRow label="Total" value={money(totals.total)} strong />
          </View>
        ) : (
          <LoadingState label="Confirming prices…" />
        )}

        {generalError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {generalError instanceof Error
                ? generalError.message
                : 'Your order could not be placed. Please try again.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.sm }]}>
        <Button
          label={
            payingByCard
              ? 'Waiting for payment…'
              : totals
                ? `Place order · ${money(totals.total)}`
                : 'Place order'
          }
          size="lg"
          busy={busy}
          disabled={!totals}
          onPress={submit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Catches the obvious gaps before a round trip. The API's Zod schemas remain
 * the authority — anything this misses comes back as a per-field error.
 */
function validate(draft: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};

  if (draft.customerName.trim().length < 2) errors.customerName = 'Please enter your full name.';

  // Mirrors the API's tolerance for spacing, dashes and a +92 / 0 prefix.
  const phone = draft.phone.replace(/[\s\-()]/g, '');
  if (!/^(\+92|0092|0)?3?\d{9,10}$/.test(phone)) {
    errors.phone = 'Enter a valid Pakistani phone number.';
  }

  if (draft.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (draft.address.trim().length < 8) {
    errors.address = 'Please enter a complete street address.';
  }
  if (draft.city.trim().length < 2) errors.city = 'City is required.';

  return errors;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.md, gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  rowCell: { flex: 1 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  rule: { marginVertical: space.sm },
  methods: { flexDirection: 'row', gap: space.sm },
  errorBox: { backgroundColor: colors.cream2, padding: space.md },
  errorText: { ...typography.body, color: colors.sale },
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
