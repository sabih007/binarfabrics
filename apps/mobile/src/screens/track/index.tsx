/* ==========================================================================
   Track an order.

   Order number plus the phone number on the order — the same pair the website's
   tracking page asks for, because that phone number is what stands in for a
   login. A wrong pair returns the API's deliberately vague 404, which is shown
   as-is rather than hinting at which half was wrong.

   The last successful lookup is remembered on the device so a customer coming
   back to check progress doesn't retype it. Only the number and phone are kept.
   ========================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError } from '@/api/client';
import { useOrderLookup } from '@/api/hooks';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { colors, space, type as typography } from '@/theme';

const RECENT_KEY = 'binar.lastOrder.v1';

interface Recent {
  number: string;
  phone: string;
}

export function TrackOrder() {
  const router = useRouter();
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [recent, setRecent] = useState<Recent | null>(null);
  const lookup = useOrderLookup();

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Recent;
        if (parsed?.number && parsed?.phone) setRecent(parsed);
      })
      .catch(() => {
        // Nothing remembered, or unreadable — the form simply starts blank.
      });
  }, []);

  const openOrder = (found: Recent) =>
    router.push({
      pathname: '/order/[number]',
      params: { number: found.number, phone: found.phone },
    });

  const submit = () => {
    if (lookup.isPending) return;
    const entered = { number: number.trim().toUpperCase(), phone: phone.trim() };

    lookup.mutate(entered, {
      onSuccess: (order) => {
        const found = { number: order.number, phone: entered.phone };
        AsyncStorage.setItem(RECENT_KEY, JSON.stringify(found)).catch(() => {});
        setRecent(found);
        openOrder(found);
      },
    });
  };

  const canSubmit = number.trim().length > 2 && phone.trim().length > 3;

  // A 404 here means "that pair doesn't match", which belongs on the phone field
  // — it is the half the customer is most likely to have got wrong.
  const notFound =
    lookup.error instanceof ApiError && lookup.error.status === 404 ? lookup.error.message : null;
  const otherError = lookup.error && !notFound ? lookup.error : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={typography.eyebrow}>Order status</Text>
        <Text style={typography.title}>Track your order</Text>
        <Text style={typography.bodyMuted}>
          Enter the order number from your confirmation, and the phone number you ordered with.
        </Text>

        <View style={styles.form}>
          <Field
            label="Order number"
            value={number}
            onChangeText={setNumber}
            placeholder="BA-10234"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!lookup.isPending}
          />
          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="03xx xxx xxxx"
            keyboardType="phone-pad"
            editable={!lookup.isPending}
            error={notFound ?? undefined}
          />

          {otherError ? (
            <Text style={styles.error}>
              {otherError instanceof Error
                ? otherError.message
                : 'That lookup failed. Please try again.'}
            </Text>
          ) : null}

          <Button
            label="Find my order"
            size="lg"
            busy={lookup.isPending}
            disabled={!canSubmit}
            onPress={submit}
          />
        </View>

        {recent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open order ${recent.number}`}
            onPress={() => openOrder(recent)}
            style={styles.recent}
          >
            <Text style={typography.eyebrow}>Last order</Text>
            <Text style={typography.body}>{recent.number}</Text>
            <Text style={typography.small}>Tap to open again</Text>
          </Pressable>
        ) : null}

        <View style={styles.help}>
          <Text style={typography.eyebrow}>Need a hand?</Text>
          <Text style={typography.bodyMuted}>
            Order numbers look like BA-10234 and are in your confirmation message. If you cannot
            find yours, call the number on the website and we will look it up for you.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.md, gap: space.xs },
  form: { marginTop: space.lg, gap: space.md },
  error: { ...typography.small, color: colors.sale },
  recent: {
    marginTop: space.xl,
    padding: space.md,
    backgroundColor: colors.cream,
    gap: 2,
  },
  help: { marginTop: space.xl, gap: space.xs },
});
