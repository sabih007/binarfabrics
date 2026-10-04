/* ==========================================================================
   Catalogue tile. Mirrors the website's product card: artwork with a badge,
   category + fabric line, name, price, colour dots, and a quick add to bag.
   ========================================================================== */

import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Product } from '@/api/types';
import { FabricSwatch } from '@/components/fabric-swatch';
import { ColorDots, Price, ProductBadge } from '@/components/pieces';
import { useCart } from '@/store/cart';
import { colors, radius, space, type as typography } from '@/theme';

export function ProductCard({ product, width }: { product: Product; width?: number }) {
  const { add } = useCart();

  const addToBag = () => {
    add(product);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  return (
    <View style={[styles.card, width ? { width } : null]}>
      <Link href={`/product/${product.slug}`} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={product.name}
          style={({ pressed }) => [styles.media, pressed && styles.pressed]}
        >
          <FabricSwatch
            pattern={product.pattern}
            colors={product.colors}
            image={product.image}
            rounded={false}
          />
          <View style={styles.badge}>
            <ProductBadge product={product} />
          </View>
        </Pressable>
      </Link>

      <View style={styles.body}>
        <Text style={styles.meta} numberOfLines={1}>
          {[product.categoryName, product.fabric].filter(Boolean).join(' · ')}
        </Text>
        <Link href={`/product/${product.slug}`} asChild>
          <Pressable accessibilityRole="link">
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
          </Pressable>
        </Link>
        <Price price={product.price} oldPrice={product.oldPrice} />
        <ColorDots values={product.colors} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={product.inStock ? `Add ${product.name} to bag` : 'Sold out'}
        accessibilityState={{ disabled: !product.inStock }}
        disabled={!product.inStock}
        onPress={addToBag}
        style={({ pressed }) => [
          styles.add,
          pressed && styles.pressed,
          !product.inStock && styles.addDisabled,
        ]}
      >
        <Text style={styles.addText}>{product.inStock ? 'Add to bag' : 'Sold out'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  media: {
    aspectRatio: 3 / 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.cream2,
  },
  badge: { position: 'absolute', top: space.sm, left: space.sm },
  pressed: { opacity: 0.85 },
  body: { gap: space.xs },
  meta: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1 },
  name: { ...typography.heading, fontSize: 15, lineHeight: 20 },
  add: {
    marginTop: 2,
    paddingVertical: space.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
    alignItems: 'center',
  },
  addDisabled: { opacity: 0.45 },
  addText: {
    ...typography.small,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink,
  },
});
