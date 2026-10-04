/* ==========================================================================
   Filter sheet.

   Edits a local draft and applies it on dismiss-by-button, so half-set filters
   never re-query the catalogue. Fabric and collection options come from the
   API's own facets, which means they can only ever offer values that exist.
   ========================================================================== */

import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCategories, useFacets } from '@/api/hooks';
import type { ProductQuery, SortKey } from '@/api/types';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Chip, Divider } from '@/components/pieces';
import { BADGE_LABELS, SORT_LABELS, useFilters } from '@/store/filters';
import { colors, space, type as typography } from '@/theme';

export function FilterSheet() {
  const router = useRouter();
  const { query, adopt, reset } = useFilters();
  const categories = useCategories();
  const facets = useFacets();

  const [draft, setDraft] = useState<ProductQuery>(query);
  const [minText, setMinText] = useState(draft.min?.toString() ?? '');
  const [maxText, setMaxText] = useState(draft.max?.toString() ?? '');

  /** Tapping the selected value again clears it. */
  const toggle = <K extends keyof ProductQuery>(key: K, value: ProductQuery[K]) =>
    setDraft((current) => ({ ...current, [key]: current[key] === value ? undefined : value }));

  const apply = () => {
    adopt({
      ...draft,
      min: parsePrice(minText),
      max: parsePrice(maxText),
      // The search term belongs to the search bar, not this sheet.
      q: query.q,
    });
    router.back();
  };

  const clear = () => {
    reset();
    router.back();
  };

  return (
    <View style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={typography.title}>Filter &amp; sort</Text>

        <Group title="Sort by" count={Object.keys(SORT_LABELS).length}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <Chip
              key={key}
              label={SORT_LABELS[key]}
              selected={draft.sort === key}
              onPress={() => setDraft((current) => ({ ...current, sort: key }))}
            />
          ))}
        </Group>

        <Group
          title="Category"
          count={categories.data?.length ?? 0}
          hint={categories.error ? 'Could not load categories.' : undefined}
        >
          {(categories.data ?? []).map((category) => (
            <Chip
              key={category.slug}
              label={category.name}
              selected={draft.cat === category.slug}
              onPress={() => toggle('cat', category.slug)}
            />
          ))}
        </Group>

        <Group
          title="Fabric"
          count={facets.data?.fabrics.length ?? 0}
          hint={facets.error ? 'Could not load fabrics.' : undefined}
        >
          {(facets.data?.fabrics ?? []).map((fabric) => (
            <Chip
              key={fabric}
              label={fabric}
              selected={draft.fabric === fabric}
              onPress={() => toggle('fabric', fabric)}
            />
          ))}
        </Group>

        <Group
          title="Collection"
          count={facets.data?.collections.length ?? 0}
          hint={facets.error ? 'Could not load collections.' : undefined}
        >
          {(facets.data?.collections ?? []).map((collection) => (
            <Chip
              key={collection}
              label={collection}
              selected={draft.collection === collection}
              onPress={() => toggle('collection', collection)}
            />
          ))}
        </Group>

        <Group title="Show only" count={Object.keys(BADGE_LABELS).length}>
          {(Object.keys(BADGE_LABELS) as NonNullable<ProductQuery['badge']>[]).map((badge) => (
            <Chip
              key={badge}
              label={BADGE_LABELS[badge]}
              selected={draft.badge === badge}
              onPress={() => toggle('badge', badge)}
            />
          ))}
        </Group>

        <View style={styles.group}>
          <Text style={typography.eyebrow}>Price (PKR)</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceCell}>
              <Field
                label="From"
                value={minText}
                onChangeText={setMinText}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.priceCell}>
              <Field
                label="To"
                value={maxText}
                onChangeText={setMaxText}
                placeholder="Any"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <Divider />
      <View style={styles.actions}>
        <Button label="Clear all" variant="quiet" onPress={clear} style={styles.action} />
        <Button label="Show results" onPress={apply} style={styles.action} />
      </View>
    </View>
  );
}

/**
 * A labelled row of chips. The option count is passed explicitly rather than
 * inferred from `children`, because a mapped-but-empty array is still one child.
 */
function Group({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={typography.eyebrow}>{title}</Text>
      {count === 0 ? (
        <Text style={typography.small}>{hint ?? 'Loading…'}</Text>
      ) : (
        <View style={styles.chips}>{children}</View>
      )}
    </View>
  );
}

/** Blank or nonsense input means "no bound", not zero. */
function parsePrice(text: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return undefined;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : undefined;
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space.md, paddingBottom: space.lg, gap: space.lg },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  priceRow: { flexDirection: 'row', gap: space.md },
  priceCell: { flex: 1 },
  actions: { flexDirection: 'row', gap: space.md, padding: space.md },
  action: { flex: 1 },
});
