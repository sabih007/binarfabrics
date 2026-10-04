import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState } from '@/components/states';
import { OrderScreen } from '@/screens/order';

export default function OrderRoute() {
  const router = useRouter();
  const { number, phone, placed } = useLocalSearchParams<{
    number: string;
    phone?: string;
    placed?: string;
  }>();

  // The phone number is the order's shared secret, so without it there is
  // nothing to look up — send the customer to the tracking form instead.
  if (!number || !phone) {
    return (
      <EmptyState
        title="We need a little more to find that order"
        body="Enter the order number together with the phone number you ordered with."
        action={{ label: 'Track an order', onPress: () => router.replace('/track') }}
      />
    );
  }

  return <OrderScreen number={number} phone={phone} justPlaced={placed === '1'} />;
}
