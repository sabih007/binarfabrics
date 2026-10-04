/* ==========================================================================
   Product detail.

   Re-fetched on every visit rather than served from cache: stock, and the
   "few left" badge derived from it, are the two things a shopper must not see
   stale. Colour and size options come from the row, and the add-to-bag button
   sends the chosen variant — the same pairs the API validates at checkout.
   ========================================================================== */

import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProduct } from '@/api/hooks';
import type { Product } from '@/api/types';
import { Button } from '@/components/button';
import { FabricSwatch } from '@/components/fabric-swatch';
import {
  Badge,
  ColorOption,
  Chip,
  Divider,
  Price,
  ProductBadge,
  QuantityStepper,
  SectionHeading,
} from '@/components/pieces';
import { ProductCard } from '@/components/product-card';
import { ErrorState, LoadingState } from '@/components/states';
import { MAX_PER_LINE, useCart } from '@/store/cart';
import { colors, space, type as typography } from '@/theme';

export function ProductDetail({ slug }: { slug: string }) {
  const { data, error, isLoading, refetch } = useProduct(slug);

  if (isLoading) return <LoadingState label="Loading design…" />;
  if (!data) return <ErrorState error={error} onRetry={() => refetch()} />;

  return <Loaded product={data.product} related={data.related} />;
}

function Loaded({ product, related }: { product: Product; related: Product[] }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { add, count } = useCart();

  const [color, setColor] = useState<string | null>(product.colors[0] ?? null);
  const [size, setSize] = useState<string | null>(product.sizes[0] ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  /** The gallery shows the main photo first, then any extras. */
  const gallery = useMemo(() => {
    const images = [product.image, ...product.images].filter(Boolean) as string[];
    return images.length ? images : [undefined];
  }, [product.image, product.images]);

  const ceiling = Math.min(MAX_PER_LINE, Math.max(1, product.stock || MAX_PER_LINE));

  const addToBag = () => {
    add(product, { qty, color, size });
    setAdded(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  return (
    <>
      <Stack.Title>{product.name}</Stack.Title>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScrollView
          horizontal
          pagingEnabled={gallery.length > 1}
          showsHorizontalScrollIndicator={false}
          style={{ height: width * 1.15 }}
        >
          {gallery.map((image, index) => (
            <View key={`${image ?? 'art'}-${index}`} style={{ width, height: width * 1.15 }}>
              <FabricSwatch
                pattern={product.pattern}
                colors={product.colors}
                image={image}
                rounded={false}
              />
            </View>
          ))}
        </ScrollView>
        {gallery.length > 1 ? (
          <Text style={[typography.small, styles.galleryHint]}>
            Swipe for {gallery.length} views
          </Text>
        ) : null}

        <View style={styles.body}>
          <View style={styles.badges}>
            <ProductBadge product={product} />
            {product.collection ? <Badge text={product.collection} tone="neutral" /> : null}
          </View>

          <Text style={typography.eyebrow}>
            {[product.categoryName, product.fabric].filter(Boolean).join(' · ')}
          </Text>
          <Text style={typography.display}>{product.name}</Text>
          <Price price={product.price} oldPrice={product.oldPrice} size="lg" />

          <View style={styles.factRow}>
            <Fact label="Pieces" value={`${product.pieces}`} />
            <Fact label="Fabric" value={product.fabric} />
            <Fact
              label="Rating"
              value={product.rating ? `${product.rating.toFixed(1)} (${product.reviews})` : '—'}
            />
          </View>

          <Divider />

          <Text style={typography.body}>{product.description}</Text>

          {product.colors.length ? (
            <View style={styles.options}>
              <Text style={typography.eyebrow}>Colour</Text>
              <View style={styles.optionRow}>
                {product.colors.map((value) => (
                  <ColorOption
                    key={value}
                    value={value}
                    selected={color === value}
                    onPress={() => {
                      setColor(value);
                      setAdded(false);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {product.sizes.length ? (
            <View style={styles.options}>
              <Text style={typography.eyebrow}>Size</Text>
              <View style={styles.optionRow}>
                {product.sizes.map((value) => (
                  <Chip
                    key={value}
                    label={value}
                    selected={size === value}
                    onPress={() => {
                      setSize(value);
                      setAdded(false);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.options}>
            <Text style={typography.eyebrow}>Quantity</Text>
            <QuantityStepper value={qty} onChange={setQty} max={ceiling} />
            {/* The API already derives "low" from the product's own threshold. */}
            {product.inStock && product.badge === 'low' ? (
              <Text style={styles.stockWarning}>
                Only {product.stock} left{product.stock === 1 ? '' : ' in stock'}.
              </Text>
            ) : null}
          </View>

          {added ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/bag')}>
              <Text style={styles.addedNote}>
                Added to your bag ({count} {count === 1 ? 'item' : 'items'}) — tap to review.
              </Text>
            </Pressable>
          ) : null}
        </View>

        {related.length ? (
          <View style={styles.related}>
            <SectionHeading eyebrow="You may also like" title="Similar designs" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} width={168} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.sm }]}>
        <View style={styles.barPrice}>
          <Text style={typography.small}>{product.inStock ? 'In stock' : 'Unavailable'}</Text>
          <Price price={product.price * qty} />
        </View>
        <Button
          label={product.inStock ? 'Add to bag' : 'Sold out'}
          size="lg"
          disabled={!product.inStock}
          onPress={addToBag}
          style={styles.barButton}
        />
      </View>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={typography.eyebrow}>{label}</Text>
      <Text style={typography.body} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  galleryHint: { textAlign: 'center', paddingTop: space.sm, color: colors.ink3 },
  body: { padding: space.md, gap: space.md },
  badges: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  factRow: { flexDirection: 'row', gap: space.md },
  fact: { flex: 1, gap: 2 },
  options: { gap: space.sm },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  stockWarning: { ...typography.small, color: colors.sale },
  addedNote: {
    ...typography.small,
    color: colors.green,
    fontWeight: '600',
    backgroundColor: colors.cream,
    padding: space.sm,
    textAlign: 'center',
  },
  related: { paddingHorizontal: space.md, paddingTop: space.lg },
  carousel: { gap: space.md, paddingRight: space.md },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    backgroundColor: colors.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  barPrice: { gap: 1 },
  barButton: { flex: 1 },
});
