/* ==========================================================================
   Horizontal category tiles. Artwork comes from the category row's own
   `pattern` + `colors` hints when it has no image, as on the website.
   ========================================================================== */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/api/types';
import { FabricSwatch } from '@/components/fabric-swatch';
import { colors, radius, space, type as typography } from '@/theme';

export function CategoryStrip({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (category: Category) => void;
}) {
  if (!categories.length) {
    return <Text style={typography.bodyMuted}>No categories are published yet.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {categories.map((category) => (
        <Pressable
          key={category.slug}
          accessibilityRole="button"
          accessibilityLabel={`Shop ${category.name}`}
          onPress={() => onSelect(category)}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.media}>
            <FabricSwatch
              pattern={category.pattern}
              colors={category.colors}
              image={category.image}
              rounded={false}
            />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {category.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {category.sub ||
              (category.productCount !== undefined
                ? `${category.productCount} design${category.productCount === 1 ? '' : 's'}`
                : '')}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { gap: space.md, paddingRight: space.md },
  tile: { width: 130, gap: space.xs },
  pressed: { opacity: 0.85 },
  media: {
    height: 150,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.cream2,
  },
  name: { ...typography.heading, fontSize: 15 },
  sub: { ...typography.small, color: colors.ink3 },
});
