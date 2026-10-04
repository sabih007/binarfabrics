/* ==========================================================================
   Labelled text input.

   `error` takes the per-field message the API returns in `error.fields`, so a
   server-side validation failure lands on the field that caused it instead of
   in a generic banner.
   ========================================================================== */

import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, space, type as typography } from '@/theme';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, optional, style, ...inputProps },
  ref
) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}>  Optional</Text> : null}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.ink3}
        accessibilityLabel={label}
        style={[styles.input, !!error && styles.inputError, style]}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={typography.small}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: { ...typography.eyebrow, color: colors.ink2 },
  optional: { ...typography.eyebrow, color: colors.ink3, letterSpacing: 0.8 },
  input: {
    ...typography.body,
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.paper,
  },
  inputError: { borderColor: colors.sale, borderWidth: 1 },
  error: { ...typography.small, color: colors.sale },
});
