import { useLocalSearchParams } from 'expo-router';

import { ProductDetail } from '@/screens/product';
import { EmptyState } from '@/components/states';

export default function ProductRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  // Reachable through a hand-typed or stale deep link.
  if (!slug) return <EmptyState title="That design could not be found." />;

  return <ProductDetail slug={slug} />;
}
