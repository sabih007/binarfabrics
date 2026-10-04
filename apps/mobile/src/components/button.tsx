/* ==========================================================================
   Buttons. Three weights: `solid` for the one action a screen is about,
   `outline` for alternatives, `quiet` for anything dismissive.
   ========================================================================== */

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, space, type as typography } from '@/theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline' | 'quiet';
  size?: 'md' | 'lg';
  disabled?: boolean;
  /** Shows a spinner and blocks presses — use while a mutation is pending. */
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'solid',
  size = 'md',
  disabled = false,
  busy = false,
  style,
}: ButtonProps) {
  const blocked = disabled || busy;
  const tint = variant === 'solid' ? colors.paper : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
        variant === 'solid' && styles.solid,
        variant === 'outline' && styles.outline,
        variant === 'quiet' && styles.quiet,
        pressed && !blocked && styles.pressed,
        blocked && styles.blocked,
        style,
      ]}
    >
      {busy ? (
        <View style={styles.spinner}>
          <ActivityIndicator size="small" color={tint} />
        </View>
      ) : null}
      <Text style={[styles.label, { color: tint }, busy && styles.labelBusy]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  lg: { minHeight: 54 },
  solid: { backgroundColor: colors.green },
  outline: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.ink },
  quiet: { backgroundColor: colors.cream },
  pressed: { opacity: 0.82 },
  blocked: { opacity: 0.45 },
  label: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  labelBusy: { opacity: 0 },
  spinner: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
