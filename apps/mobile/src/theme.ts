/* ==========================================================================
   BinAr Fabrics — design tokens.

   Mirrors the brand palette in the website's `app/globals.css`. The store is
   deliberately a single light, editorial theme on every platform: a fabric
   catalogue sells on colour fidelity, and a dark variant would misrepresent
   the cloth. Keep these values in step with the stylesheet.
   ========================================================================== */

import { Platform } from 'react-native';

export const colors = {
  ink: '#171614',
  ink2: '#4a4744',
  ink3: '#8a8580',
  line: '#e8e3dc',
  paper: '#ffffff',
  cream: '#f7f3ec',
  cream2: '#efe8dd',
  green: '#0f4c3a',
  green2: '#0b3a2c',
  gold: '#c9a24a',
  gold2: '#a9853a',
  sale: '#b8322d',
  /** Tint for the generated swatch when a product has no colours at all. */
  swatchFallback: '#d9cfc0',
} as const;

/** 4pt scale. `space.md` is the default gutter between stacked blocks. */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  pill: 999,
} as const;

/** The site pairs a serif display face with a sans body; match that pairing. */
export const fonts = Platform.select({
  ios: { serif: 'Georgia', sans: 'system-ui' },
  android: { serif: 'serif', sans: 'sans-serif' },
  default: { serif: 'Georgia, serif', sans: 'system-ui, sans-serif' },
})!;

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34, color: colors.ink },
  title: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 27, color: colors.ink },
  heading: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink },
  bodyMuted: { fontSize: 15, lineHeight: 23, color: colors.ink2 },
  small: { fontSize: 13, lineHeight: 19, color: colors.ink2 },
  /** Letter-spaced uppercase eyebrow, used above section headings. */
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: colors.ink3,
  },
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#171614',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  default: { elevation: 2 },
})!;

/** Free delivery threshold and flat fee — must match `lib/products.ts`. */
export const FREE_SHIPPING_AT = 3000;
export const SHIPPING_FEE = 250;

/**
 * Rupee formatter. Grouping is done by hand rather than through `Intl` so the
 * output is identical on every engine and locale the app runs on.
 */
export function money(rupees: number): string {
  const whole = Math.round(rupees).toString();
  return 'PKR ' + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
