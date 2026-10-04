/* ==========================================================================
   Home — the storefront's front page.

   Reads the same three things the website's homepage does: the categories
   flagged `showOnHome`, the featured products, and the newest arrivals.
   ========================================================================== */

import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories, useProducts } from '@/api/hooks';
import { ErrorState, InlineError, Skeleton } from '@/components/states';
import { ProductCard } from '@/components/product-card';
import { SectionHeading } from '@/components/pieces';
import { useFilters } from '@/store/filters';
import { colors, space, type as typography } from '@/theme';

import { CategoryStrip } from './category-strip';
import { HomeHero } from './hero';
import { NewsletterCard } from './newsletter-card';

export function Home() {
  const router = useRouter();
  const { adopt } = useFilters();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const categories = useCategories(true);
  const featured = useProducts({ featured: true, sort: 'featured' }, 1, 6);
  const arrivals = useProducts({ sort: 'new' }, 1, 4);

  /** Opening the shop from here always starts from a clean filter set. */
  const openShop = useCallback(
    (query: Parameters<typeof adopt>[0] = {}) => {
      adopt(query);
      router.push('/shop');
    },
    [adopt, router]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([categories.refetch(), featured.refetch(), arrivals.refetch()]);
    setRefreshing(false);
  }, [categories, featured, arrivals]);

  // Nothing at all resolved yet and the first load failed: there is no page to
  // show, so give the whole screen over to the error.
  const nothingLoaded = !categories.data && !featured.data && !arrivals.data;
  if (nothingLoaded && (categories.error || featured.error)) {
    return <ErrorState error={categories.error ?? featured.error} onRetry={onRefresh} />;
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />
      }
      showsVerticalScrollIndicator={false}
    >
      <HomeHero onShopPress={() => openShop()} />

      <View style={styles.section}>
        <SectionHeading
          eyebrow="Shop by"
          title="Categories"
          action={{ label: 'All products', onPress: () => openShop() }}
        />
        {categories.data ? (
          <CategoryStrip
            categories={categories.data}
            onSelect={(category) => openShop({ cat: category.slug })}
          />
        ) : categories.error ? (
          <InlineError error={categories.error} onRetry={() => categories.refetch()} />
        ) : (
          <View style={styles.stripSkeleton}>
            <Skeleton height={150} width={120} />
            <Skeleton height={150} width={120} />
            <Skeleton height={150} width={120} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeading
          eyebrow="Handpicked"
          title="Featured"
          action={{ label: 'See all', onPress: () => openShop() }}
        />
        {featured.data ? (
          featured.data.products.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {featured.data.products.map((product) => (
                <ProductCard key={product.slug} product={product} width={176} />
              ))}
            </ScrollView>
          ) : (
            <Text style={typography.bodyMuted}>
              Nothing is featured yet. Browse the full collection instead.
            </Text>
          )
        ) : featured.error ? (
          <InlineError error={featured.error} onRetry={() => featured.refetch()} />
        ) : (
          <View style={styles.stripSkeleton}>
            <Skeleton height={280} width={176} />
            <Skeleton height={280} width={176} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeading
          eyebrow="Just in"
          title="New arrivals"
          action={{ label: 'See all', onPress: () => openShop({ sort: 'new' }) }}
        />
        {arrivals.data ? (
          <View style={styles.grid}>
            {arrivals.data.products.map((product) => (
              <View key={product.slug} style={styles.gridItem}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        ) : arrivals.error ? (
          <InlineError error={arrivals.error} onRetry={() => arrivals.refetch()} />
        ) : (
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Skeleton height={280} />
            </View>
            <View style={styles.gridItem}>
              <Skeleton height={280} />
            </View>
          </View>
        )}
      </View>

      <NewsletterCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.paper },
  section: { paddingHorizontal: space.md, paddingTop: space.xl },
  carousel: { gap: space.md, paddingRight: space.md },
  stripSkeleton: { flexDirection: 'row', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  gridItem: { flexGrow: 1, flexBasis: '45%' },
});
