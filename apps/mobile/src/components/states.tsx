/* ==========================================================================
   The three screen states that aren't content.

   `ErrorState` prints the message the API sent — those are already written for
   customers ("Only 2 left of …", "No order matches that number and phone") —
   and offers a retry only when retrying could plausibly help.
   ========================================================================== */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button';
import { colors, radius, space, type as typography } from '@/theme';

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.green} />
      {label ? <Text style={[typography.small, styles.centeredText]}>{label}</Text> : null}
    </View>
  );
}

/** A grey block standing in for a card while the first page loads. */
export function Skeleton({ height, width }: { height: number; width?: number | `${number}%` }) {
  return <View style={[styles.skeleton, { height, width: width ?? '100%' }]} />;
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { message, retryable } = describe(error);

  return (
    <View style={styles.centered}>
      <Text style={[typography.heading, styles.centeredText]}>Something went wrong</Text>
      <Text style={[typography.bodyMuted, styles.centeredText]}>{message}</Text>
      {onRetry && retryable ? (
        <Button label="Try again" variant="outline" onPress={onRetry} style={styles.action} />
      ) : null}
    </View>
  );
}

/** Non-blocking: a failed refresh over content that is still worth showing. */
export function InlineError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { message } = describe(error);

  return (
    <View style={styles.inline}>
      <Text style={styles.inlineText}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
          <Text style={styles.inlineAction}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.centered}>
      <Text style={[typography.heading, styles.centeredText]}>{title}</Text>
      {body ? <Text style={[typography.bodyMuted, styles.centeredText]}>{body}</Text> : null}
      {action ? (
        <Button label={action.label} onPress={action.onPress} style={styles.action} />
      ) : null}
    </View>
  );
}

function describe(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof ApiError) return { message: error.message, retryable: error.isRetryable };
  if (error instanceof Error && error.message) return { message: error.message, retryable: true };
  return { message: 'Please try again in a moment.', retryable: true };
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: space.sm,
  },
  centeredText: { textAlign: 'center' },
  action: { marginTop: space.sm, minWidth: 180 },
  skeleton: { backgroundColor: colors.cream2, borderRadius: radius.sm },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    backgroundColor: colors.cream2,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  inlineText: { ...typography.small, flex: 1, color: colors.ink2 },
  inlineAction: { ...typography.small, color: colors.green, fontWeight: '700' },
});
