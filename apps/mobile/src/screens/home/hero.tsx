/* ==========================================================================
   Home hero. Carries the same promise as the website's masthead.
   ========================================================================== */

import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { colors, space, type as typography } from '@/theme';

const STATS = [
  { value: '150+', label: 'Designs' },
  { value: '7-day', label: 'Easy exchange' },
  { value: 'COD', label: 'Nationwide' },
];

export function HomeHero({ onShopPress }: { onShopPress: () => void }) {
  return (
    <View style={styles.hero}>
      <Text style={typography.eyebrow}>New season · Summer Lawn &apos;26</Text>
      <Text style={styles.headline}>
        Fabrics woven for <Text style={styles.headlineEm}>every day</Text> and every celebration.
      </Text>
      <Text style={styles.lead}>
        Premium unstitched lawn, cotton, linen and chiffon for women, men and kids — delivered to
        your door anywhere in Pakistan.
      </Text>
      <Button label="Shop the collection" size="lg" onPress={onShopPress} style={styles.cta} />
      <View style={styles.stats}>
        {STATS.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.cream,
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  headline: { ...typography.display, fontSize: 32, lineHeight: 39 },
  headlineEm: { fontStyle: 'italic', color: colors.green },
  lead: { ...typography.bodyMuted, marginTop: space.xs },
  cta: { marginTop: space.md, alignSelf: 'flex-start', paddingHorizontal: space.xl },
  stats: {
    flexDirection: 'row',
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cream2,
  },
  stat: { flex: 1, gap: 2 },
  statValue: { ...typography.heading, fontSize: 18 },
  statLabel: { ...typography.eyebrow, fontSize: 10 },
});
