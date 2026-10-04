/* ==========================================================================
   Newsletter sign-up. Writes to the same `Subscriber` table as the website's
   footer form, tagged `source: "app"` so the two can be told apart.
   ========================================================================== */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSubscribe } from '@/api/hooks';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { colors, space, type as typography } from '@/theme';

export function NewsletterCard() {
  const [email, setEmail] = useState('');
  const subscribe = useSubscribe();

  const submit = () => {
    if (subscribe.isPending || !email.trim()) return;
    subscribe.mutate(email.trim(), { onSuccess: () => setEmail('') });
  };

  const fieldError =
    subscribe.error instanceof ApiError
      ? subscribe.error.fields?.email ?? subscribe.error.message
      : subscribe.error
        ? 'Could not sign you up. Please try again.'
        : undefined;

  return (
    <View style={styles.card}>
      <Text style={typography.eyebrow}>Stay in the loop</Text>
      <Text style={styles.title}>New prints, first look</Text>
      <Text style={typography.bodyMuted}>
        Drops, restocks and sale previews — a note every few weeks, nothing more.
      </Text>

      {subscribe.isSuccess ? (
        <Text style={styles.done}>You&apos;re on the list. Thank you.</Text>
      ) : (
        <View style={styles.form}>
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            error={fieldError}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={submit}
            editable={!subscribe.isPending}
          />
          <Button label="Sign up" onPress={submit} busy={subscribe.isPending} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: space.md,
    marginTop: space.xl,
    padding: space.lg,
    backgroundColor: colors.cream,
    gap: space.xs,
  },
  title: typography.title,
  form: { marginTop: space.md, gap: space.md },
  done: { ...typography.body, marginTop: space.md, color: colors.green, fontWeight: '600' },
});
