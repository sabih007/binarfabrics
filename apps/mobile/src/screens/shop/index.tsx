/* ==========================================================================
   Shop — the full catalogue.

   Filters live in `FiltersProvider` so the filter sheet (its own route) and
   this list read the same set. `/shop?cat=women` style links seed it on mount.
   Paging is server-side; the list appends pages as it reaches the end.
   ========================================================================== */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProductFeed } from '@/api/hooks';
import type { ProductQuery } from '@/api/types';
import { Chip, Divider } from '@/components/pieces';
import { ProductCard } from '@/components/product-card';
import { EmptyState, ErrorState, InlineError, Skeleton } from '@/components/states';
import { BADGE_LABELS, SORT_LABELS, useFilters } from '@/store/filters';
import { colors, money, radius, space, type as typography } from '@/theme';

const PER_PAGE = 24;
/** How long to wait after the last keystroke before querying. */
const SEARCH_DEBOUNCE = 350;

const BADGE_PARAMS = new Set(['new', 'sale', 'low']);

export function Shop() {
  const router = useRouter();
  const { query, activeCount, set, adopt, reset } = useFilters();
  const params = useLocalSearchParams<{ cat?: string; badge?: string; collection?: string }>();
  const insets = useSafeAreaInsets();

  // `q` is held locally and pushed into the shared filter set on a debounce, so
  // typing stays responsive and doesn't fire a request per character.
  const [search, setSearch] = useState(query.q ?? '');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => set({ q: text.trim() || undefined }), SEARCH_DEBOUNCE);
    },
    [set]
  );

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    []
  );

  // A deep link such as `/shop?cat=women&badge=new` replaces the whole set.
  const linkKey = `${params.cat ?? ''}|${params.badge ?? ''}|${params.collection ?? ''}`;
  const [seededLink, setSeededLink] = useState(linkKey);

  // Clearing the search box belongs to this component, so it is adjusted during
  // render — the sanctioned way to react to changed input without an effect.
  if (linkKey !== seededLink) {
    setSeededLink(linkKey);
    setSearch('');
  }

  // Replacing the shared filter set, on the other hand, is an update to a store
  // outside this component, so it waits for commit.
  useEffect(() => {
    if (!params.cat && !params.badge && !params.collection) return;
    const badge =
      params.badge && BADGE_PARAMS.has(params.badge)
        ? (params.badge as ProductQuery['badge'])
        : undefined;
    adopt({ cat: params.cat, collection: params.collection, badge });
    // Only a change of link should re-seed, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey]);

  const feed = useProductFeed(query, PER_PAGE);

  const products = useMemo(
    () => feed.data?.pages.flatMap((page) => page.products) ?? [],
    [feed.data]
  );
  const total = feed.data?.pages[0]?.total ?? 0;

  const loadMore = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [feed]);

  const applied = useMemo(() => appliedChips(query, set), [query, set]);

  const header = (
    <View style={styles.header}>
      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search fabrics, prints, collections"
        placeholderTextColor={colors.ink3}
        accessibilityLabel="Search the collection"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={styles.search}
      />

      <View style={styles.toolbar}>
        <Chip
          label={activeCount ? `Filters · ${activeCount}` : 'Filters'}
          selected={activeCount > 0}
          onPress={() => router.push('/filters')}
        />
        <Chip label={SORT_LABELS[query.sort]} onPress={() => router.push('/filters')} />
        <View style={styles.spacer} />
        {feed.data ? (
          <Text style={typography.small}>
            {total} {total === 1 ? 'design' : 'designs'}
          </Text>
        ) : null}
      </View>

      {applied.length ? (
        <View style={styles.applied}>
          {applied.map((chip) => (
            <Chip key={chip.key} label={`${chip.label}  ✕`} selected onPress={chip.clear} />
          ))}
          <Chip label="Clear all" onPress={reset} />
        </View>
      ) : null}

      {/* A failed refresh keeps the cached grid visible underneath. */}
      {feed.error && products.length ? (
        <InlineError error={feed.error} onRetry={() => feed.refetch()} />
      ) : null}
      <Divider style={styles.rule} />
    </View>
  );

  if (!feed.data && feed.error) {
    return <ErrorState error={feed.error} onRetry={() => feed.refetch()} />;
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(product) => product.slug}
      numColumns={2}
      columnWrapperStyle={styles.column}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xxl }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <ProductCard product={item} />
        </View>
      )}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      refreshing={feed.isRefetching && !feed.isFetchingNextPage}
      onRefresh={() => feed.refetch()}
      ListEmptyComponent={
        feed.isLoading ? (
          <SkeletonGrid />
        ) : (
          <EmptyState
            title="Nothing matches those filters"
            body="Try widening the price range or clearing a filter."
            action={activeCount ? { label: 'Clear filters', onPress: reset } : undefined}
          />
        )
      }
      ListFooterComponent={
        feed.isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} color={colors.green} />
        ) : products.length && !feed.hasNextPage ? (
          <Text style={[typography.small, styles.end]}>That&apos;s the whole collection.</Text>
        ) : null
      }
    />
  );
}

function SkeletonGrid() {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={styles.skeletonCell}>
          <Skeleton height={230} />
          <Skeleton height={14} width="70%" />
          <Skeleton height={14} width="40%" />
        </View>
      ))}
    </View>
  );
}

/** One removable chip per narrowing filter in force. */
function appliedChips(
  query: ProductQuery,
  set: (patch: Partial<ProductQuery>) => void
): { key: string; label: string; clear: () => void }[] {
  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (query.cat) {
    chips.push({ key: 'cat', label: titleCase(query.cat), clear: () => set({ cat: undefined }) });
  }
  if (query.fabric) {
    chips.push({ key: 'fabric', label: query.fabric, clear: () => set({ fabric: undefined }) });
  }
  if (query.collection) {
    chips.push({
      key: 'collection',
      label: query.collection,
      clear: () => set({ collection: undefined }),
    });
  }
  if (query.badge) {
    chips.push({
      key: 'badge',
      label: BADGE_LABELS[query.badge],
      clear: () => set({ badge: undefined }),
    });
  }
  if (query.min !== undefined || query.max !== undefined) {
    const label =
      query.min !== undefined && query.max !== undefined
        ? `${money(query.min)} – ${money(query.max)}`
        : query.min !== undefined
          ? `From ${money(query.min)}`
          : `Up to ${money(query.max!)}`;
    chips.push({
      key: 'price',
      label,
      clear: () => set({ min: undefined, max: undefined }),
    });
  }
  if (query.q) {
    chips.push({ key: 'q', label: `“${query.q}”`, clear: () => set({ q: undefined }) });
  }

  return chips;
}

/** Turns a category slug back into a label, as `catName` does on the web. */
const titleCase = (slug: string) =>
  slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const styles = StyleSheet.create({
  list: { backgroundColor: colors.paper },
  header: { paddingTop: space.sm, gap: space.sm },
  search: {
    ...typography.body,
    marginHorizontal: space.md,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  spacer: { flex: 1 },
  applied: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.md },
  rule: { marginTop: space.sm },
  column: { gap: space.md, paddingHorizontal: space.md },
  cell: { flex: 1, marginTop: space.md },
  footer: { paddingVertical: space.lg },
  end: { textAlign: 'center', paddingVertical: space.lg, color: colors.ink3 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, padding: space.md },
  skeletonCell: { flexGrow: 1, flexBasis: '45%', gap: space.sm },
});
