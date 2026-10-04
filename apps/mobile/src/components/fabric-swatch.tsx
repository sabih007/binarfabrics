/* ==========================================================================
   Product artwork.

   Shows the photograph when the product has one. When it doesn't, it draws a
   fabric print from the `pattern` + `colors` hints stored on the row — the same
   fallback the website renders in `components/Swatch.tsx`, so a catalogue entry
   with no photo still looks like cloth rather than a grey box.
   ========================================================================== */

import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Pattern } from '@/api/types';
import { colors as brand, radius } from '@/theme';

interface FabricSwatchProps {
  pattern: Pattern;
  colors: string[];
  image?: string;
  /** Rounds the corners. Pass `false` inside an already-clipped container. */
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Motif grid density, chosen per pattern so the print reads at card size. */
const GRID: Record<Pattern, { rows: number; cols: number }> = {
  floral: { rows: 5, cols: 3 },
  paisley: { rows: 5, cols: 3 },
  geo: { rows: 7, cols: 4 },
  dots: { rows: 8, cols: 5 },
  stripe: { rows: 1, cols: 1 },
  check: { rows: 1, cols: 1 },
  plain: { rows: 1, cols: 1 },
};

export function FabricSwatch({ pattern, colors, image, rounded = true, style }: FabricSwatchProps) {
  const base = colors[0] ?? brand.swatchFallback;
  const motif = colors[1] ?? brand.paper;
  const accent = colors[2] ?? motif;
  const shell = [styles.shell, rounded && styles.rounded, style];

  if (image) {
    return (
      <View style={shell}>
        <Image
          source={{ uri: image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
        />
      </View>
    );
  }

  return (
    <View style={[shell, { backgroundColor: base }]}>
      {pattern === 'stripe' ? <Stripes motif={motif} accent={accent} /> : null}
      {pattern === 'check' ? <Check motif={motif} /> : null}
      {pattern !== 'stripe' && pattern !== 'check' && pattern !== 'plain' ? (
        <Motifs pattern={pattern} motif={motif} accent={accent} />
      ) : null}
      {/* A faint sheen keeps a flat colour from looking like a placeholder. */}
      <View style={styles.sheen} pointerEvents="none" />
    </View>
  );
}

function Stripes({ motif, accent }: { motif: string; accent: string }) {
  return (
    <View style={styles.row} pointerEvents="none">
      {Array.from({ length: 9 }, (_, i) => (
        <View
          key={i}
          style={{
            flex: i % 2 === 0 ? 2 : 1,
            backgroundColor: i % 2 === 0 ? 'transparent' : i % 4 === 1 ? motif : accent,
            opacity: 0.55,
          }}
        />
      ))}
    </View>
  );
}

function Check({ motif }: { motif: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.row}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={{ flex: 1, borderRightWidth: 1.5, borderColor: motif, opacity: 0.4 }} />
        ))}
      </View>
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 9 }, (_, i) => (
          <View key={i} style={{ flex: 1, borderBottomWidth: 1.5, borderColor: motif, opacity: 0.4 }} />
        ))}
      </View>
    </View>
  );
}

/**
 * Lays motifs out on a grid, offsetting alternate rows so the print repeats
 * like a block-printed fabric instead of a spreadsheet.
 */
function Motifs({ pattern, motif, accent }: { pattern: Pattern; motif: string; accent: string }) {
  const { rows, cols } = GRID[pattern];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: rows }, (_, row) => (
        // Flowed, not absolute: the rows have to stack to divide the height.
        <View key={row} style={[styles.motifRow, { paddingLeft: row % 2 ? '10%' : 0 }]}>
          {Array.from({ length: cols }, (_, col) => (
            <View key={col} style={styles.cell}>
              <Motif
                pattern={pattern}
                color={(row + col) % 3 === 0 ? accent : motif}
                flipped={(row + col) % 2 === 0}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Motif({
  pattern,
  color,
  flipped,
}: {
  pattern: Pattern;
  color: string;
  flipped: boolean;
}) {
  if (pattern === 'dots') {
    return <View style={[styles.dot, { backgroundColor: color }]} />;
  }

  if (pattern === 'geo') {
    return (
      <View
        style={[
          styles.geo,
          { backgroundColor: color, transform: [{ rotate: flipped ? '45deg' : '0deg' }] },
        ]}
      />
    );
  }

  if (pattern === 'paisley') {
    // A teardrop: one sharp corner, the rest round, mirrored row to row.
    return (
      <View
        style={[
          styles.paisley,
          { borderColor: color, transform: [{ rotate: flipped ? '30deg' : '-150deg' }] },
        ]}
      />
    );
  }

  // floral — four petals around a centre.
  return (
    <View style={styles.floral}>
      {[0, 90, 180, 270].map((angle) => (
        <View
          key={angle}
          style={[styles.petal, { backgroundColor: color, transform: [{ rotate: `${angle}deg` }] }]}
        />
      ))}
      <View style={[styles.pistil, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: brand.cream2,
  },
  rounded: { borderRadius: radius.sm },
  row: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  motifRow: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: brand.paper,
    opacity: 0.06,
  },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  geo: { width: 14, height: 14, opacity: 0.45 },
  paisley: {
    width: 18,
    height: 18,
    borderWidth: 2,
    opacity: 0.5,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  floral: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  petal: {
    position: 'absolute',
    width: 7,
    height: 14,
    borderRadius: 7,
    opacity: 0.5,
  },
  pistil: { width: 5, height: 5, borderRadius: 3, opacity: 0.85 },
});
